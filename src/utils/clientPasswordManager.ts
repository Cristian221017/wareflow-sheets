import { supabase } from '@/integrations/supabase/client';

/**
 * Gerenciador de senhas para clientes específicos
 */
export const clientPasswordManager = {
  /**
   * Cria conta de acesso para cliente específico
   */
  createClientAccount: async (email: string, password: string, clientName: string) => {
    try {
      console.log(`🔑 Criando conta para: ${email}`);
      
      // Primeiro, verificar se o usuário já existe tentando fazer login
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (existingUser.user) {
        console.log(`✅ Conta já existe e senha está correta para: ${email}`);
        await supabase.auth.signOut(); // Fazer logout
        return { success: true, message: 'Conta já existe com essa senha' };
      }
      
      // Se chegou aqui, precisa criar nova conta
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/cliente`;
      
      console.log(`🔗 URL de redirecionamento para novo usuário: ${redirectUrl}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: clientName,
            role: 'cliente'
          }
        }
      });

      if (error) {
        // Se erro é que usuário já existe, tentar reset de senha
        if (error.message.includes('User already registered')) {
          console.log(`🔄 Usuário existe, enviando reset de senha para: ${email}`);
          return await clientPasswordManager.resetPassword(email);
        }
        throw error;
      }

      console.log(`✅ Conta criada com sucesso para: ${email}`);
      return { 
        success: true, 
        message: 'Conta criada! Cliente pode fazer login imediatamente.',
        userId: data.user?.id 
      };

    } catch (error) {
      console.error(`❌ Erro ao criar conta para ${email}:`, error);
      return { 
        success: false, 
        error: error.message || 'Erro ao criar conta' 
      };
    }
  },

  /**
   * Reset de senha para cliente específico
   */
  resetPassword: async (email: string) => {
    try {
      console.log(`🔄 Enviando reset de senha para: ${email}`);
      
      // Usar a URL atual do preview em vez de localhost
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/reset-password`;
      
      console.log(`🔗 URL de redirecionamento: ${redirectUrl}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        throw error;
      }

      console.log(`✅ Email de reset enviado para: ${email}`);
      return { 
        success: true, 
        message: `Email de reset de senha enviado para ${email}. O cliente deve verificar sua caixa de entrada e clicar no link.` 
      };

    } catch (error) {
      console.error(`❌ Erro ao enviar reset para ${email}:`, error);
      
      // Tratar erros específicos
      if (error.message.includes('Email address') && error.message.includes('invalid')) {
        return { success: false, error: 'Email inválido ou não encontrado no sistema' };
      }
      
      if (error.message.includes('For security purposes')) {
        return { success: false, error: 'Aguarde alguns segundos antes de tentar novamente' };
      }
      
      return { 
        success: false, 
        error: error.message || 'Erro ao enviar reset de senha' 
      };
    }
  },

  /**
   * Verifica se cliente tem conta ativa
   */
  checkClientAccount: async (email: string) => {
    try {
      // Tentar login com senha padrão comum para verificar se existe
      const commonPasswords = ['cliente123', '123456'];
      
      for (const password of commonPasswords) {
        const { data } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (data.user) {
          await supabase.auth.signOut();
          return { 
            hasAccount: true, 
            canLogin: true, 
            password: password 
          };
        }
      }
      
      return { hasAccount: false, canLogin: false };
      
    } catch (error) {
      return { hasAccount: false, canLogin: false };
    }
  }
};