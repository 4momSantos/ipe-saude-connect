import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[BACKFILL] Iniciando geração de PDFs...');

    // Buscar certificados sem url_pdf
    const { data: certificados, error: fetchError } = await supabase
      .from('certificados_regularidade')
      .select('id, numero_certificado')
      .is('url_pdf', null)
      .eq('ativo', true)
      .eq('cancelado', false);

    if (fetchError) throw fetchError;

    console.log(`[BACKFILL] Encontrados ${certificados?.length || 0} certificados sem PDF`);

    const resultados = [];

    for (const cert of certificados || []) {
      console.log(`[BACKFILL] Processando ${cert.numero_certificado}...`);
      
      try {
        const { data, error } = await supabase.functions.invoke('gerar-pdf-certificado', {
          body: { certificadoId: cert.id }
        });

        if (error) {
          console.error(`[BACKFILL] Erro em ${cert.numero_certificado}:`, error);
          resultados.push({ 
            certificado: cert.numero_certificado, 
            sucesso: false, 
            erro: error.message 
          });
        } else {
          console.log(`[BACKFILL] ✅ ${cert.numero_certificado} concluído`);
          resultados.push({ 
            certificado: cert.numero_certificado, 
            sucesso: true, 
            url: data.url_pdf 
          });
        }
      } catch (err: any) {
        console.error(`[BACKFILL] Erro em ${cert.numero_certificado}:`, err);
        resultados.push({ 
          certificado: cert.numero_certificado, 
          sucesso: false, 
          erro: err.message 
        });
      }
    }

    const sucesso = resultados.filter(r => r.sucesso).length;
    const falhas = resultados.filter(r => !r.sucesso).length;

    console.log(`[BACKFILL] Finalizado: ${sucesso} sucessos, ${falhas} falhas`);

    return new Response(
      JSON.stringify({ 
        total: certificados?.length || 0,
        sucesso,
        falhas,
        resultados 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[BACKFILL] ❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
