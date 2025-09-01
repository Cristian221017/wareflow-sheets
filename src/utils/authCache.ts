// Cache de autenticação otimizado para reduzir calls desnecessárias
import { supabase } from "@/integrations/supabase/client";
import { log, warn, error } from './logger';

interface CachedUser {
  id: string;
  email: string;
  expiry: number;
}

class AuthCache {
  private userCache: CachedUser | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly SHORT_CACHE_TTL = 30 * 1000; // 30 segundos para retry
  
  async getCurrentUserId(): Promise<string> {
    // Verificar cache válido
    if (this.userCache && Date.now() < this.userCache.expiry) {
      log('🔄 Using cached user ID:', this.userCache.id);
      return this.userCache.id;
    }

    try {
      // Buscar dados frescos com timeout
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      );

      const { data, error: authError } = await Promise.race([userPromise, timeoutPromise]);
      
      if (authError || !data.user?.id) {
        warn('❌ Auth error or no user:', authError?.message);
        throw new Error('Usuário não autenticado');
      }

      // Atualizar cache com TTL normal
      this.userCache = {
        id: data.user.id,
        email: data.user.email || '',
        expiry: Date.now() + this.CACHE_TTL
      };

      log('✅ Fresh user data cached:', { id: data.user.id, email: data.user.email });
      return data.user.id;

    } catch (err) {
      error('❌ Error getting current user:', err);
      
      // Se havia cache expirado, usar por mais 30s como fallback
      if (this.userCache) {
        warn('⚠️ Using expired cache as fallback');
        this.userCache.expiry = Date.now() + this.SHORT_CACHE_TTL;
        return this.userCache.id;
      }
      
      throw new Error('Usuário não autenticado e sem cache disponível');
    }
  }

  async getCurrentUser(): Promise<{ id: string; email: string }> {
    // Verificar cache completo
    if (this.userCache && Date.now() < this.userCache.expiry) {
      return {
        id: this.userCache.id,
        email: this.userCache.email
      };
    }

    // Forçar refresh do cache
    const userId = await this.getCurrentUserId();
    return {
      id: userId,
      email: this.userCache?.email || ''
    };
  }

  clearCache() {
    log('🗑️ Clearing auth cache');
    this.userCache = null;
  }

  // Force refresh - útil após login/logout
  async forceRefresh(): Promise<string> {
    this.clearCache();
    return this.getCurrentUserId();
  }

  // Verificar se cache está válido
  isCacheValid(): boolean {
    return !!(this.userCache && Date.now() < this.userCache.expiry);
  }

  // Get cache info for debugging
  getCacheInfo() {
    if (!this.userCache) return null;
    
    return {
      userId: this.userCache.id,
      email: this.userCache.email,
      expiresIn: Math.max(0, this.userCache.expiry - Date.now()),
      isValid: this.isCacheValid()
    };
  }
}

// Singleton instance
export const authCache = new AuthCache();

// Convenience functions para compatibilidade
export const getCurrentUserId = () => authCache.getCurrentUserId();
export const getCurrentUser = () => authCache.getCurrentUser();