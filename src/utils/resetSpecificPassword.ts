import { supabase } from '@/integrations/supabase/client';

/**
 * Reset direto de senha via admin para usuário específico
 */
export const resetSpecificPassword = async (email: string, newPassword: string) => {
  try {
    console.log(`🔧 === RESET DIRETO DE SENHA ===`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Nova senha: ${newPassword}`);
    
    // Primeiro, tentar logar com a nova senha para ver se já funciona
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: newPassword
    });

    if (loginData.user) {
      console.log(`✅ Senha ${newPassword} já funciona para ${email}`);
      await supabase.auth.signOut();
      return { success: true, message: `Login já funciona com senha: ${newPassword}` };
    }

    // Se não funcionou, enviar reset com URL correta
    const currentUrl = window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${currentUrl}/reset-password`
    });

    if (resetError) {
      console.error(`❌ Erro ao enviar reset:`, resetError);
      return { success: false, error: resetError.message };
    }

    console.log(`✅ Email de reset enviado para ${email}`);
    console.log(`🔗 URL de redirecionamento: ${currentUrl}/reset-password`);
    
    return { 
      success: true, 
      message: `Email de reset enviado para ${email}. Verifique o email e clique no link.` 
    };

  } catch (error) {
    console.error('❌ Erro no reset:', error);
    return { success: false, error: error.message };
  }
};