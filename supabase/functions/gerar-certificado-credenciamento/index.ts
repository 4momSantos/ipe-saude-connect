/**
 * Edge Function: gerar-certificado-credenciamento
 * Gera certificado PDF, salva em Storage, registra no banco e envia por e-mail
 * 
 * Stack:
 * - PDF gerado via HTML template
 * - QR code de validação
 * - Supabase Storage para armazenamento
 * - Resend para envio de e-mail
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GerarCertificadoRequest {
  credenciado_id: string;
}

interface CertificadoData {
  numero_certificado: string;
  credenciado_nome: string;
  credenciado_cpf: string;
  credenciado_email: string;
  especialidades: string[];
  edital_titulo?: string;
  data_emissao: string;
  valido_ate: string;
}

/**
 * Gera HTML do certificado
 */
function gerarCertificadoHTML(data: CertificadoData, qrCodeUrl: string): string {
  const especialidadesLista = data.especialidades
    .map(esp => `<li>${esp}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Certificado de Credenciamento</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: 'Georgia', serif;
      margin: 0;
      padding: 60px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    .certificado {
      background: white;
      padding: 60px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
      border: 8px solid #2c3e50;
      position: relative;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3498db;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 42px;
      color: #2c3e50;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .header h2 {
      font-size: 24px;
      color: #3498db;
      margin: 0;
      font-weight: normal;
    }
    .conteudo {
      text-align: center;
      padding: 40px 20px;
      line-height: 1.8;
    }
    .conteudo p {
      font-size: 18px;
      color: #555;
      margin: 20px 0;
    }
    .nome-credenciado {
      font-size: 32px;
      color: #2c3e50;
      font-weight: bold;
      margin: 30px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .especialidades {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 10px;
      margin: 30px 0;
    }
    .especialidades h3 {
      color: #2c3e50;
      margin: 0 0 15px 0;
      font-size: 20px;
    }
    .especialidades ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .especialidades li {
      padding: 8px 0;
      color: #555;
      font-size: 16px;
      border-bottom: 1px solid #bdc3c7;
    }
    .especialidades li:last-child {
      border-bottom: none;
    }
    .dados-certificado {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #3498db;
    }
    .dados-item {
      text-align: left;
    }
    .dados-item strong {
      display: block;
      color: #2c3e50;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .dados-item span {
      color: #7f8c8d;
      font-size: 14px;
    }
    .qr-code {
      text-align: center;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #ecf0f1;
    }
    .qr-code img {
      width: 120px;
      height: 120px;
      border: 2px solid #2c3e50;
      border-radius: 10px;
    }
    .qr-code p {
      font-size: 12px;
      color: #95a5a6;
      margin-top: 10px;
    }
    .rodape {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
      font-size: 12px;
      color: #95a5a6;
    }
    .assinatura {
      margin-top: 60px;
      text-align: center;
    }
    .linha-assinatura {
      border-top: 2px solid #2c3e50;
      width: 300px;
      margin: 0 auto;
    }
    .assinatura p {
      margin-top: 10px;
      font-size: 14px;
      color: #555;
    }
    .selo {
      position: absolute;
      top: 40px;
      right: 40px;
      width: 100px;
      height: 100px;
      border: 4px solid #3498db;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      font-size: 12px;
      color: #3498db;
      font-weight: bold;
      text-align: center;
      padding: 10px;
    }
  </style>
</head>
<body>
  <div class="certificado">
    <div class="selo">
      CERTIFICADO<br>OFICIAL
    </div>
    
    <div class="header">
      <h1>Certificado de Credenciamento</h1>
      <h2>Prestador de Serviços de Saúde</h2>
    </div>

    <div class="conteudo">
      <p>Certificamos que</p>
      
      <div class="nome-credenciado">
        ${data.credenciado_nome}
      </div>

      <p>
        inscrito(a) sob o CPF <strong>${data.credenciado_cpf}</strong>,
        foi devidamente credenciado(a) para prestação de serviços de saúde
        ${data.edital_titulo ? `conforme ${data.edital_titulo}` : ''}
      </p>

      <div class="especialidades">
        <h3>Especialidades Credenciadas:</h3>
        <ul>
          ${especialidadesLista}
        </ul>
      </div>

      <p>
        Este certificado é válido por <strong>24 meses</strong> a partir da data de emissão,
        podendo ser renovado mediante cumprimento dos requisitos estabelecidos.
      </p>
    </div>

    <div class="dados-certificado">
      <div class="dados-item">
        <strong>Número do Certificado:</strong>
        <span>${data.numero_certificado}</span>
      </div>
      <div class="dados-item">
        <strong>Data de Emissão:</strong>
        <span>${new Date(data.data_emissao).toLocaleDateString('pt-BR')}</span>
      </div>
      <div class="dados-item">
        <strong>Validade:</strong>
        <span>${new Date(data.valido_ate).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>

    <div class="qr-code">
      <img src="${qrCodeUrl}" alt="QR Code de Validação" />
      <p>Escaneie para validar a autenticidade deste certificado</p>
    </div>

    <div class="assinatura">
      <div class="linha-assinatura"></div>
      <p><strong>Autoridade Certificadora</strong></p>
      <p>Sistema de Credenciamento</p>
    </div>

    <div class="rodape">
      <p>
        Este documento é válido e pode ser verificado através do código QR acima.<br>
        Emitido eletronicamente em ${new Date(data.data_emissao).toLocaleString('pt-BR')}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Gera QR Code usando API pública
 */
function gerarQRCodeURL(numeroCertificado: string, supabaseUrl: string): string {
  const validationUrl = `${supabaseUrl}/verificar-certificado/${numeroCertificado}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(validationUrl)}`;
}

/**
 * Converte HTML em PDF usando Puppeteer (ou alternativa leve)
 * Para esta implementação, vamos usar uma API externa temporariamente
 */
async function htmlToPDF(html: string): Promise<Uint8Array> {
  // Usando API pública para converter HTML em PDF
  // Em produção, considere usar Puppeteer ou biblioteca própria
  const response = await fetch('https://api.html2pdf.app/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao gerar PDF: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'function_start'
  }));

  try {
    const { credenciado_id }: GerarCertificadoRequest = await req.json();

    if (!credenciado_id) {
      throw new Error('credenciado_id é obrigatório');
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'processing_certificate',
      credenciado_id
    }));

    // Inicializar clientes
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Buscar dados do credenciado
    const { data: credenciado, error: credenciadoError } = await supabase
      .from('credenciados')
      .select(`
        id,
        nome,
        cpf,
        email,
        inscricao_id,
        inscricoes_edital (
          edital_id,
          editais (
            titulo,
            numero_edital
          )
        )
      `)
      .eq('id', credenciado_id)
      .single();

    if (credenciadoError || !credenciado) {
      throw new Error(`Credenciado não encontrado: ${credenciadoError?.message}`);
    }

    // Buscar especialidades
    const { data: crms } = await supabase
      .from('credenciado_crms')
      .select('especialidade')
      .eq('credenciado_id', credenciado_id);

    const especialidades = crms?.map(crm => crm.especialidade) || ['Não especificada'];

    // Gerar número único do certificado
    const numeroCertificado = `CERT-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    const dataEmissao = new Date();
    const validoAte = new Date();
    validoAte.setFullYear(validoAte.getFullYear() + 2); // Válido por 2 anos

    const certificadoData: CertificadoData = {
      numero_certificado: numeroCertificado,
      credenciado_nome: credenciado.nome,
      credenciado_cpf: credenciado.cpf || 'Não informado',
      credenciado_email: credenciado.email || '',
      especialidades,
      edital_titulo: (credenciado.inscricoes_edital as any)?.editais?.titulo,
      data_emissao: dataEmissao.toISOString(),
      valido_ate: validoAte.toISOString()
    };

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'certificate_data_prepared',
      numero_certificado: numeroCertificado
    }));

    // Gerar QR Code
    const qrCodeUrl = gerarQRCodeURL(numeroCertificado, supabaseUrl);

    // Gerar HTML
    const certificadoHTML = gerarCertificadoHTML(certificadoData, qrCodeUrl);

    // Converter HTML para PDF
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'generating_pdf'
    }));

    const pdfBytes = await htmlToPDF(certificadoHTML);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'pdf_generated',
      size_bytes: pdfBytes.length
    }));

    // Salvar no Supabase Storage
    const fileName = `${numeroCertificado}.pdf`;
    const filePath = `certificados/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inscricao-documentos')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('inscricao-documentos')
      .getPublicUrl(filePath);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'file_uploaded',
      path: filePath
    }));

    // Criar registro no banco
    const { data: certificadoRecord, error: certificadoError } = await supabase
      .from('certificados')
      .insert({
        credenciado_id,
        numero_certificado: numeroCertificado,
        tipo: 'credenciamento',
        documento_url: urlData.publicUrl,
        dados_certificado: {
          nome: certificadoData.credenciado_nome,
          cpf: certificadoData.credenciado_cpf,
          especialidades: especialidades,
          edital: certificadoData.edital_titulo,
          html: certificadoHTML
        },
        valido_ate: validoAte.toISOString(),
        status: 'ativo'
      })
      .select()
      .single();

    if (certificadoError) {
      throw new Error(`Erro ao registrar certificado: ${certificadoError.message}`);
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'certificate_registered',
      certificado_id: certificadoRecord.id
    }));

    // Enviar e-mail (se Resend configurado)
    if (resend && certificadoData.credenciado_email) {
      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Credenciamento <onboarding@resend.dev>',
          to: [certificadoData.credenciado_email],
          subject: `Certificado de Credenciamento - ${numeroCertificado}`,
          html: `
            <h1>Certificado de Credenciamento Emitido</h1>
            <p>Olá, <strong>${certificadoData.credenciado_nome}</strong>!</p>
            <p>Seu certificado de credenciamento foi emitido com sucesso.</p>
            <p><strong>Número do Certificado:</strong> ${numeroCertificado}</p>
            <p><strong>Válido até:</strong> ${new Date(validoAte).toLocaleDateString('pt-BR')}</p>
            <p>Acesse o certificado através do link abaixo ou pelo anexo:</p>
            <p><a href="${urlData.publicUrl}">Visualizar Certificado</a></p>
            <br>
            <p>Atenciosamente,<br>Sistema de Credenciamento</p>
          `,
          attachments: [
            {
              filename: fileName,
              content: btoa(String.fromCharCode(...pdfBytes))
            }
          ]
        });

        if (emailError) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'email_error',
            error: emailError.message
          }));
        } else {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'email_sent',
            to: certificadoData.credenciado_email
          }));
        }
      } catch (emailErr) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'email_exception',
          error: (emailErr as Error).message
        }));
      }
    }

    const elapsedTime = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'function_complete',
      elapsed_ms: elapsedTime,
      certificado_id: certificadoRecord.id
    }));

    return new Response(
      JSON.stringify({
        success: true,
        certificado_id: certificadoRecord.id,
        numero_certificado: numeroCertificado,
        documento_url: urlData.publicUrl,
        valido_ate: validoAte.toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'function_error',
      error: error.message,
      stack: error.stack
    }));

    return new Response(
      JSON.stringify({
        error: error.message,
        message: 'Erro ao gerar certificado'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
