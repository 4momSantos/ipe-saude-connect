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
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

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
 * Converte dados do certificado em PDF usando pdf-lib (HOTFIX #1)
 * Substituiu API externa não confiável por biblioteca local
 */
async function gerarPDFCertificado(data: CertificadoData, qrCodeUrl: string): Promise<Uint8Array> {
  console.log('[PDF] Iniciando geração com pdf-lib');
  
  // Baixar QR Code
  const qrResponse = await fetch(qrCodeUrl);
  if (!qrResponse.ok) {
    throw new Error(`Erro ao baixar QR Code: ${qrResponse.statusText}`);
  }
  const qrArrayBuffer = await qrResponse.arrayBuffer();
  
  // Criar documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 60;
  const blue = rgb(0.2, 0.47, 0.85);
  const gray = rgb(0.17, 0.24, 0.31);
  
  // Borda decorativa
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin,
    borderColor: blue,
    borderWidth: 3,
  });
  
  // Título
  let y = height - 100;
  page.drawText('CERTIFICADO DE CREDENCIAMENTO', {
    x: width / 2 - 180,
    y,
    size: 20,
    font: fontBold,
    color: blue,
  });
  
  // Linha
  y -= 15;
  page.drawLine({
    start: { x: margin + 40, y },
    end: { x: width - margin - 40, y },
    thickness: 2,
    color: blue,
  });
  
  // Conteúdo
  y -= 50;
  page.drawText('Certificamos que:', {
    x: width / 2 - 70,
    y,
    size: 14,
    font: font,
    color: gray,
  });
  
  y -= 40;
  page.drawText(data.credenciado_nome, {
    x: width / 2 - (data.credenciado_nome.length * 4),
    y,
    size: 18,
    font: fontBold,
    color: gray,
  });
  
  y -= 30;
  page.drawText(`CPF: ${data.credenciado_cpf}`, {
    x: width / 2 - 60,
    y,
    size: 12,
    font: font,
    color: gray,
  });
  
  y -= 30;
  page.drawText('Especialidade(s):', {
    x: width / 2 - 60,
    y,
    size: 12,
    font: font,
    color: gray,
  });
  
  y -= 20;
  const especialidadesText = data.especialidades.join(', ');
  page.drawText(especialidadesText, {
    x: width / 2 - (especialidadesText.length * 2.5),
    y,
    size: 11,
    font: fontBold,
    color: gray,
  });
  
  y -= 30;
  page.drawText('Está devidamente credenciado(a) junto à nossa instituição,', {
    x: width / 2 - 200,
    y,
    size: 11,
    font: font,
    color: gray,
  });
  
  y -= 15;
  page.drawText('com todos os requisitos necessários atendidos.', {
    x: width / 2 - 170,
    y,
    size: 11,
    font: font,
    color: gray,
  });
  
  // Datas
  y -= 40;
  const emitidoEm = new Date(data.data_emissao).toLocaleDateString('pt-BR');
  const validoAte = new Date(data.valido_ate).toLocaleDateString('pt-BR');
  
  page.drawText(`Emitido em: ${emitidoEm}`, {
    x: margin + 40,
    y,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  page.drawText(`Válido até: ${validoAte}`, {
    x: width - margin - 140,
    y,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  // QR Code
  const qrImage = await pdfDoc.embedPng(qrArrayBuffer);
  const qrSize = 100;
  page.drawImage(qrImage, {
    x: width - margin - qrSize - 20,
    y: margin + 100,
    width: qrSize,
    height: qrSize,
  });
  
  page.drawText('Verificar autenticidade', {
    x: width - margin - qrSize - 5,
    y: margin + 90,
    size: 8,
    font: font,
    color: gray,
  });
  
  // Número do certificado
  page.drawText(`Nº ${data.numero_certificado}`, {
    x: width / 2 - 70,
    y: margin + 20,
    size: 11,
    font: fontBold,
    color: blue,
  });
  
  const pdfBytes = await pdfDoc.save();
  console.log('[PDF] PDF gerado com sucesso, tamanho:', pdfBytes.length);
  
  return new Uint8Array(pdfBytes);
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

    // Gerar PDF usando pdf-lib (HOTFIX #1)
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'generating_pdf',
      method: 'pdf-lib'
    }));

    const pdfBytes = await gerarPDFCertificado(certificadoData, qrCodeUrl);

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
