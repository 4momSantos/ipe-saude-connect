import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[REGENERATE] Buscando certificados sem PDF...');

    // Buscar certificados ativos sem documento_url
    const { data: certificadosSemPdf, error: fetchError } = await supabaseClient
      .from('certificados')
      .select(`
        id,
        credenciado_id,
        numero_certificado,
        credenciado:credenciados!inner(
          id,
          nome,
          cpf,
          cnpj
        )
      `)
      .eq('status', 'ativo')
      .is('documento_url', null)
      .limit(50);

    if (fetchError) {
      console.error('[REGENERATE] Erro ao buscar certificados:', fetchError);
      throw fetchError;
    }

    if (!certificadosSemPdf || certificadosSemPdf.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum certificado sem PDF encontrado',
          regenerated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REGENERATE] ${certificadosSemPdf.length} certificados sem PDF encontrados`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Processar cada certificado
    for (const cert of certificadosSemPdf) {
      try {
        console.log(`[REGENERATE] Gerando PDF para certificado ${cert.numero_certificado}...`);

        // Chamar edge function gerar-certificado
        const { data: result, error: genError } = await supabaseClient.functions.invoke(
          'gerar-certificado',
          {
            body: { credenciadoId: cert.credenciado_id }
          }
        );

        if (genError) {
          console.error(`[REGENERATE] Erro ao gerar certificado ${cert.numero_certificado}:`, genError);
          errorCount++;
          results.push({
            numero_certificado: cert.numero_certificado,
            success: false,
            error: genError.message
          });
        } else {
          console.log(`[REGENERATE] Certificado ${cert.numero_certificado} gerado com sucesso`);
          successCount++;
          results.push({
            numero_certificado: cert.numero_certificado,
            success: true,
            documento_url: result?.certificado?.documento_url
          });
        }

        // Aguardar 1s entre cada geração para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[REGENERATE] Erro inesperado no certificado ${cert.numero_certificado}:`, error);
        errorCount++;
        results.push({
          numero_certificado: cert.numero_certificado,
          success: false,
          error: errorMessage
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Regeneração concluída: ${successCount} sucessos, ${errorCount} erros`,
        regenerated: successCount,
        failed: errorCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[REGENERATE] Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
