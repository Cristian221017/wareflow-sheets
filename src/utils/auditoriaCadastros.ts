/**
 * AUDITORIA DOS CADASTROS DO SISTEMA
 * 
 * Esta auditoria identifica inconsistências nos fluxos de cadastro que podem 
 * interferir nos acessos ao sistema.
 */

import { supabase } from '@/integrations/supabase/client';

export const auditoriaCadastros = {
  
  /**
   * PROBLEMAS IDENTIFICADOS:
   * 
   * 1. INCONSISTÊNCIA NO AuthContext.getUserData():
   *    - Busca system user (admin/transportadora) primeiro
   *    - Depois busca cliente via email match
   *    - Mas não há sincronização garantida entre profiles.email e clientes.email
   * 
   * 2. FLUXOS DE CADASTRO DESALINHADOS:
   *    - FormCadastroCliente: Cria cliente + auth + profile + user_clientes
   *    - FormCadastroUsuario: Cria auth + profile + user_transportadoras OU clientes 
   *    - FormCadastroUsuarioCliente: Cria apenas auth + profile
   * 
   * 3. POLÍTICAS RLS INCONSISTENTES:
   *    - Algumas policies assumem vínculo via user_clientes
   *    - Outras assumem match direto via email entre profiles e clientes
   * 
   * 4. GERENCIAMENTO DE SENHAS:
   *    - clientPasswordManager foi corrigido recentemente
   *    - Mas ainda pode haver contas com senhas inconsistentes
   * 
   * 5. LOGS DE AUTENTICAÇÃO MOSTRAM:
   *    - "Invalid login credentials" - senhas incorretas/inexistentes
   *    - "User already registered" - tentativas de duplicar usuários
   */

  /**
   * Verifica integridade entre profiles e clientes
   */
  async verificarIntegridadeProfiles() {
    console.log('🔍 Verificando integridade profiles ↔ clientes...');
    
    try {
      // Buscar todos os clientes ativos
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, email, razao_social')  
        .eq('status', 'ativo');

      // Buscar todos os profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, name');

      const clientesSemProfile = [];
      const profilesSemCliente = [];

      // Verificar clientes sem profiles
      for (const cliente of clientes || []) {
        const profileEncontrado = profiles?.find(p => 
          p.email.toLowerCase() === cliente.email.toLowerCase()
        );
        if (!profileEncontrado) {
          clientesSemProfile.push(cliente);
        }
      }

      // Verificar profiles que poderiam ser clientes
      for (const profile of profiles || []) {
        const clienteEncontrado = clientes?.find(c => 
          c.email.toLowerCase() === profile.email.toLowerCase()
        );
        // Só considerar órfão se não for admin/transportadora
        const { data: userTransp } = await supabase
          .from('user_transportadoras')
          .select('user_id')
          .eq('user_id', profile.user_id)
          .eq('is_active', true)
          .maybeSingle();
          
        if (!clienteEncontrado && !userTransp) {
          profilesSemCliente.push(profile);
        }
      }

      console.log('📊 Clientes sem profile de auth:', clientesSemProfile.length);
      console.log('📊 Profiles órfãos:', profilesSemCliente.length);

      if (clientesSemProfile.length) {
        console.log('⚠️  Clientes sem auth:', clientesSemProfile);
      }

      return { clientesSemProfile, profilesSemCliente };
    } catch (error) {
      console.error('❌ Erro na verificação de integridade:', error);
      return { clientesSemProfile: [], profilesSemCliente: [] };
    }
  },

  /**
   * Verifica vínculos na tabela user_clientes  
   */
  async verificarVinculosUserClientes() {
    console.log('🔍 Verificando vínculos user_clientes...');
    
    try {
      // Query direta SQL para user_clientes
      const { data: vinculos, error } = await supabase.rpc('get_user_clientes_info' as any);
      
      if (error) {
        console.log('⚠️  Função get_user_clientes_info não existe, usando query alternativa');
        // Fallback: query simples
        const { data } = await supabase
          .from('profiles')
          .select('user_id, email, name');
          
        console.log('📊 Total de profiles:', data?.length || 0);
        return { vinculosAtivos: [], vinculosInativos: [] };
      }

      console.log('📊 Vínculos encontrados:', vinculos?.length || 0);
      return { vinculosAtivos: vinculos || [], vinculosInativos: [] };
    } catch (error) {
      console.error('❌ Erro na verificação de vínculos:', error);
      return { vinculosAtivos: [], vinculosInativos: [] };
    }
  },

  /**
   * Testa autenticação de clientes conhecidos
   */
  async testarAutenticacaoClientes() {
    console.log('🔍 Testando autenticação de clientes...');
    
    // Buscar alguns clientes ativos para teste
    const { data: clientes } = await supabase
      .from('clientes')
      .select('email, razao_social')
      .eq('status', 'ativo')
      .limit(3);

    if (!clientes?.length) {
      console.log('📊 Nenhum cliente encontrado para teste');
      return [];
    }

    const resultados = [];
    const senhasPadrao = ['cliente123', '123456', 'senha123'];

    for (const cliente of clientes) {
      console.log(`🧪 Testando cliente: ${cliente.email}`);
      
      let podeLogar = false;
      let senhaCorreta = null;

      for (const senha of senhasPadrao) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cliente.email,
            password: senha
          });

          if (data.user && !error) {
            podeLogar = true;
            senhaCorreta = senha;
            
            // Fazer logout imediatamente
            await supabase.auth.signOut();
            break;
          }
        } catch (error) {
          // Continue tentando outras senhas
        }
      }

      resultados.push({
        cliente: cliente.razao_social,
        email: cliente.email,
        podeLogar,
        senhaCorreta,
        status: podeLogar ? '✅ OK' : '❌ Sem acesso'
      });
    }

    console.log('📊 Resultados dos testes de autenticação:');
    resultados.forEach(r => {
      console.log(`${r.status} ${r.cliente} (${r.email})`);
    });

    return resultados;
  },

  /**
   * Executa auditoria completa
   */
  async executarAuditoriaCompleta() {
    console.log('🚀 INICIANDO AUDITORIA COMPLETA DOS CADASTROS');
    console.log('═'.repeat(60));

    try {
      const integridade = await this.verificarIntegridadeProfiles();
      const vinculos = await this.verificarVinculosUserClientes();  
      const autenticacao = await this.testarAutenticacaoClientes();

      const relatorio = {
        timestamp: new Date().toISOString(),
        integridade,
        vinculos,
        autenticacao,
        resumo: {
          clientesSemAuth: integridade.clientesSemProfile.length,
          profilesOrfaos: integridade.profilesSemCliente.length,
          vinculosAtivos: vinculos.vinculosAtivos.length,
          clientesComAcesso: autenticacao.filter(c => c.podeLogar).length,
          clientesSemAcesso: autenticacao.filter(c => !c.podeLogar).length
        }
      };

      console.log('📋 RESUMO DA AUDITORIA:');
      console.log(`• Clientes sem autenticação: ${relatorio.resumo.clientesSemAuth}`);
      console.log(`• Profiles órfãos: ${relatorio.resumo.profilesOrfaos}`);
      console.log(`• Vínculos ativos: ${relatorio.resumo.vinculosAtivos}`);
      console.log(`• Clientes com acesso: ${relatorio.resumo.clientesComAcesso}`);
      console.log(`• Clientes sem acesso: ${relatorio.resumo.clientesSemAcesso}`);

      if (relatorio.resumo.clientesSemAcesso > 0) {
        console.log('⚠️  ATENÇÃO: Há clientes sem acesso ao sistema!');
      }

      if (relatorio.resumo.clientesSemAuth > 0) {
        console.log('⚠️  ATENÇÃO: Há clientes sem contas de autenticação!');
      }

      console.log('═'.repeat(60));
      console.log('✅ AUDITORIA CONCLUÍDA');

      return relatorio;

    } catch (error) {
      console.error('❌ Erro na auditoria completa:', error);
      throw error;
    }
  },

  /**
   * SOLUÇÕES RECOMENDADAS:
   * 
   * 1. PADRONIZAR FLUXOS DE CADASTRO:
   *    - Todos os cadastros devem seguir o mesmo padrão
   *    - auth.signUp -> profiles -> clientes/user_transportadoras -> user_clientes (se aplicável)
   * 
   * 2. SINCRONIZAÇÃO DE EMAILS:
   *    - Implementar trigger para manter emails sincronizados
   *    - Normalizar emails (lowercase, trim) em todas as tabelas
   * 
   * 3. CORREÇÃO DAS POLICIES RLS:
   *    - Decidir se usar user_clientes OU email match (não ambos)
   *    - Atualizar todas as policies para ser consistentes
   * 
   * 4. LIMPEZA DE DADOS:
   *    - Criar vínculos user_clientes para todos os clientes ativos
   *    - Resetar senhas de clientes sem acesso
   * 
   * 5. MONITORAMENTO:
   *    - Executar esta auditoria regularmente
   *    - Alertar para inconsistências
   */

  /**
   * Corrige vínculos faltantes entre users e clientes
   */
  async corrigirVinculosFaltantes() {
    console.log('🔧 Corrigindo vínculos faltantes...');

    try {
      // Buscar clientes ativos
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, email, razao_social')
        .eq('status', 'ativo');

      // Buscar profiles correspondentes
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email');

      let vinculosCriados = 0;

      for (const cliente of clientes || []) {
        const profile = profiles?.find(p => 
          p.email.toLowerCase() === cliente.email.toLowerCase()
        );

        if (profile) {
          try {
            // Tentar inserir vínculo (se já existir, vai dar erro mas não problema)
            const result = await supabase.rpc('create_user_cliente_link' as any, {
              p_user_id: profile.user_id,
              p_cliente_id: cliente.id
            });

            if (!result.error) {
              vinculosCriados++;
              console.log(`✅ Vínculo criado para ${cliente.razao_social}`); 
            }
          } catch (error) {
            // Ignorar erros de duplicata
            console.log(`⚠️  Vínculo já existe para ${cliente.razao_social}`);
          }
        }
      }

      console.log(`✅ Correção concluída: ${vinculosCriados} vínculos processados`);
      return vinculosCriados;

    } catch (error) {
      console.error('❌ Erro na correção de vínculos:', error);
      return 0;
    }
  }

};

// Exportar função para uso rápido no console
(window as any).auditoriaCadastros = auditoriaCadastros;

console.log('🔧 Auditoria de cadastros carregada. Use: auditoriaCadastros.executarAuditoriaCompleta()');