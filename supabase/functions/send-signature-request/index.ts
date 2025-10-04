import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@2.0.0";

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

    const { signatureRequestId } = await req.json();

    // Buscar dados da signature request
    const { data: signatureRequest, error: requestError } = await supabase
      .from("signature_requests")
      .select(`
        *,
        workflow_execution:workflow_executions (
          id,
          started_by,
          workflow:workflows (name)
        ),
        step_execution:workflow_step_executions (
          id,
          node_id
        )
      `)
      .eq("id", signatureRequestId)
      .single();

    if (requestError || !signatureRequest) {
      throw new Error("Signature request not found");
    }

    // Buscar dados da inscrição relacionada
    const { data: execution } = await supabase
      .from("workflow_executions")
      .select(`
        id,
        inscricao:inscricoes_edital (
          id,
          candidato_id,
          edital:editais (id, titulo, numero),
          candidato:profiles!inscricoes_edital_candidato_id_fkey (id, nome, email)
        )
      `)
      .eq("id", signatureRequest.workflow_execution_id)
      .single();

    const inscricaoData = execution?.inscricao as any;
    const candidato = inscricaoData?.candidato;

    // Enviar email para o candidato
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    if (candidato?.email) {
      await resend.emails.send({
        from: "Sistema de Credenciamento <onboarding@resend.dev>",
        to: [candidato.email],
        subject: "Documento para Assinatura",
        html: `
          <h2>Olá ${candidato.nome || "Candidato"},</h2>
          <p>Um documento está aguardando sua assinatura.</p>
          <p><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
          <p>Por favor, acesse o sistema para assinar o documento.</p>
          <p>Atenciosamente,<br/>Equipe de Credenciamento</p>
        `,
      });

      console.log(`Email enviado para candidato: ${candidato.email}`);
    }

    // Buscar analistas para notificar
    const { data: analistas } = await supabase
      .from("user_roles")
      .select("user_id, profiles:profiles!user_roles_user_id_fkey(id, nome, email)")
      .eq("role", "analista");

    // Criar notificações in-app para analistas
    if (analistas && analistas.length > 0) {
      const notifications = analistas.map(analista => ({
        user_id: analista.user_id,
        title: "Nova Solicitação de Assinatura",
        message: `Documento aguardando assinatura de ${candidato?.nome || "candidato"}`,
        type: "signature",
        related_id: signatureRequestId,
        related_type: "signature_request",
      }));

      await supabase.from("app_notifications").insert(notifications);
      console.log(`Notificações criadas para ${analistas.length} analistas`);

      // Enviar emails para analistas
      for (const analista of analistas) {
        const analistaProfile = analista.profiles as any;
        if (analistaProfile?.email) {
          await resend.emails.send({
            from: "Sistema de Credenciamento <onboarding@resend.dev>",
            to: [analistaProfile.email],
            subject: "Nova Solicitação de Assinatura",
            html: `
              <h2>Olá ${analistaProfile.nome || "Analista"},</h2>
              <p>Uma nova solicitação de assinatura foi criada.</p>
              <p><strong>Candidato:</strong> ${candidato?.nome || "N/A"}</p>
              <p><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
              <p>Acesse o sistema para acompanhar o processo.</p>
              <p>Atenciosamente,<br/>Sistema de Credenciamento</p>
            `,
          });
        }
      }
    }

    // Atualizar status para enviado
    await supabase
      .from("signature_requests")
      .update({ 
        status: "sent",
        metadata: { sent_at: new Date().toISOString() }
      })
      .eq("id", signatureRequestId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Emails e notificações enviados com sucesso" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-signature-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
