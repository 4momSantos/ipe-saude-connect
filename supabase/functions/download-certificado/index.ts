import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { certificadoId } = await req.json();
    
    if (!certificadoId) {
      return new Response(
        JSON.stringify({ error: 'certificadoId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    console.log('[DOWNLOAD_CERTIFICADO] Buscando certificado:', certificadoId);
    
    // CORREÇÃO: Buscar PRIMEIRO na tabela antiga (certificados)
    const { data: certAntigo, error: certAntigoError } = await supabase
      .from('certificados')
      .select('documento_url, numero_certificado')
      .eq('id', certificadoId)
      .maybeSingle();
    
    // Se encontrou na tabela antiga E tem documento_url
    if (certAntigo && certAntigo.documento_url) {
      console.log('[DOWNLOAD_CERTIFICADO] Certificado encontrado na tabela ANTIGA (certificados)');
      
      // Extrair path do arquivo (formato: .../certificados/...)
      const urlParts = certAntigo.documento_url.split('/certificados/');
      if (urlParts.length < 2) {
        console.error('[DOWNLOAD_CERTIFICADO] URL inválida:', certAntigo.documento_url);
        return new Response(
          JSON.stringify({ error: 'URL do certificado inválida' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const path = urlParts[1];
      console.log('[DOWNLOAD_CERTIFICADO] Baixando PDF do bucket ANTIGO:', path);
      
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('certificados')
        .download(path);
      
      if (downloadError || !pdfData) {
        console.error('[DOWNLOAD_CERTIFICADO] Erro ao baixar PDF:', downloadError);
        return new Response(
          JSON.stringify({ error: 'Erro ao baixar PDF do storage' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[DOWNLOAD_CERTIFICADO] Download concluído da tabela ANTIGA');
      
      return new Response(pdfData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${certAntigo.numero_certificado}.pdf"`,
          'Content-Length': pdfData.size.toString()
        }
      });
    }
    
    // Se NÃO encontrou na tabela antiga, buscar na NOVA (certificados_regularidade)
    console.log('[DOWNLOAD_CERTIFICADO] Não encontrado na tabela antiga, buscando na NOVA...');
    
    const { data: cert, error: certError } = await supabase
      .from('certificados_regularidade')
      .select('url_pdf, numero_certificado')
      .eq('id', certificadoId)
      .maybeSingle();
    
    if (certError || !cert) {
      console.error('[DOWNLOAD_CERTIFICADO] Certificado não encontrado em NENHUMA tabela');
      return new Response(
        JSON.stringify({ error: 'Certificado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!cert.url_pdf) {
      console.error('[DOWNLOAD_CERTIFICADO] Certificado sem url_pdf');
      return new Response(
        JSON.stringify({ error: 'PDF não disponível para este certificado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extrair path do arquivo (formato: https://....supabase.co/storage/v1/object/public/certificados-regularidade/PATH)
    const urlParts = cert.url_pdf.split('/certificados-regularidade/');
    if (urlParts.length < 2) {
      console.error('[DOWNLOAD_CERTIFICADO] URL inválida:', cert.url_pdf);
      return new Response(
        JSON.stringify({ error: 'URL do certificado inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const path = urlParts[1];
    console.log('[DOWNLOAD_CERTIFICADO] Baixando PDF do bucket NOVO (certificados-regularidade):', path);
    
    // Verificar se o arquivo existe primeiro
    const { data: fileCheck, error: checkError } = await supabase.storage
      .from('certificados-regularidade')
      .list('', { 
        limit: 1,
        search: path 
      });
    
    if (checkError || !fileCheck || fileCheck.length === 0) {
      console.error('[DOWNLOAD_CERTIFICADO] Arquivo não encontrado no storage:', path, checkError);
      return new Response(
        JSON.stringify({ 
          error: 'PDF não foi gerado ainda. Por favor, aguarde a geração do certificado.',
          missing_file: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Baixar PDF do storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('certificados-regularidade')
      .download(path);
    
    if (downloadError || !pdfData) {
      console.error('[DOWNLOAD_CERTIFICADO] Erro ao baixar PDF:', downloadError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao baixar PDF do storage. O arquivo pode ter sido removido.',
          storage_error: true 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[DOWNLOAD_CERTIFICADO] Download concluído da tabela NOVA');
    
    // Retornar PDF diretamente
    return new Response(pdfData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cert.numero_certificado}.pdf"`,
        'Content-Length': pdfData.size.toString()
      }
    });
    
  } catch (error) {
    console.error('[DOWNLOAD_CERTIFICADO] Erro:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
