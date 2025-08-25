import { supabase } from '@/integrations/supabase/client';

// Utility to force refresh user session and clear cache
export const forceRefreshAuth = async () => {
  try {
    console.log('🔄 Forcing auth refresh...');
    
    // Force refresh the current session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Error refreshing session:', error);
      return false;
    }
    
    console.log('✅ Session refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in forceRefreshAuth:', error);
    return false;
  }
};

// Utility to clear all auth state and re-login
export const clearAuthState = async () => {
  try {
    console.log('🧹 Clearing auth state...');
    
    // Sign out completely
    await supabase.auth.signOut();
    
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    console.log('✅ Auth state cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing auth state:', error);
    return false;
  }
};

// Debug user data function
export const debugUserData = async (userId: string) => {
  try {
    console.log('🔍 Debugging user data for:', userId);
    
    // Check profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Check user_transportadoras table
    const { data: role } = await supabase
      .from('user_transportadoras')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Check clientes table
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', profile?.email)
      .eq('status', 'ativo')
      .maybeSingle();
    
    console.log('🔍 Debug Results:', {
      profile,
      role,
      cliente
    });
    
    return { profile, role, cliente };
  } catch (error) {
    console.error('❌ Error debugging user data:', error);
    return null;
  }
};