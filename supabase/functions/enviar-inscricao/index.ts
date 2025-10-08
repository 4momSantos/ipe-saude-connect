import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnviarInscricaoRequest {
  inscricao_id: string;
  dados_inscricao?: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[ENVIAR_INSCRICAO] Iniciando processamento");

    // Setup Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request
    const { inscricao_id, dados_inscricao }: EnviarInscricaoRequest = await req.json();

    if (!inscricao_id) {
      throw new Error("inscricao_id é obrigatório");
    }

    console.log(`[ENVIAR_INSCRICAO] Processando inscrição ${inscricao_id}`);

    // 1. Buscar inscrição atual
    const { data: inscricao, error: fetchError } = await supabase
      .from("inscricoes_edital")
      .select("*, editais(titulo)")
      .eq("id", inscricao_id)
      .single();

    if (fetchError || !inscricao) {
      console.error("[ENVIAR_INSCRICAO] Erro ao buscar inscrição:", fetchError);
      throw new Error(`Inscrição não encontrada: ${fetchError?.message}`);
    }

    console.log(`[ENVIAR_INSCRICAO] Inscrição encontrada para edital: ${inscricao.editais?.titulo}`);

    // 2. Atualizar inscrição
    const updateData: any = {
      is_rascunho: false,
      status: 'em_analise',
      updated_at: new Date().toISOString(),
    };

    if (dados_inscricao) {
      updateData.dados_inscricao = dados_inscricao;
    }

    const { error: updateError } = await supabase
      .from("inscricoes_edital")
      .update(updateData)
      .eq("id", inscricao_id);

    if (updateError) {
      console.error("[ENVIAR_INSCRICAO] Erro ao atualizar inscrição:", updateError);
      throw new Error(`Erro ao enviar inscrição: ${updateError.message}`);
    }

    console.log("[ENVIAR_INSCRICAO] Inscrição atualizada com sucesso");

    // 3. Buscar analistas para notificar
    const { data: analistas, error: analistasError } = await supabase
      .from("user_roles")
      .select("user_id, profiles(id, email, nome)")
      .eq("role", "analista");

    if (analistasError) {
      console.error("[ENVIAR_INSCRICAO] Erro ao buscar analistas:", analistasError);
    }

    const analistasList = analistas?.map((a: any) => ({
      id: a.profiles?.id,
      email: a.profiles?.email,
      nome: a.profiles?.nome,
    })).filter((a: any) => a.id) || [];

    console.log(`[ENVIAR_INSCRICAO] ${analistasList.length} analista(s) encontrado(s)`);

    // 4. Criar notificações para analistas
    const notifications = analistasList.map(analista => ({
      user_id: analista.id,
      type: 'info',
      title: 'Nova Inscrição Recebida',
      message: `Nova inscrição para o edital "${inscricao.editais?.titulo || 'N/A'}" aguardando análise.`,
      related_type: 'inscricao',
      related_id: inscricao_id,
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("app_notifications")
        .insert(notifications);

      if (notifError) {
        console.error("[ENVIAR_INSCRICAO] Erro ao criar notificações:", notifError);
      } else {
        console.log(`[ENVIAR_INSCRICAO] ${notifications.length} notificação(ões) criada(s)`);
      }
    }

    // 5. Enviar email para analistas (se Resend configurado)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (RESEND_API_KEY && analistasList.length > 0) {
      console.log("[ENVIAR_INSCRICAO] Enviando emails via Resend");
      
      try {
        const emailPromises = analistasList
          .filter(a => a.email)
          .map(analista => 
            supabase.functions.invoke("send-templated-email", {
              body: {
                to: analista.email,
                subject: "Nova Inscrição para Análise",
                body: `
                  <h2>Nova Inscrição Recebida</h2>
                  <p>Olá ${analista.nome || 'Analista'},</p>
                  <p>Uma nova inscrição para o edital <strong>${inscricao.editais?.titulo || 'N/A'}</strong> foi enviada e está aguardando sua análise.</p>
                  <p>Acesse o sistema para revisar os documentos e dados do candidato.</p>
                `,
                context: {
                  inscricaoId: inscricao_id,
                  analistaId: analista.id,
                  editalId: inscricao.edital_id,
                }
              }
            })
          );

        await Promise.allSettled(emailPromises);
        console.log("[ENVIAR_INSCRICAO] Emails enviados");
      } catch (emailError) {
        console.error("[ENVIAR_INSCRICAO] Erro ao enviar emails:", emailError);
        // Não falha a operação se email falhar
      }
    }

    // 6. Log de auditoria
    try {
      await supabase.rpc("log_audit_event", {
        p_action: "inscricao_enviada",
        p_resource_type: "inscricao",
        p_resource_id: inscricao_id,
        p_metadata: {
          edital_id: inscricao.edital_id,
          candidato_id: inscricao.candidato_id,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (auditError) {
      console.error("[ENVIAR_INSCRICAO] Erro ao registrar log de auditoria:", auditError);
    }

    console.log("[ENVIAR_INSCRICAO] Processamento concluído com sucesso");

    return new Response(
      JSON.stringify({
        status: "ok",
        inscricaoId: inscricao_id,
        analistasNotificados: analistasList.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("[ENVIAR_INSCRICAO] Erro:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
