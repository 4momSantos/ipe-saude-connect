import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  inscricaoId: string;
  messageContent: string;
  senderName: string;
  recipientType: "candidato" | "analista";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { inscricaoId, messageContent, senderName, recipientType }: NotificationRequest =
      await req.json();

    console.log("[SEND_MESSAGE_NOTIFICATION] Processing:", {
      inscricaoId,
      senderName,
      recipientType,
    });

    // Buscar dados da inscrição
    const { data: inscricao, error: inscricaoError } = await supabase
      .from("inscricoes_edital")
      .select(
        `
        id,
        candidato_id,
        analisado_por,
        editais (
          titulo
        )
      `
      )
      .eq("id", inscricaoId)
      .single();

    if (inscricaoError) {
      console.error("[SEND_MESSAGE_NOTIFICATION] Error fetching inscricao:", inscricaoError);
      throw inscricaoError;
    }

    // Determinar destinatário
    const recipientId =
      recipientType === "candidato" ? inscricao.candidato_id : inscricao.analisado_por;

    if (!recipientId) {
      console.log("[SEND_MESSAGE_NOTIFICATION] No recipient found, skipping notification");
      return new Response(
        JSON.stringify({ message: "No recipient to notify", skipped: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Buscar email do destinatário
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, nome")
      .eq("id", recipientId)
      .single();

    if (profileError || !profile?.email) {
      console.error("[SEND_MESSAGE_NOTIFICATION] No email found for recipient");
      throw new Error("Recipient email not found");
    }

    console.log("[SEND_MESSAGE_NOTIFICATION] Sending email to:", profile.email);

    // Enviar email via edge function de template (se existir)
    // Por enquanto, apenas criar notificação in-app
    const { error: notificationError } = await supabase.from("app_notifications").insert({
      user_id: recipientId,
      type: "message",
      title: `Nova mensagem de ${senderName}`,
      message: `"${messageContent.substring(0, 100)}${messageContent.length > 100 ? "..." : ""}"`,
      related_type: "inscricao",
      related_id: inscricaoId,
    });

    if (notificationError) {
      console.error("[SEND_MESSAGE_NOTIFICATION] Error creating notification:", notificationError);
      throw notificationError;
    }

    console.log("[SEND_MESSAGE_NOTIFICATION] ✅ Notification sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent",
        recipient: profile.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SEND_MESSAGE_NOTIFICATION] ❌ Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: "Failed to send message notification",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
