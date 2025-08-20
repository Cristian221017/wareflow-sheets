import { supabase } from '@/integrations/supabase/client';

/**
 * Cria contas de usuário para clientes que ainda não possuem login
 * Usar apenas em desenvolvimento/setup inicial
 */
export const createAccountsForExistingClients = async (defaultPassword: string = 'cliente123') => {
  try {
    // Buscar todos os clientes
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('status', 'ativo');

    if (error) {
      console.error('Erro ao buscar clientes:', error);
      return;
    }

    console.log(`Encontrados ${clientes?.length || 0} clientes para criar contas`);

    for (const cliente of clientes || []) {
      try {
        const { error: authError } = await supabase.auth.signUp({
          email: cliente.email,
          password: defaultPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/cliente`,
            data: {
              name: cliente.razao_social,
              cnpj: cliente.cnpj
            }
          }
        });

        if (authError) {
          if (authError.message.includes('User already registered')) {
            console.log(`✓ Conta já existe para: ${cliente.email}`);
          } else {
            console.error(`✗ Erro ao criar conta para ${cliente.email}:`, authError);
          }
        } else {
          console.log(`✓ Conta criada para: ${cliente.email} com senha: ${defaultPassword}`);
        }
      } catch (error) {
        console.error(`✗ Erro ao processar ${cliente.email}:`, error);
      }
    }

    console.log('Processo de criação de contas concluído!');
  } catch (error) {
    console.error('Erro geral:', error);
  }
};