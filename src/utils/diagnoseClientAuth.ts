import { supabase } from '@/integrations/supabase/client';

/**
 * Diagnóstico completo dos clientes e autenticação
 */
export const diagnoseClientAuth = async () => {
  try {
    console.log('🔍 === DIAGNÓSTICO COMPLETO DOS CLIENTES ===');

    // 1. Buscar todos os clientes cadastrados
    console.log('\n📋 1. CLIENTES CADASTRADOS:');
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('*')
      .eq('status', 'ativo');

    if (clientesError) {
      console.error('Erro ao buscar clientes:', clientesError);
      return;
    }

    console.log(`Encontrados ${clientes?.length || 0} clientes ativos:`);
    clientes?.forEach((cliente, index) => {
      console.log(`${index + 1}. ${cliente.razao_social} (${cliente.email})`);
    });

    // 2. Para cada cliente, tentar diferentes senhas
    const possiblePasswords = ['cliente123', 'Cliente123', '123456', 'senha123'];
    
    console.log('\n🔐 2. TESTE DE AUTENTICAÇÃO:');
    
    for (const cliente of clientes || []) {
      console.log(`\n👤 Testando cliente: ${cliente.email}`);
      
      let loginSuccess = false;
      
      for (const password of possiblePasswords) {
        try {
          // Fazer logout primeiro
          await supabase.auth.signOut();
          
          // Tentar login
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cliente.email,
            password: password
          });

          if (!error && data.user) {
            console.log(`  ✅ SUCESSO com senha: "${password}"`);
            console.log(`     User ID: ${data.user.id}`);
            console.log(`     Email confirmado: ${data.user.email_confirmed_at ? 'Sim' : 'Não'}`);
            loginSuccess = true;
            await supabase.auth.signOut(); // Logout após sucesso
            break;
          }
        } catch (err) {
          // Continuar testando outras senhas
        }
      }
      
      if (!loginSuccess) {
        console.log(`  ❌ FALHA com todas as senhas testadas`);
        console.log(`     Senhas testadas: ${possiblePasswords.join(', ')}`);
        
        // Verificar se precisa criar conta
        console.log(`  📝 Sugestão: Conta precisa ser criada ou senha resetada`);
      }
    }

    // 3. Mostrar resumo e sugestões
    console.log('\n💡 3. RESUMO E SUGESTÕES:');
    console.log('Para resolver problemas de login:');
    console.log('1. Use "Corrigir Senhas" - envia reset por email');
    console.log('2. Use "Criar Contas" - cria novas contas se necessário');
    console.log('3. Use "Testar Login" - verifica se funcionou');
    console.log('\n🔧 Se um cliente específico ainda não conseguir logar:');
    console.log('- Verifique se o email está correto na tabela clientes');
    console.log('- Confirme se a senha foi redefinida via email');
    console.log('- Teste manualmente no painel de autenticação');

    console.log('\n✅ Diagnóstico concluído!');

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
};