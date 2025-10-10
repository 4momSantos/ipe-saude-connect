// FASE 6.2: Edge Function - Web Service de Consulta Externa
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar API Key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key não fornecida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar API Key
    const keyHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(apiKey)
    );
    const hashHex = Array.from(new Uint8Array(keyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: apiKeyData, error: keyError } = await supabase
      .from("api_keys_externas")
      .select("*")
      .eq("key_hash", hashHex)
      .eq("ativo", true)
      .single();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: "API Key inválida ou inativa" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar quota
    if (apiKeyData.requisicoes_hoje >= apiKeyData.quota_diaria) {
      return new Response(
        JSON.stringify({ error: "Quota diária excedida" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Incrementar contador
    await supabase
      .from("api_keys_externas")
      .update({
        requisicoes_hoje: apiKeyData.requisicoes_hoje + 1,
        ultima_requisicao: new Date().toISOString()
      })
      .eq("id", apiKeyData.id);

    // Buscar parâmetros
    const url = new URL(req.url);
    const crm = url.searchParams.get("crm");
    const uf = url.searchParams.get("uf");
    const especialidade = url.searchParams.get("especialidade");
    const cidade = url.searchParams.get("cidade");
    const estado = url.searchParams.get("estado");

    let query = supabase
      .from("credenciados")
      .select(`
        nome,
        cidade,
        estado,
        status,
        credenciado_crms (
          crm,
          uf_crm,
          especialidade
        )
      `)
      .eq("status", "Ativo");

    if (cidade) query = query.eq("cidade", cidade);
    if (estado) query = query.eq("estado", estado);

    const { data: credenciados, error } = await query;

    if (error) throw error;

    // Filtrar por CRM/especialidade se fornecido
    let resultado = credenciados || [];

    if (crm || uf || especialidade) {
      resultado = resultado.filter(cred => {
        return cred.credenciado_crms?.some((c: any) => {
          const matchCrm = !crm || c.crm === crm;
          const matchUf = !uf || c.uf_crm === uf;
          const matchEsp = !especialidade || c.especialidade.toLowerCase().includes(especialidade.toLowerCase());
          return matchCrm && matchUf && matchEsp;
        });
      });
    }

    // Remover dados sensíveis
    const resultadoPublico = resultado.map(cred => ({
      nome: cred.nome,
      cidade: cred.cidade,
      estado: cred.estado,
      crms: cred.credenciado_crms?.map((c: any) => ({
        crm: c.crm,
        uf: c.uf_crm,
        especialidade: c.especialidade
      })) || []
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total: resultadoPublico.length,
        credenciados: resultadoPublico
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[API_PUBLICA] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
