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
    
    console.log('[AUTO_PDF] Iniciando busca de certificados de regularidade sem PDF...');
    
    // Buscar certificados de regularidade SEM url_pdf
    const { data: certsSemPdf, error: certsError } = await supabase
      .from('certificados_regularidade')
      .select('id, numero_certificado, credenciado_id, status')
      .is('url_pdf', null)
      .eq('ativo', true)
      .eq('cancelado', false)
      .limit(10); // Processar no máximo 10 por execução
    
    if (certsError) {
      console.error('[AUTO_PDF] Erro ao buscar certificados:', certsError);
      throw certsError;
    }
    
    console.log('[AUTO_PDF] Encontrados', certsSemPdf?.length || 0, 'certificados sem PDF');
    
    const results = {
      total: certsSemPdf?.length || 0,
      processados: 0,
      erros: [] as any[],
      sucesso: [] as any[]
    };
    
    // Processar cada certificado
    if (certsSemPdf && certsSemPdf.length > 0) {
      for (const cert of certsSemPdf) {
        try {
          console.log('[AUTO_PDF] Processando certificado:', cert.numero_certificado);
          
          // Chamar edge function de geração de PDF
          const { data, error } = await supabase.functions.invoke('gerar-certificado-regularidade', {
            body: {
              certificadoId: cert.id
            }
          });
          
          if (error) {
            console.error('[AUTO_PDF] Erro ao gerar PDF:', error);
            results.erros.push({
              certificado_id: cert.id,
              numero: cert.numero_certificado,
              erro: error.message
            });
          } else {
            console.log('[AUTO_PDF] PDF gerado com sucesso:', cert.numero_certificado);
            results.sucesso.push({
              certificado_id: cert.id,
              numero: cert.numero_certificado,
              url_pdf: data?.url_pdf
            });
            results.processados++;
          }
          
          // Aguardar 500ms entre cada certificado para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error('[AUTO_PDF] Erro inesperado:', err);
          results.erros.push({
            certificado_id: cert.id,
            numero: cert.numero_certificado,
            erro: (err as Error).message
          });
        }
      }
    }
    
    console.log('[AUTO_PDF] Processamento concluído:', results);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${results.processados} de ${results.total} certificados`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('[AUTO_PDF] Erro geral:', error);
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
