import { supabase } from '@/integrations/supabase/client';

/**
 * Força a criação de um usuário específico no Supabase
 */
export const forceCreateUser = async () => {
  const email = 'Comercial@rodoveigatransportes.com.br';
  const password = 'cliente123';
  const name = 'H TRANSPORTES LTDA';
  const cnpj = '43.296.599/0001-65';
  
  console.log('🔧 === CRIAÇÃO FORÇADA DE USUÁRIO ===');
  console.log(`📧 Email: ${email}`);
  
  try {
    // 1. Tentar fazer logout primeiro
    await supabase.auth.signOut();
    console.log('🚪 Logout realizado');
    
    // 2. Verificar se o usuário já existe no auth
    console.log('🔍 Verificando se usuário existe...');
    const { data: existingUser, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          cnpj: cnpj
        },
        emailRedirectTo: `${window.location.origin}/cliente`
      }
    });
    
    if (signUpError) {
      console.log(`❌ Erro no signUp: ${signUpError.message}`);
      
      if (signUpError.message.includes('already_registered') || 
          signUpError.message.includes('User already registered')) {
        console.log('👤 Usuário já existe - enviando reset de senha...');
        
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/cliente`
        });
        
        if (resetError) {
          console.log(`❌ Erro no reset: ${resetError.message}`);
        } else {
          console.log('✅ Email de reset enviado com sucesso');
        }
      }
    } else {
      console.log('✅ USUÁRIO CRIADO COM SUCESSO!');
      console.log(`   User ID: ${existingUser.user?.id}`);
      console.log(`   Email confirmado: ${existingUser.user?.email_confirmed_at ? 'Sim' : 'Não'}`);
      
      if (!existingUser.user?.email_confirmed_at) {
        console.log('📧 Email não confirmado - reenviando confirmação...');
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email
        });
        
        if (!resendError) {
          console.log('✅ Email de confirmação reenviado');
        }
      }
    }
    
    // 3. Aguardar um pouco e tentar login para verificar
    console.log('⏳ Aguardando 2 segundos antes do teste...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🧪 Testando login após criação...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (loginError) {
      console.log(`❌ Login ainda falha: ${loginError.message}`);
      console.log('💡 INSTRUÇÕES IMPORTANTES:');
      console.log('1. Verifique o email: Comercial@rodoveigatransportes.com.br');
      console.log('2. Procure por emails do Supabase (pode estar na pasta spam)');
      console.log('3. Clique no link de confirmação ou reset de senha');
      console.log('4. Se for reset, defina a senha como: cliente123');
      
      console.log('\n🔧 ALTERNATIVA - Ir ao Supabase Dashboard:');
      console.log('1. Acesse: Authentication > Users');
      console.log('2. Procure por: Comercial@rodoveigatransportes.com.br');
      console.log('3. Se existir, marque como "email confirmado"');
      console.log('4. Se não existir, crie manualmente');
    } else {
      console.log('🎉 SUCESSO! Usuário agora pode fazer login');
      console.log(`   User ID: ${loginData.user?.id}`);
      await supabase.auth.signOut(); // Logout após teste
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
  
  console.log('\n=== FIM DA CRIAÇÃO FORÇADA ===');
};