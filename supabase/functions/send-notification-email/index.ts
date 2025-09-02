import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  subject: string;
  type: 'nf_cadastrada' | 'solicitacao_carregamento' | 'confirmacao_autorizada' | 'boleto_cadastrado' | 'cliente_cadastrado' | 'embarque_confirmado' | 'entrega_confirmada';
  data: {
    nome: string;
    numeroDocumento?: string;
    cliente?: string;
    transportadora?: string;
    email?: string;
    senha?: string;
  };
}

function getEmailTemplate(type: string, data: any): string {
  const baseStyle = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
      .content { padding: 20px; }
      .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; color: #666; font-size: 12px; }
      .highlight { background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; }
      .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    </style>
  `;

  switch (type) {
    case 'nf_cadastrada':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>Nova Nota Fiscal Cadastrada</h2>
          </div>
          <div class="content">
            <h3>Olá, ${data.nome}!</h3>
            <p>Uma nova Nota Fiscal foi cadastrada em nosso sistema:</p>
            <div class="highlight">
              <strong>Número da NF:</strong> ${data.numeroDocumento}<br>
              <strong>Cliente:</strong> ${data.cliente}<br>
              <strong>Status:</strong> Armazenada
            </div>
            <p>A mercadoria está sendo processada em nosso armazém. Você será notificado quando houver atualizações no status.</p>
          </div>
          <div class="footer">
            Sistema WMS - Gestão de Armazém
          </div>
        </div>
      `;

    case 'solicitacao_carregamento':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>Ordem de Carregamento Solicitada</h2>
          </div>
          <div class="content">
            <h3>Prezado(a) ${data.nome},</h3>
            <p>Uma nova ordem de carregamento foi solicitada:</p>
            <div class="highlight">
              <strong>Número do Pedido:</strong> ${data.numeroDocumento}<br>
              <strong>Cliente:</strong> ${data.cliente}<br>
              <strong>Status:</strong> Aguardando confirmação
            </div>
            <p>Nossa equipe está analisando a solicitação. Você receberá uma confirmação em breve.</p>
          </div>
          <div class="footer">
            Sistema WMS - Gestão de Armazém
          </div>
        </div>
      `;

    case 'confirmacao_autorizada':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>🎉 Pedido Confirmado e Autorizado</h2>
          </div>
          <div class="content">
            <h3>Excelente notícia, ${data.nome}!</h3>
            <p>Seu pedido foi confirmado e autorizado para carregamento:</p>
            <div class="highlight">
              <strong>Número do Pedido:</strong> ${data.numeroDocumento}<br>
              <strong>Transportadora:</strong> ${data.transportadora}<br>
              <strong>Status:</strong> Confirmado
            </div>
            <p>Sua mercadoria será carregada e embarcada em breve. Acompanhe o status no sistema.</p>
          </div>
          <div class="footer">
            Sistema WMS - Gestão de Armazém
          </div>
        </div>
      `;

    case 'boleto_cadastrado':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>Novo Boleto Cadastrado</h2>
          </div>
          <div class="content">
            <h3>Prezado(a) ${data.nome},</h3>
            <p>Um novo documento financeiro foi cadastrado para sua empresa:</p>
            <div class="highlight">
              <strong>Número CTE:</strong> ${data.numeroDocumento}<br>
              <strong>Cliente:</strong> ${data.cliente}<br>
              <strong>Status:</strong> Em aberto
            </div>
            <p>Acesse o sistema para visualizar os detalhes do documento financeiro e realizar o pagamento.</p>
            <a href="#" class="button">Acessar Sistema Financeiro</a>
          </div>
          <div class="footer">
            Sistema WMS - Gestão Financeira
          </div>
        </div>
      `;

    case 'cliente_cadastrado':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>🎉 Bem-vindo ao Sistema WMS!</h2>
          </div>
          <div class="content">
            <h3>Olá, ${data.nome}!</h3>
            <p>Seja bem-vindo ao nosso Sistema de Gestão de Armazém (WMS)!</p>
            <p>Sua conta foi criada com sucesso. Aqui estão seus dados de acesso:</p>
            <div class="highlight">
              <strong>Email:</strong> ${data.email}<br>
              ${data.senha ? `<strong>Senha Temporária:</strong> ${data.senha}<br>` : ''}
              <strong>Status:</strong> Ativo
            </div>
            <p>Com nosso sistema você poderá:</p>
            <ul>
              <li>Acompanhar suas notas fiscais</li>
              <li>Solicitar carregamentos</li>
              <li>Visualizar documentos financeiros</li>
              <li>Receber notificações em tempo real</li>
            </ul>
            ${!data.senha ? '<p>Para criar sua senha de acesso, use a opção "Esqueci minha senha" na tela de login.</p>' : ''}
            <p>Recomendamos alterar sua senha no primeiro acesso por questões de segurança.</p>
          </div>
          <div class="footer">
            Sistema WMS - Gestão de Armazém<br>
            Suporte: contato@wms.com.br
          </div>
        </div>
      `;

    case 'embarque_confirmado':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>🚚 Embarque Confirmado</h2>
          </div>
          <div class="content">
            <h3>Prezado(a) ${data.nome},</h3>
            <p>Temos uma ótima notícia! Seu pedido foi embarcado:</p>
            <div class="highlight">
              <strong>Número do Documento:</strong> ${data.numeroDocumento}<br>
              <strong>Status:</strong> Embarcado<br>
              <strong>Data de Embarque:</strong> ${new Date().toLocaleDateString('pt-BR')}
            </div>
            <p>Sua mercadoria está em transporte. Você receberá uma nova notificação quando a entrega for confirmada.</p>
          </div>
          <div class="footer">
            Sistema WMS - Gestão de Armazém
          </div>
        </div>
      `;

    case 'entrega_confirmada':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>✅ Entrega Confirmada</h2>
          </div>
          <div class="content">
            <h3>Parabéns, ${data.nome}!</h3>
            <p>Sua mercadoria foi entregue com sucesso:</p>
            <div class="highlight">
              <strong>Número do Documento:</strong> ${data.numeroDocumento}<br>
              <strong>Status:</strong> Entregue<br>
              <strong>Data de Entrega:</strong> ${new Date().toLocaleDateString('pt-BR')}
            </div>
            <p>Obrigado por confiar em nossos serviços. Caso tenha alguma dúvida ou feedback, entre em contato conosco.</p>
          </div>
          <div class="footer">
            Sistema WMS - Gestão de Armazém<br>
            Agradecemos sua preferência!
          </div>
        </div>
      `;

    default:
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h2>Notificação do Sistema</h2>
          </div>
          <div class="content">
            <h3>Olá, ${data.nome || 'Cliente'}!</h3>
            <p>Você recebeu uma nova notificação do sistema.</p>
            <p>Para mais detalhes, acesse nossa plataforma.</p>
          </div>
          <div class="footer">
            Sistema WMS
          </div>
        </div>
      `;
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("📧 Email notification function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: NotificationEmailRequest = await req.json();

    console.log("📧 Sending email:", { to, subject, type });

    // Validate required fields
    if (!to || !subject || !type || !data) {
      throw new Error("Missing required fields: to, subject, type, data");
    }

    // Generate HTML content based on notification type
    const htmlContent = getEmailTemplate(type, data);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Sistema WMS <noreply@resend.dev>", // Change this to your verified domain
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      messageId: emailResponse.data?.id,
      message: "Email enviado com sucesso"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in send-notification-email function:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);