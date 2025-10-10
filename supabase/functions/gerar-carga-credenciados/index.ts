// FASE 6.1: Edge Function - Gerar Carga de Credenciados para Integração
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[CARGA] Iniciando geração de carga de credenciados");

    // Buscar todos os credenciados ativos com relacionamentos
    const { data: credenciados, error } = await supabase
      .from("credenciados")
      .select(`
        *,
        credenciado_crms (
          id,
          crm,
          uf_crm,
          especialidade,
          horarios_atendimento (*)
        ),
        categoria:categoria_id (
          nome,
          descricao
        ),
        inscricao:inscricao_id (
          edital_id,
          candidato_id
        )
      `)
      .eq("status", "Ativo")
      .order("nome");

    if (error) throw error;

    // Converter para CSV
    const headers = [
      "ID", "Nome", "CPF", "CNPJ", "Email", "Telefone", "Celular",
      "Endereco", "Cidade", "Estado", "CEP", "Latitude", "Longitude",
      "Status", "Categoria", "Data Credenciamento", "CRMs"
    ];

    const csvLines = [headers.join(",")];

    for (const cred of credenciados || []) {
      const crms = cred.credenciado_crms?.map((c: any) => 
        `${c.crm}-${c.uf_crm} (${c.especialidade})`
      ).join("; ") || "";

      const line = [
        cred.id,
        `"${cred.nome}"`,
        cred.cpf || "",
        cred.cnpj || "",
        cred.email || "",
        cred.telefone || "",
        cred.celular || "",
        `"${cred.endereco || ""}"`,
        cred.cidade || "",
        cred.estado || "",
        cred.cep || "",
        cred.latitude || "",
        cred.longitude || "",
        cred.status,
        cred.categoria?.nome || "",
        cred.created_at,
        `"${crms}"`
      ];

      csvLines.push(line.join(","));
    }

    const csvContent = csvLines.join("\n");
    const fileName = `carga_credenciados_${new Date().toISOString().split('T')[0]}.csv`;

    // Upload para Storage
    const { error: uploadError } = await supabase.storage
      .from("edital-anexos")
      .upload(`cargas-integracao/${fileName}`, csvContent, {
        contentType: "text/csv",
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Gerar URL pública com expiração
    const { data: urlData } = await supabase.storage
      .from("edital-anexos")
      .createSignedUrl(`cargas-integracao/${fileName}`, 86400); // 24h

    console.log(`[CARGA] Arquivo gerado: ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        url: urlData?.signedUrl,
        totalRegistros: credenciados?.length || 0,
        dataGeracao: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[CARGA] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
