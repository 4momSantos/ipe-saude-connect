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

    console.log('[GERAR_PDF] Gerando HTML do certificado:', certificado.numero_certificado);

    // Gerar HTML do certificado
    const credenciado = Array.isArray(certificado.credenciado) 
      ? certificado.credenciado[0] 
      : certificado.credenciado;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, sans-serif; }
        .header { text-align: center; margin-bottom: 40px; }
        .title { font-size: 24px; font-weight: bold; }
        .content { font-size: 14px; line-height: 1.6; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">CERTIFICADO DE REGULARIDADE</div>
      </div>
      <div class="content">
        <div class="field"><span class="label">Certificado Nº:</span> ${certificado.numero_certificado}</div>
        <div class="field"><span class="label">Nome:</span> ${credenciado?.nome || 'N/A'}</div>
        <div class="field"><span class="label">CPF/CNPJ:</span> ${credenciado?.cpf || credenciado?.cnpj || 'N/A'}</div>
        <div class="field"><span class="label">Status:</span> ${certificado.status}</div>
        <div class="field"><span class="label">Válido de:</span> ${new Date(certificado.valido_de).toLocaleDateString('pt-BR')}</div>
        <div class="field"><span class="label">Válido até:</span> ${new Date(certificado.valido_ate).toLocaleDateString('pt-BR')}</div>
        <div class="field"><span class="label">Código de Verificação:</span> ${certificado.codigo_verificacao}</div>
        <div class="field" style="margin-top: 40px;"><span class="label">Emitido em:</span> ${new Date(certificado.emitido_em).toLocaleString('pt-BR')}</div>
      </div>
    </body>
    </html>
    `;

    // Converter HTML para buffer
    const htmlBuffer = new TextEncoder().encode(htmlContent);
    const fileName = `certificado-${certificado.numero_certificado}.html`;

    console.log('[GERAR_PDF] Fazendo upload do certificado HTML:', fileName);

    // Upload para Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificados')
      .upload(fileName, htmlBuffer, {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('certificados')
      .getPublicUrl(fileName);

    console.log('[GERAR_PDF] Atualizando certificado com URL do PDF:', publicUrl);

    // Atualizar certificado com URL do certificado
    const { error: updateError } = await supabase
      .from('certificados_regularidade')
      .update({ 
        url_pdf: publicUrl,
        metadata_pdf: {
          gerado_em: new Date().toISOString(),
          tamanho_bytes: htmlBuffer.byteLength,
          formato: 'html'
        }
      })
      .eq('id', certificadoId);

    if (updateError) {
      throw updateError;
    }

    console.log('[GERAR_PDF] Certificado HTML gerado e salvo com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        certificado_id: certificadoId,
        url_pdf: publicUrl,
        numero_certificado: certificado.numero_certificado
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
