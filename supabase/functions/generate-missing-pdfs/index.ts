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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    console.log('[GENERATE_MISSING_PDFS] Iniciando processamento');
    
    // Buscar certificados sem documento_url
    const { data: certificadosSemPdf, error: fetchError } = await supabase
      .from('certificados')
      .select('id, credenciado_id, numero_certificado')
      .is('documento_url', null)
      .eq('status', 'ativo')
      .limit(50); // Processar em lotes de 50
    
    if (fetchError) {
      console.error('[GENERATE_MISSING_PDFS] Erro ao buscar certificados:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar certificados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!certificadosSemPdf || certificadosSemPdf.length === 0) {
      console.log('[GENERATE_MISSING_PDFS] Nenhum certificado sem PDF encontrado');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum certificado sem PDF encontrado',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[GENERATE_MISSING_PDFS] Encontrados ${certificadosSemPdf.length} certificados sem PDF`);
    
    const results = {
      total: certificadosSemPdf.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };
    
    // Processar cada certificado
    for (const cert of certificadosSemPdf) {
      try {
        console.log(`[GENERATE_MISSING_PDFS] Gerando PDF para certificado ${cert.numero_certificado}`);
        
        // Chamar edge function de geração de certificado
        const { data: result, error: gerarError } = await supabase.functions.invoke(
          'gerar-certificado-credenciamento',
          {
            body: { credenciado_id: cert.credenciado_id }
          }
        );
        
        if (gerarError) {
          console.error(`[GENERATE_MISSING_PDFS] Erro ao gerar certificado ${cert.numero_certificado}:`, gerarError);
          results.failed++;
          results.errors.push({
            certificado_id: cert.id,
            numero: cert.numero_certificado,
            error: gerarError.message
          });
          continue;
        }
        
        console.log(`[GENERATE_MISSING_PDFS] ✅ PDF gerado com sucesso para ${cert.numero_certificado}`);
        results.success++;
        
      } catch (error) {
        console.error(`[GENERATE_MISSING_PDFS] Erro ao processar certificado ${cert.numero_certificado}:`, error);
        results.failed++;
        results.errors.push({
          certificado_id: cert.id,
          numero: cert.numero_certificado,
          error: (error as Error).message
        });
      }
    }
    
    console.log('[GENERATE_MISSING_PDFS] Processamento concluído:', results);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processamento concluído: ${results.success} sucesso, ${results.failed} falhas`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[GENERATE_MISSING_PDFS] Erro:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
