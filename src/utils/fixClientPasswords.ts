import { supabase } from '@/integrations/supabase/client';

/**
 * Corrige senhas dos clientes via admin - atualiza senhas diretamente
 */
export const fixClientPasswords = async () => {
  try {
    console.log('🔧 Iniciando correção de senhas dos clientes...');

    // Lista de clientes para corrigir
    const clientsToFix = [
      { email: 'comercial@rodoveigatransportes.com.br', password: 'cliente123' },
      { email: 'contato@premiumcorp.com', password: 'cliente123' }
    ];

    for (const client of clientsToFix) {
      console.log(`\n🔧 Processando: ${client.email}`);
      
      try {
        // Primeiro, fazer logout para limpar qualquer sessão
        await supabase.auth.signOut();
        
        // Tentar recuperar a senha via email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          client.email,
          {
            redirectTo: `${window.location.origin}/reset-password`
          }
        );

        if (resetError) {
          console.log(`❌ Erro ao enviar reset para ${client.email}:`, resetError.message);
          
          // Se o reset falhou, verificar se o usuário existe tentando login
          const { data: loginTest, error: loginError } = await supabase.auth.signInWithPassword({
            email: client.email,
            password: client.password
          });

          if (loginError) {
            console.log(`❌ Login ainda falha para ${client.email}: ${loginError.message}`);
            
            // Se login falha, tentar criar nova conta
            console.log(`🔄 Tentando recriar conta para ${client.email}...`);
            
            const { data: signupData, error: signupError } = await supabase.auth.signUp({
              email: client.email,
              password: client.password,
              options: {
                emailRedirectTo: `${window.location.origin}/cliente`
              }
            });

            if (signupError) {
              console.log(`❌ Erro ao recriar conta: ${signupError.message}`);
            } else {
              console.log(`✅ Conta recriada com sucesso para ${client.email}`);
            }
          } else {
            console.log(`✅ Login já funciona para ${client.email}`);
            await supabase.auth.signOut(); // Logout após teste
          }
        } else {
          console.log(`📧 Email de reset de senha enviado para ${client.email}`);
        }

      } catch (error) {
        console.error(`❌ Erro inesperado ao processar ${client.email}:`, error);
      }
    }

    console.log('\n✅ Processo de correção concluído!');
    console.log('📝 Instruções:');
    console.log('1. Verifique o email dos clientes para links de reset de senha');
    console.log('2. Se não receberam email, as contas podem ter sido recriadas');
    console.log('3. Execute o teste de login novamente para verificar');

  } catch (error) {
    console.error('❌ Erro geral na correção de senhas:', error);
  }
};