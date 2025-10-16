import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { certificadoId } = await req.json();
    
    if (!certificadoId) {
      throw new Error('certificadoId é obrigatório');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[GERAR_PDF] Buscando certificado:', certificadoId);

    // Buscar dados do certificado
    const { data: certificado, error: certError } = await supabase
      .from('certificados_regularidade')
      .select(`
        *,
        credenciado:credenciados(
          nome,
          cpf,
          cnpj,
          endereco,
          cidade,
          estado
        )
      `)
      .eq('id', certificadoId)
      .single();

    if (certError || !certificado) {
      throw new Error('Certificado não encontrado');
    }

    console.log('[GERAR_PDF] Gerando PDF usando biblioteca externa:', certificado.numero_certificado);

    const credenciado = Array.isArray(certificado.credenciado) 
      ? certificado.credenciado[0] 
      : certificado.credenciado;

    // Usar API externa para gerar PDF (Puppeteer Cloud ou similar)
    // Por enquanto, vamos usar uma solução temporária: salvar os dados e marcar como processado
    
    // Gerar HTML simples para PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .content {
      font-size: 16px;
      line-height: 1.8;
    }
    .field {
      margin: 15px 0;
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f3f4f6;
      border-radius: 5px;
    }
    .label {
      font-weight: bold;
      color: #374151;
    }
    .value {
      color: #1f2937;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 15px;
      font-weight: bold;
      background: #dcfce7;
      color: #166534;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">CERTIFICADO DE REGULARIDADE</div>
    <div style="color: #6b7280; font-size: 14px;">Documento de Autenticidade</div>
  </div>
  
  <div class="content">
    <div class="field">
      <span class="label">Certificado Nº:</span>
      <span class="value">${certificado.numero_certificado}</span>
    </div>
    
    <div class="field">
      <span class="label">Nome/Razão Social:</span>
      <span class="value">${credenciado?.nome || 'N/A'}</span>
    </div>
    
    <div class="field">
      <span class="label">CPF/CNPJ:</span>
      <span class="value">${credenciado?.cpf || credenciado?.cnpj || 'N/A'}</span>
    </div>
    
    <div class="field">
      <span class="label">Status:</span>
      <span class="value"><span class="status-badge">${certificado.status.toUpperCase()}</span></span>
    </div>
    
    <div class="field">
      <span class="label">Válido de:</span>
      <span class="value">${new Date(certificado.valido_de).toLocaleDateString('pt-BR')}</span>
    </div>
    
    <div class="field">
      <span class="label">Válido até:</span>
      <span class="value">${new Date(certificado.valido_ate).toLocaleDateString('pt-BR')}</span>
    </div>
    
    <div class="field">
      <span class="label">Código de Verificação:</span>
      <span class="value" style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${certificado.codigo_verificacao}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>Emitido em: ${new Date(certificado.emitido_em).toLocaleString('pt-BR')}</p>
    <p>Este certificado pode ser validado em nosso sistema de consulta pública</p>
  </div>
</body>
</html>`;

    // Converter HTML para PDF usando API externa (temporariamente usamos URL de dados)
    const pdfUrl = `data:text/html;base64,${btoa(unescape(encodeURIComponent(htmlContent)))}`;

    console.log('[GERAR_PDF] Atualizando certificado com URL temporária');

    // Atualizar certificado com URL (temporária até implementarmos geração real de PDF)
    const { error: updateError } = await supabase
      .from('certificados_regularidade')
      .update({ 
        url_pdf: pdfUrl,
        metadata_pdf: {
          gerado_em: new Date().toISOString(),
          formato: 'html_base64',
          temporario: true
        }
      })
      .eq('id', certificadoId);

    if (updateError) {
      throw updateError;
    }

    console.log('[GERAR_PDF] Certificado atualizado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        certificado_id: certificadoId,
        url_pdf: pdfUrl,
        numero_certificado: certificado.numero_certificado,
        message: 'PDF gerado temporariamente como HTML. Implementação completa de PDF em desenvolvimento.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[GERAR_PDF] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
