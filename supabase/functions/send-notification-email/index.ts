import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'cliente_cadastrado' | 'transportadora_cadastrada' | 'boleto_cadastrado' | 'nf_cadastrada' | 'solicitacao_carregamento' | 'confirmacao_autorizada';
  data: {
    nome: string;
    email: string;
    senha?: string;
    numeroDocumento?: string;
    transportadora?: string;
    cliente?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    console.log('Enviando email:', { to, subject, type });

    let htmlContent = '';

    switch (type) {
      case 'cliente_cadastrado':
        htmlContent = `
          <h1>Bem-vindo ao Sistema WMS!</h1>
          <p>Olá <strong>${data.nome}</strong>,</p>
          <p>Seu cadastro como cliente foi realizado com sucesso!</p>
          <p><strong>Dados de acesso:</strong></p>
          <ul>
            <li>Email: ${data.email}</li>
            ${data.senha ? `<li>Senha temporária: <strong>${data.senha}</strong></li>` : '<li>Use a funcionalidade "Esqueci minha senha" para criar sua senha</li>'}
          </ul>
          <p>Acesse o sistema através do link: <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app')}/cliente">Portal do Cliente</a></p>
          <p>Atenciosamente,<br>Equipe WMS</p>
        `;
        break;

      case 'transportadora_cadastrada':
        htmlContent = `
          <h1>Bem-vindo ao Sistema WMS!</h1>
          <p>Olá <strong>${data.nome}</strong>,</p>
          <p>Sua transportadora foi cadastrada com sucesso no sistema!</p>
          <p><strong>Dados de acesso:</strong></p>
          <ul>
            <li>Email: ${data.email}</li>
            ${data.senha ? `<li>Senha temporária: <strong>${data.senha}</strong></li>` : '<li>Use a funcionalidade "Esqueci minha senha" para criar sua senha</li>'}
          </ul>
          <p>Acesse o sistema através do link: <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app')}/transportadora">Portal da Transportadora</a></p>
          <p>Atenciosamente,<br>Equipe WMS</p>
        `;
        break;

      case 'boleto_cadastrado':
        htmlContent = `
          <h1>Novo Boleto Cadastrado</h1>
          <p>Olá <strong>${data.nome}</strong>,</p>
          <p>Foi cadastrado um novo boleto no sistema:</p>
          <ul>
            <li>Número do CTE: <strong>${data.numeroDocumento}</strong></li>
            <li>Cliente: ${data.cliente}</li>
          </ul>
          <p>Acesse o sistema para visualizar os detalhes.</p>
          <p>Atenciosamente,<br>Equipe WMS</p>
        `;
        break;

      case 'nf_cadastrada':
        htmlContent = `
          <h1>Nova Nota Fiscal Cadastrada</h1>
          <p>Olá <strong>${data.nome}</strong>,</p>
          <p>A Nota Fiscal <strong>${data.numeroDocumento}</strong> foi cadastrada em nome de ${data.cliente}.</p>
          <p>Acesse o sistema para visualizar os detalhes.</p>
          <p>Atenciosamente,<br>Equipe WMS</p>
        `;
        break;

      case 'solicitacao_carregamento':
        htmlContent = `
          <h1>Ordem de Carregamento</h1>
          <p>Olá <strong>${data.nome}</strong>,</p>
          <p>Foi solicitada a ordem de carregamento do pedido <strong>${data.numeroDocumento}</strong> para ${data.cliente}.</p>
          <p>Acesse o sistema para visualizar os detalhes.</p>
          <p>Atenciosamente,<br>Equipe WMS</p>
        `;
        break;

      case 'confirmacao_autorizada':
        htmlContent = `
          <h1>Pedido Confirmado</h1>
          <p>Olá <strong>${data.nome}</strong>,</p>
          <p>O pedido <strong>${data.numeroDocumento}</strong> foi confirmado para a transportadora ${data.transportadora}.</p>
          <p>Acesse o sistema para visualizar os detalhes.</p>
          <p>Atenciosamente,<br>Equipe WMS</p>
        `;
        break;

      default:
        throw new Error('Tipo de email não reconhecido');
    }

    const emailResponse = await resend.emails.send({
      from: "Sistema WMS <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);