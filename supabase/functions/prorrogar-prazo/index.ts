// FASE 3: Edge Function - Prorrogar Prazo de Credenciamento
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

    // Validar usuário autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Não autorizado");
    }

    // Verificar se é gestor/admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isGestor = roles?.some(r => r.role === "gestor" || r.role === "admin");
    if (!isGestor) {
      throw new Error("Somente gestores podem prorrogar prazos");
    }

    const { prazo_id, nova_data, justificativa } = await req.json();

    // Validações
    if (!prazo_id || !nova_data || !justificativa) {
      throw new Error("prazo_id, nova_data e justificativa são obrigatórios");
    }

    if (justificativa.length < 30) {
      throw new Error("Justificativa deve ter no mínimo 30 caracteres");
    }

    const novaData = new Date(nova_data);
    if (isNaN(novaData.getTime())) {
      throw new Error("Data inválida");
    }

    // Buscar prazo atual
    const { data: prazo, error: prazoError } = await supabase
      .from("prazos_credenciamento")
      .select("*, credenciados(nome, email)")
      .eq("id", prazo_id)
      .single();

    if (prazoError || !prazo) {
      throw new Error("Prazo não encontrado");
    }

    // Validar que nova data é posterior à atual
    const dataAtual = new Date(prazo.data_vencimento);
    if (novaData <= dataAtual) {
      throw new Error("Nova data deve ser posterior à data atual de vencimento");
    }

    // Buscar nome do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", user.id)
      .single();

    // Atualizar prazo
    const { error: updateError } = await supabase
      .from("prazos_credenciamento")
      .update({
        data_vencimento: nova_data,
        status: "ativo",
        updated_at: new Date().toISOString()
      })
      .eq("id", prazo_id);

    if (updateError) {
      throw updateError;
    }

    // Registrar ação no histórico
    const { error: acaoError } = await supabase
      .from("acoes_prazos")
      .insert({
        prazo_id,
        credenciado_id: prazo.credenciado_id,
        tipo_acao: "prorrogado",
        data_anterior: prazo.data_vencimento,
        data_nova: nova_data,
        justificativa,
        executado_por: user.id,
        executado_por_nome: profile?.nome || profile?.email || user.email,
        metadata: {
          tipo_prazo: prazo.tipo_prazo,
          credenciado_nome: prazo.credenciados.nome
        }
      });

    if (acaoError) {
      console.error("[PRORROGAR_PRAZO] Erro ao registrar ação:", acaoError);
    }

    // Notificar credenciado
    await supabase
      .from("app_notifications")
      .insert({
        user_id: prazo.credenciados.email, // Assumindo que email está vinculado
        type: "info",
        title: "Prazo Prorrogado",
        message: `O prazo para ${prazo.tipo_prazo} foi prorrogado até ${novaData.toLocaleDateString('pt-BR')}. Justificativa: ${justificativa}`,
        related_type: "prazo",
        related_id: prazo_id
      });

    console.log(`[PRORROGAR_PRAZO] Prazo ${prazo_id} prorrogado de ${prazo.data_vencimento} para ${nova_data}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Prazo prorrogado com sucesso",
        data: {
          prazo_id,
          data_anterior: prazo.data_vencimento,
          data_nova: nova_data,
          credenciado: prazo.credenciados.nome
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[PRORROGAR_PRAZO] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.message.includes("autorizado") ? 403 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});