import { supabase } from '@/integrations/supabase/client';

/**
 * Debug profundo do usuário Comercial@rodoveigatransportes.com.br
 */
export const debugSpecificUser = async () => {
  const email = 'Comercial@rodoveigatransportes.com.br';
  
  try {
    console.log(`🔍 === DEBUG PROFUNDO: ${email} ===`);
    
    // 1. Verificar se o cliente existe na tabela clientes
    console.log('\n1️⃣ Verificando tabela clientes...');
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', email)
      .single();
    
    if (clienteError) {
      console.log(`❌ Erro ao buscar cliente: ${clienteError.message}`);
    } else {
      console.log('✅ Cliente encontrado na tabela:');
      console.log(`   ID: ${clienteData.id}`);
      console.log(`   Razão Social: ${clienteData.razao_social}`);
      console.log(`   Status: ${clienteData.status}`);
      console.log(`   CNPJ: ${clienteData.cnpj}`);
    }
    
    // 2. Tentar diferentes variações do email
    console.log('\n2️⃣ Testando variações do email...');
    const emailVariations = [
      'Comercial@rodoveigatransportes.com.br',
      'comercial@rodoveigatransportes.com.br',
      'COMERCIAL@RODOVEIGATRANSPORTES.COM.BR'
    ];
    
    for (const emailVar of emailVariations) {
      console.log(`\n📧 Testando: ${emailVar}`);
      
      // Testar login com senha padrão
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailVar,
        password: 'cliente123'
      });
      
      if (loginError) {
        console.log(`   ❌ Login falhou: ${loginError.message}`);
        
        // Se é problema de confirmação, tentar reenviar
        if (loginError.message.includes('email_not_confirmed')) {
          console.log('   📧 Reenviando confirmação...');
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: emailVar
          });
          
          if (!resendError) {
            console.log('   ✅ Email de confirmação reenviado');
          }
        }
      } else {
        console.log(`   ✅ LOGIN FUNCIONOU!`);
        console.log(`   User ID: ${loginData.user?.id}`);
        console.log(`   Email confirmado: ${loginData.user?.email_confirmed_at ? 'Sim' : 'Não'}`);
        await supabase.auth.signOut();
        return; // Se funcionou, parar aqui
      }
    }
    
    // 3. Tentar criar nova conta com dados corretos
    console.log('\n3️⃣ Tentando criar nova conta...');
    
    // Primeiro, verificar se já existe
    const { data: existingUser, error: signupError } = await supabase.auth.signUp({
      email: email,
      password: 'cliente123',
      options: {
        data: {
          name: 'H TRANSPORTES LTDA',
          cnpj: '43.296.599/0001-65'
        },
        emailRedirectTo: `${window.location.origin}/cliente`
      }
    });
    
    if (signupError) {
      console.log(`❌ Erro no signup: ${signupError.message}`);
      
      if (signupError.message.includes('already_registered') || signupError.message.includes('User already registered')) {
        console.log('⚠️  Usuário já existe - enviando reset de senha...');
        
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/cliente`
        });
        
        if (resetError) {
          console.log(`❌ Erro no reset: ${resetError.message}`);
        } else {
          console.log('✅ Email de reset enviado');
        }
      }
    } else {
      console.log('✅ Nova conta criada!');
      if (existingUser.user?.email_confirmed_at) {
        console.log('✅ Email automaticamente confirmado');
      } else {
        console.log('📧 Verifique email para confirmação');
      }
    }
    
    // 4. Instruções finais
    console.log('\n📋 DIAGNÓSTICO COMPLETO:');
    console.log('================================');
    console.log('🔧 PRÓXIMOS PASSOS:');
    console.log('1. Verifique o email: Comercial@rodoveigatransportes.com.br');
    console.log('2. Procure por emails do Supabase (pode estar na pasta spam)');
    console.log('3. Clique no link de confirmação OU reset de senha');
    console.log('4. Se for reset, defina a senha como: cliente123');
    console.log('5. Tente fazer login novamente');
    console.log('');
    console.log('💡 DICA: Se não receber emails, vá até:');
    console.log('   Supabase Dashboard > Authentication > Settings');
    console.log('   E DESABILITE "Enable email confirmations"');
    
  } catch (error) {
    console.error('❌ Erro inesperado no debug:', error);
  }
};