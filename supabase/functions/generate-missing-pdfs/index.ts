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
    
    console.log('[GENERATE_MISSING_PDFS] Iniciando busca de certificados sem PDF...');
    
    // Buscar certificados SEM documento_url na tabela antiga
    const { data: certsSemPdf, error: certsError } = await supabase
      .from('certificados')
      .select('id, numero_certificado, credenciado_id, status')
      .is('documento_url', null)
      .eq('status', 'ativo');
    
    if (certsError) {
      console.error('[GENERATE_MISSING_PDFS] Erro ao buscar certificados:', certsError);
      throw certsError;
    }
    
    console.log('[GENERATE_MISSING_PDFS] Encontrados', certsSemPdf?.length || 0, 'certificados sem PDF');
    
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
          console.log('[GENERATE_MISSING_PDFS] Processando certificado:', cert.numero_certificado);
          
          // Chamar edge function gerar-certificado
          const { data, error } = await supabase.functions.invoke('gerar-certificado', {
            body: {
              credenciadoId: cert.credenciado_id,
              force_new: false // Vai atualizar o certificado existente
            }
          });
          
          if (error) {
            console.error('[GENERATE_MISSING_PDFS] Erro ao gerar PDF:', error);
            results.erros.push({
              certificado_id: cert.id,
              numero: cert.numero_certificado,
              erro: error.message
            });
          } else {
            console.log('[GENERATE_MISSING_PDFS] PDF gerado com sucesso:', cert.numero_certificado);
            results.sucesso.push({
              certificado_id: cert.id,
              numero: cert.numero_certificado,
              documento_url: data?.certificado?.documento_url
            });
            results.processados++;
          }
        } catch (err) {
          console.error('[GENERATE_MISSING_PDFS] Erro inesperado:', err);
          results.erros.push({
            certificado_id: cert.id,
            numero: cert.numero_certificado,
            erro: (err as Error).message
          });
        }
      }
    }
    
    console.log('[GENERATE_MISSING_PDFS] Processamento concluído:', results);
    
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
    console.error('[GENERATE_MISSING_PDFS] Erro geral:', error);
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
