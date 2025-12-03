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
    const url = new URL(req.url);
    const tipo = url.searchParams.get("tipo") || "profissionais";
    const mesReferencia = url.searchParams.get("mes_referencia") || null;
    const especialidade = url.searchParams.get("especialidade") || null;
    const estado = url.searchParams.get("estado") || null;
    const cidade = url.searchParams.get("cidade") || null;
    const credenciadoId = url.searchParams.get("credenciado_id") || null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[RELATORIO_REDE] Tipo: ${tipo}, Mês: ${mesReferencia}`);

    let data;

    if (tipo === "rede") {
      const { data: relatorio, error } = await supabase.rpc(
        "relatorio_media_mediana_credenciados",
        {
          p_mes_referencia: mesReferencia,
          p_estado: estado,
          p_cidade: cidade,
        }
      );

      if (error) {
        console.error("[RELATORIO_REDE] Erro:", error);
        throw error;
      }
      
      data = relatorio;
    } else {
      const { data: relatorio, error } = await supabase.rpc(
        "relatorio_media_mediana_profissionais",
        {
          p_mes_referencia: mesReferencia,
          p_especialidade: especialidade,
          p_estado: estado,
          p_credenciado_id: credenciadoId,
        }
      );

      if (error) {
        console.error("[RELATORIO_REDE] Erro:", error);
        throw error;
      }
      
      data = relatorio;
    }

    console.log(`[RELATORIO_REDE] Retornando ${data?.length || 0} registros`);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error("[RELATORIO_REDE] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
