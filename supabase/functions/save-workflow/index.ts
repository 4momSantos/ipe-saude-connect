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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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
      console.error("Tentativa de acesso não autorizado");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log("Usuário autenticado:", user.id);

    const { id, name, description, nodes, edges } = await req.json();

    // Validação de dados
    if (!name || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Nome do workflow é obrigatório" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!nodes || !Array.isArray(nodes)) {
      return new Response(
        JSON.stringify({ error: "Nodes inválidos" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!edges || !Array.isArray(edges)) {
      return new Response(
        JSON.stringify({ error: "Edges inválidos" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    let workflowData;

    if (id) {
      // Atualizar workflow existente
      console.log("Tentando atualizar workflow:", id, "para usuário:", user.id);
      
      // Primeiro verificar se o workflow existe
      const { data: existingWorkflow, error: checkError } = await supabaseClient
        .from("workflows")
        .select("id, created_by")
        .eq("id", id)
        .maybeSingle();

      if (checkError) {
        console.error("Erro ao verificar workflow:", checkError);
        throw checkError;
      }

      if (!existingWorkflow) {
        console.error("Workflow não encontrado:", id);
        return new Response(
          JSON.stringify({ error: "Workflow não encontrado" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        );
      }

      // Verificar se o usuário é o criador OU tem permissão de gestor/admin
      if (existingWorkflow.created_by !== user.id) {
        console.log("Usuário não é o criador, verificando roles...");
        
        // Verificar se o usuário tem role de gestor ou admin
        const { data: userRoles, error: rolesError } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["gestor", "admin"]);

        if (rolesError) {
          console.error("Erro ao verificar roles:", rolesError);
        }

        const hasPermission = userRoles && userRoles.length > 0;
        
        if (!hasPermission) {
          console.error("Usuário não tem permissão:", user.id, "criado por:", existingWorkflow.created_by);
          return new Response(
            JSON.stringify({ error: "Você não tem permissão para editar este workflow. Apenas o criador, gestores ou administradores podem editar." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 403,
            }
          );
        }
        
        console.log("Usuário tem permissão (gestor/admin):", userRoles);
      }

      // Atualizar o workflow
      const { data, error } = await supabaseClient
        .from("workflows")
        .update({
          name,
          description: description || "",
          nodes,
          edges,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar workflow:", error);
        throw error;
      }
      
      workflowData = data;
      console.log("Workflow atualizado com sucesso:", workflowData.id);
    } else {
      // Criar novo workflow
      console.log("Criando novo workflow para usuário:", user.id);
      
      const { data, error } = await supabaseClient
        .from("workflows")
        .insert({
          name,
          description: description || "",
          nodes,
          edges,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar workflow:", error);
        throw error;
      }
      
      workflowData = data;
      console.log("Workflow criado com sucesso:", workflowData.id);
    }

    return new Response(JSON.stringify(workflowData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro ao salvar workflow:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorDetails = error instanceof Error ? error : null;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails ? {
          name: errorDetails.name,
          message: errorDetails.message,
        } : null
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});