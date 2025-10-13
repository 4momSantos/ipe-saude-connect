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
    
    // Buscar dados do certificado
    const { data: cert, error: certError } = await supabase
      .from('certificados')
      .select('documento_url, numero_certificado')
      .eq('id', certificadoId)
      .single();
    
    if (certError || !cert) {
      console.error('[DOWNLOAD_CERTIFICADO] Erro ao buscar certificado:', certError);
      return new Response(
        JSON.stringify({ error: 'Certificado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!cert.documento_url) {
      console.error('[DOWNLOAD_CERTIFICADO] Certificado sem documento_url');
      return new Response(
        JSON.stringify({ error: 'PDF não disponível para este certificado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extrair path do arquivo (formato: https://....supabase.co/storage/v1/object/public/certificados/PATH)
    const urlParts = cert.documento_url.split('/certificados/');
    if (urlParts.length < 2) {
      console.error('[DOWNLOAD_CERTIFICADO] URL inválida:', cert.documento_url);
      return new Response(
        JSON.stringify({ error: 'URL do certificado inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const path = urlParts[1];
    console.log('[DOWNLOAD_CERTIFICADO] Baixando PDF do storage:', path);
    
    // Baixar PDF do storage
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
    
    console.log('[DOWNLOAD_CERTIFICADO] Download concluído, retornando PDF');
    
    // Retornar PDF diretamente
    return new Response(pdfData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cert.numero_certificado}.pdf"`
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
