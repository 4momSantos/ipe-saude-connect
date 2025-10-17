import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificacaoRequest {
  credenciado_id: string;
  candidato_nome: string;
  candidato_email: string;
  numero_credenciado: string;
  tipo_credenciamento: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      candidato_nome, 
      candidato_email, 
      numero_credenciado,
      tipo_credenciamento 
    }: NotificacaoRequest = await req.json();

    console.log(`[EMAIL] Enviando notificação para ${candidato_email}`);

    const tipoTexto = tipo_credenciamento === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física';

    const emailResponse = await resend.emails.send({
      from: "IPE Saúde <onboarding@resend.dev>",
      to: [candidato_email],
      subject: "🎉 Seu Credenciamento foi Ativado!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
            .info-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: 600; color: #6b7280; }
            .info-value { color: #1f2937; font-weight: 500; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Parabéns!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Seu credenciamento foi ativado com sucesso</p>
            </div>
            
            <div class="content">
              <p>Olá <strong>${candidato_nome}</strong>,</p>
              
              <p>É com grande satisfação que informamos que seu credenciamento junto ao IPE Saúde foi <strong>ativado com sucesso</strong>!</p>
              
              <div class="badge">✅ CREDENCIAMENTO ATIVO</div>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Informações do Credenciamento</h3>
                <div class="info-item">
                  <span class="info-label">Número do Credenciado:</span>
                  <span class="info-value">${numero_credenciado}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Tipo de Credenciamento:</span>
                  <span class="info-value">${tipoTexto}</span>
                </div>
                <div class="info-item" style="border-bottom: none;">
                  <span class="info-label">Status:</span>
                  <span class="info-value" style="color: #10b981;">● Ativo</span>
                </div>
              </div>
              
              <h3>📋 Próximos Passos</h3>
              <ul style="line-height: 2;">
                <li>Acesse seu painel de credenciado</li>
                <li>Complete seu perfil com informações adicionais</li>
                <li>Configure seus horários de atendimento</li>
                <li>Mantenha seus documentos atualizados</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${Deno.env.get('VITE_APP_URL') || 'https://seu-sistema.com'}/credenciado/painel" class="button">
                  Acessar Painel
                </a>
              </div>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                <strong>Importante:</strong> Mantenha seus dados cadastrais sempre atualizados e seus documentos válidos para garantir a continuidade do seu credenciamento.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>IPE Saúde - Instituto de Previdência do Estado</strong></p>
              <p style="margin: 5px 0;">Sistema de Credenciamento de Prestadores</p>
              <p style="font-size: 12px; color: #9ca3af;">
                Este é um e-mail automático. Por favor, não responda.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[EMAIL] ✅ Email enviado com sucesso:`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[EMAIL] ❌ Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
