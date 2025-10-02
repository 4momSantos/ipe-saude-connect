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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Não autorizado");
    }

    const { id, name, description, nodes, edges } = await req.json();

    let workflowData;

    if (id) {
      // Atualizar workflow existente
      const { data, error } = await supabaseClient
        .from("workflows")
        .update({
          name,
          description,
          nodes,
          edges,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) throw error;
      workflowData = data;
    } else {
      // Criar novo workflow
      const { data, error } = await supabaseClient
        .from("workflows")
        .insert({
          name,
          description,
          nodes,
          edges,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      workflowData = data;
    }

    console.log("Workflow salvo:", workflowData.id);

    return new Response(JSON.stringify(workflowData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro ao salvar workflow:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});