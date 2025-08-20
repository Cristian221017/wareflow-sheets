import { supabase } from '@/integrations/supabase/client';

/**
 * Testa login direto dos clientes para diagnóstico
 */
export const testClientLogin = async () => {
  const clients = [
    { email: 'comercial@rodoveigatransportes.com.br', password: 'cliente123' },
    { email: 'contato@premiumcorp.com', password: 'cliente123' }
  ];

  console.log('=== TESTE DE LOGIN DOS CLIENTES ===');

  for (const client of clients) {
    console.log(`\n🧪 Testando: ${client.email}`);
    
    try {
      // Fazer logout primeiro para limpar sessão
      await supabase.auth.signOut();
      
      // Tentar login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: client.email,
        password: client.password
      });

      if (error) {
        console.log(`❌ ERRO: ${error.message}`);
        console.log(`   Código: ${error.status || 'N/A'}`);
        
        // Verificar se é problema de confirmação
        if (error.message.includes('email_not_confirmed') || error.message.includes('confirm')) {
          console.log(`⚠️  Possível problema: Email não confirmado`);
          console.log(`   Sugestão: Desabilitar confirmação no Supabase`);
        }
      } else {
        console.log(`✅ LOGIN SUCESSO!`);
        console.log(`   User ID: ${data.user?.id}`);
        console.log(`   Email confirmado: ${data.user?.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`   Última vez ativo: ${data.user?.last_sign_in_at}`);
        
        // Fazer logout para próximo teste
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.log(`❌ ERRO INESPERADO:`, error);
    }
  }

  console.log('\n=== FIM DO TESTE ===');
  console.log('💡 Se houver problemas de confirmação, vá para:');
  console.log('   Supabase > Authentication > Settings > Desabilitar "Enable email confirmations"');
};