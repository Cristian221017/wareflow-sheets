// Serviço de notificações por email utilizando edge function
import { supabase } from '@/integrations/supabase/client';

export const notificationService = {
  enviarNotificacaoNFCadastrada: async (emailRastreabilidade: string, numeroNF: string, cliente: string) => {
    console.log(`📧 Enviando email para ${emailRastreabilidade}`);
    
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailRastreabilidade,
          subject: `Nova NF Cadastrada - ${numeroNF}`,
          type: 'nf_cadastrada',
          data: {
            nome: cliente,
            numeroDocumento: numeroNF,
            cliente: cliente
          }
        }
      });
      console.log(`✅ Email enviado com sucesso para ${emailRastreabilidade}`);
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
    }
  },

  enviarNotificacaoSolicitacaoCarregamento: async (emailRastreabilidade: string, numeroPedido: string, cliente: string) => {
    console.log(`📧 Enviando email para ${emailRastreabilidade}`);
    
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailRastreabilidade,
          subject: `Ordem de Carregamento - ${numeroPedido}`,
          type: 'solicitacao_carregamento',
          data: {
            nome: cliente,
            numeroDocumento: numeroPedido,
            cliente: cliente
          }
        }
      });
      console.log(`✅ Email enviado com sucesso para ${emailRastreabilidade}`);
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
    }
  },

  enviarNotificacaoConfirmacaoAutorizada: async (emailRastreabilidade: string, numeroPedido: string, transportadora: string) => {
    console.log(`📧 Enviando email para ${emailRastreabilidade}`);
    
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailRastreabilidade,
          subject: `Pedido Confirmado - ${numeroPedido}`,
          type: 'confirmacao_autorizada',
          data: {
            nome: 'Cliente',
            numeroDocumento: numeroPedido,
            transportadora: transportadora
          }
        }
      });
      console.log(`✅ Email enviado com sucesso para ${emailRastreabilidade}`);
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
    }
  },

  enviarNotificacaoBoletoCadastrado: async (emailNotificacao: string, numeroCTE: string, cliente: string) => {
    console.log(`📧 Enviando email para ${emailNotificacao}`);
    
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailNotificacao,
          subject: `Novo Boleto Cadastrado - ${numeroCTE}`,
          type: 'boleto_cadastrado',
          data: {
            nome: cliente,
            numeroDocumento: numeroCTE,
            cliente: cliente
          }
        }
      });
      console.log(`✅ Email enviado com sucesso para ${emailNotificacao}`);
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
    }
  },

  enviarNotificacaoClienteCadastrado: async (email: string, nome: string, senha?: string) => {
    console.log(`📧 Enviando email de boas-vindas para ${email}`);
    
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: email,
          subject: `Bem-vindo ao Sistema WMS - ${nome}`,
          type: 'cliente_cadastrado',
          data: {
            nome: nome,
            email: email,
            senha: senha
          }
        }
      });
      console.log(`✅ Email de boas-vindas enviado com sucesso para ${email}`);
    } catch (error) {
      console.error('❌ Erro ao enviar email de boas-vindas:', error);
    }
  },

  enviarNotificacaoEmbarque: async (emailRastreabilidade: string, numeroDocumento: string, cliente: string) => {
    console.log(`📧 Enviando email de embarque para ${emailRastreabilidade}`);
    
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailRastreabilidade,
          subject: `Embarque Confirmado - ${numeroDocumento}`,
          type: 'embarque_confirmado',
          data: {
            nome: cliente,
            numeroDocumento: numeroDocumento
          }
        }
      });
      console.log(`✅ Email de embarque enviado com sucesso para ${emailRastreabilidade}`);
    } catch (error) {
      console.error('❌ Erro ao enviar email de embarque:', error);
    }
  },

  enviarNotificacaoEntrega: async (emailRastreabilidade: string, numeroDocumento: string, cliente: string) => {
    console.log(`📧 Enviando email de entrega para ${emailRastreabilidade}`);
    
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailRastreabilidade,
          subject: `Entrega Confirmada - ${numeroDocumento}`,
          type: 'entrega_confirmada',
          data: {
            nome: cliente,
            numeroDocumento: numeroDocumento
          }
        }
      });
      console.log(`✅ Email de entrega enviado com sucesso para ${emailRastreabilidade}`);
    } catch (error) {
      console.error('❌ Erro ao enviar email de entrega:', error);
    }
  }
};