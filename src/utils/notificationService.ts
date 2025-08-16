// Serviço de notificações por email (mock)
export const notificationService = {
  enviarNotificacaoNFCadastrada: (emailRastreabilidade: string, numeroNF: string, cliente: string) => {
    console.log(`📧 Email enviado para ${emailRastreabilidade}`);
    console.log(`Assunto: Nova NF Cadastrada - ${numeroNF}`);
    console.log(`Mensagem: A Nota Fiscal ${numeroNF} foi cadastrada em nome de ${cliente}.`);
    
    // Aqui seria implementada a integração real com serviço de email
    // Exemplo: SendGrid, AWS SES, etc.
  },

  enviarNotificacaoSolicitacaoLiberacao: (emailRastreabilidade: string, numeroPedido: string, cliente: string) => {
    console.log(`📧 Email enviado para ${emailRastreabilidade}`);
    console.log(`Assunto: Solicitação de Liberação - ${numeroPedido}`);
    console.log(`Mensagem: Foi solicitada a liberação do pedido ${numeroPedido} para ${cliente}.`);
  },

  enviarNotificacaoLiberacaoAutorizada: (emailRastreabilidade: string, numeroPedido: string, transportadora: string) => {
    console.log(`📧 Email enviado para ${emailRastreabilidade}`);
    console.log(`Assunto: Pedido Liberado - ${numeroPedido}`);
    console.log(`Mensagem: O pedido ${numeroPedido} foi liberado para a transportadora ${transportadora}.`);
  }
};