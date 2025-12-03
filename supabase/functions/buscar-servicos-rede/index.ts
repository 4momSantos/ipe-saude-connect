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
    const especialidade = url.searchParams.get("especialidade") || null;
    const procedimento = url.searchParams.get("procedimento") || null;
    const categoria = url.searchParams.get("categoria") || null;
    const cidade = url.searchParams.get("cidade") || null;
    const estado = url.searchParams.get("estado") || null;
    const aceitaSus = url.searchParams.get("aceita_sus") === "true" ? true : null;
    const disponivelOnline = url.searchParams.get("disponivel_online") === "true" ? true : null;
    const precoMaximo = url.searchParams.get("preco_maximo") 
      ? parseFloat(url.searchParams.get("preco_maximo")!) 
      : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[BUSCAR_SERVICOS] Filtros:`, {
      especialidade,
      procedimento,
      categoria,
      cidade,
      estado,
      aceitaSus,
      disponivelOnline,
      precoMaximo
    });

    const { data, error } = await supabase.rpc("buscar_servicos_rede", {
      p_especialidade: especialidade,
      p_procedimento: procedimento,
      p_categoria: categoria,
      p_cidade: cidade,
      p_estado: estado,
      p_aceita_sus: aceitaSus,
      p_disponivel_online: disponivelOnline,
      p_preco_maximo: precoMaximo,
    });

    if (error) {
      console.error("[BUSCAR_SERVICOS] Erro:", error);
      throw error;
    }

    console.log(`[BUSCAR_SERVICOS] ${data?.length || 0} serviços encontrados`);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error("[BUSCAR_SERVICOS] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
