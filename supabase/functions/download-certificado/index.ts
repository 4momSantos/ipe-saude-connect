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
    
    // Tentar primeiro na tabela antiga (certificados)
    const { data: certAntigo, error: certAntigoError } = await supabase
      .from('certificados')
      .select('documento_url, numero_certificado')
      .eq('id', certificadoId)
      .maybeSingle();
    
    if (certAntigo && certAntigo.documento_url) {
      console.log('[DOWNLOAD_CERTIFICADO] Certificado encontrado na tabela antiga');
      
      // Extrair path do arquivo
      const urlParts = certAntigo.documento_url.split('/certificados/');
      if (urlParts.length < 2) {
        console.error('[DOWNLOAD_CERTIFICADO] URL inválida:', certAntigo.documento_url);
        return new Response(
          JSON.stringify({ error: 'URL do certificado inválida' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const path = urlParts[1];
      console.log('[DOWNLOAD_CERTIFICADO] Baixando PDF do storage (certificados):', path);
      
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
      
      console.log('[DOWNLOAD_CERTIFICADO] Download concluído (tabela antiga)');
      
      return new Response(pdfData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${certAntigo.numero_certificado}.pdf"`,
          'Content-Length': pdfData.size.toString()
        }
      });
    }
    
    // Se não encontrou na tabela antiga, buscar na nova (certificados_regularidade)
    const { data: cert, error: certError } = await supabase
      .from('certificados_regularidade')
      .select('url_pdf, numero_certificado')
      .eq('id', certificadoId)
      .maybeSingle();
    
    if (!cert) {
      console.error('[DOWNLOAD_CERTIFICADO] Certificado não encontrado em nenhuma tabela');
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
    console.log('[DOWNLOAD_CERTIFICADO] Baixando PDF do storage (certificados-regularidade):', path);
    
    // Baixar PDF do storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('certificados-regularidade')
      .download(path);
    
    if (downloadError || !pdfData) {
      console.error('[DOWNLOAD_CERTIFICADO] Erro ao baixar PDF:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao baixar PDF do storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[DOWNLOAD_CERTIFICADO] Download concluído (tabela nova)');
    
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
