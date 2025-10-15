// FASE 3: Edge Function - Notificar Prazo Manualmente
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
      throw new Error("Somente gestores podem enviar notificações");
    }

    const { prazo_id, mensagem_customizada } = await req.json();

    if (!prazo_id) {
      throw new Error("prazo_id é obrigatório");
    }

    // Buscar prazo
    const { data: prazo, error: prazoError } = await supabase
      .from("prazos_credenciamento")
      .select(`
        *,
        credenciados(id, nome, email)
      `)
      .eq("id", prazo_id)
      .single();

    if (prazoError || !prazo) {
      throw new Error("Prazo não encontrado");
    }

    const diasRestantes = Math.ceil(
      (new Date(prazo.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    let mensagem = mensagem_customizada;
    if (!mensagem) {
      if (diasRestantes < 0) {
        mensagem = `URGENTE: O prazo para ${prazo.tipo_prazo} está VENCIDO desde ${new Date(prazo.data_vencimento).toLocaleDateString('pt-BR')}. Regularize sua situação com urgência.`;
      } else if (diasRestantes <= 7) {
        mensagem = `ATENÇÃO: O prazo para ${prazo.tipo_prazo} vence em ${diasRestantes} dias (${new Date(prazo.data_vencimento).toLocaleDateString('pt-BR')}). Providencie a renovação imediatamente.`;
      } else {
        mensagem = `Lembrete: O prazo para ${prazo.tipo_prazo} vence em ${diasRestantes} dias (${new Date(prazo.data_vencimento).toLocaleDateString('pt-BR')}).`;
      }
    }

    // Buscar candidato_id vinculado ao credenciado via inscrição
    const { data: inscricao } = await supabase
      .from("inscricoes_edital")
      .select("candidato_id")
      .eq("id", prazo.credenciados.inscricao_id)
      .single();

    if (inscricao?.candidato_id) {
      // Criar notificação in-app
      await supabase
        .from("app_notifications")
        .insert({
          user_id: inscricao.candidato_id,
          type: diasRestantes < 0 ? "error" : diasRestantes <= 7 ? "warning" : "info",
          title: "Alerta de Vencimento",
          message: mensagem,
          related_type: "prazo",
          related_id: prazo_id
        });
    }

    // Registrar em alertas_enviados
    await supabase
      .from("alertas_enviados")
      .insert({
        prazo_id,
        credenciado_id: prazo.credenciado_id,
        email_enviado_para: prazo.credenciados.email || "N/A",
        status_envio: "enviado",
        tipo_alerta: "notificacao_manual",
        metadata: {
          enviado_por: user.email,
          mensagem_customizada: !!mensagem_customizada,
          dias_restantes: diasRestantes
        }
      });

    // Registrar ação
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", user.id)
      .single();

    await supabase
      .from("acoes_prazos")
      .insert({
        prazo_id,
        credenciado_id: prazo.credenciado_id,
        tipo_acao: "notificado",
        executado_por: user.id,
        executado_por_nome: profile?.nome || profile?.email || user.email,
        metadata: {
          tipo_prazo: prazo.tipo_prazo,
          dias_restantes: diasRestantes,
          mensagem_customizada: !!mensagem_customizada
        }
      });

    console.log(`[NOTIFICAR_PRAZO] Notificação enviada para prazo ${prazo_id}, credenciado ${prazo.credenciados.nome}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notificação enviada com sucesso",
        data: {
          prazo_id,
          credenciado: prazo.credenciados.nome,
          dias_restantes: diasRestantes
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[NOTIFICAR_PRAZO] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.message.includes("autorizado") ? 403 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});