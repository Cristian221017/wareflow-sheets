import { supabase } from '@/integrations/supabase/client';

/**
 * Corrige especificamente o usuário Comercial@rodoveigatransportes.com.br
 */
export const fixSpecificUser = async () => {
  const email = 'Comercial@rodoveigatransportes.com.br';
  const newPassword = 'cliente123';
  
  try {
    console.log(`🔧 === CORREÇÃO ESPECÍFICA PARA ${email} ===`);
    
    // 1. Primeiro, tentar login para ver o status atual
    console.log('\n1️⃣ Testando login atual...');
    
    const { data: loginTest, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: newPassword
    });

    if (loginTest.user) {
      console.log('✅ Login já funciona!');
      console.log(`   User ID: ${loginTest.user.id}`);
      console.log(`   Email confirmado: ${loginTest.user.email_confirmed_at ? 'Sim' : 'Não'}`);
      await supabase.auth.signOut();
      return;
    }

    if (loginError) {
      console.log(`❌ Login falha: ${loginError.message}`);
      
      // 2. Se login falha, verificar se é problema de confirmação
      if (loginError.message.includes('email_not_confirmed') || loginError.message.includes('confirm')) {
        console.log('\n2️⃣ Problema de confirmação detectado - enviando confirmação...');
        
        // Tentar reenviar confirmação
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email
        });
        
        if (resendError) {
          console.log(`❌ Erro ao reenviar confirmação: ${resendError.message}`);
        } else {
          console.log('✅ Email de confirmação reenviado');
        }
      }
      
      // 3. Tentar reset de senha independentemente
      console.log('\n3️⃣ Enviando reset de senha...');
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });
      
      if (resetError) {
        console.log(`❌ Erro no reset: ${resetError.message}`);
        
        // 4. Se reset falha, pode ser que a conta não existe ou está com problema
        // Vamos tentar recriar
        console.log('\n4️⃣ Tentando recriar a conta...');
        
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: email,
          password: newPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (signupError) {
          if (signupError.message.includes('already_registered') || signupError.message.includes('already')) {
            console.log('⚠️  Conta já existe - problema pode ser senha ou confirmação');
            console.log('💡 Verifique o email para link de reset de senha');
          } else {
            console.log(`❌ Erro ao recriar conta: ${signupError.message}`);
          }
        } else {
          console.log('✅ Nova conta criada!');
          if (signupData.user?.email_confirmed_at) {
            console.log('✅ Email automaticamente confirmado');
          } else {
            console.log('📧 Verifique o email para confirmação');
          }
        }
      } else {
        console.log('✅ Email de reset enviado com sucesso');
      }
    }
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Verifique o email Comercial@rodoveigatransportes.com.br');
    console.log('2. Clique no link de reset de senha OU confirmação');
    console.log('3. Defina a senha como: cliente123');
    console.log('4. Tente fazer login novamente');
    
    console.log('\n✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
};