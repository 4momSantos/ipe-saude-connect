import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CredenciadoSemDocs {
  credenciado_id: string;
  inscricao_id: string;
  nome: string;
  status: string;
  documentos_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date().toISOString();
  console.log(`[CORRIGIR_DOCS] ${startTime} - Iniciando correção retroativa`);

  try {
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

    // 1. Buscar todos os credenciados com inscrição mas sem documentos migrados
    const { data: credenciados, error: credenciadosError } = await supabase
      .from("credenciados")
      .select("id, inscricao_id, nome, status")
      .not("inscricao_id", "is", null);

    if (credenciadosError) {
      throw new Error(`Erro ao buscar credenciados: ${credenciadosError.message}`);
    }

    if (!credenciados || credenciados.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum credenciado encontrado para correção",
          total_processados: 0,
          total_migrados: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[CORRIGIR_DOCS] ${credenciados.length} credenciados encontrados`);

    const credenciadosSemDocs: CredenciadoSemDocs[] = [];

    // 2. Verificar quais não têm documentos
    for (const credenciado of credenciados) {
      const { data: docs, error: docsError } = await supabase
        .from("documentos_credenciados")
        .select("id")
        .eq("credenciado_id", credenciado.id)
        .limit(1);

      if (docsError) {
        console.error(`[CORRIGIR_DOCS] Erro ao verificar documentos para ${credenciado.id}:`, docsError);
        continue;
      }

      if (!docs || docs.length === 0) {
        credenciadosSemDocs.push({
          credenciado_id: credenciado.id,
          inscricao_id: credenciado.inscricao_id,
          nome: credenciado.nome,
          status: credenciado.status,
          documentos_count: 0
        });
      }
    }

    console.log(`[CORRIGIR_DOCS] ${credenciadosSemDocs.length} credenciados sem documentos`);

    if (credenciadosSemDocs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Todos os credenciados já possuem documentos",
          total_processados: credenciados.length,
          total_migrados: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Chamar migração para cada credenciado sem documentos
    const resultados = [];
    let sucessos = 0;
    let falhas = 0;

    for (const credenciado of credenciadosSemDocs) {
      try {
        console.log(`[CORRIGIR_DOCS] Migrando documentos para ${credenciado.nome} (${credenciado.credenciado_id})`);

        const { data, error } = await supabase.functions.invoke('migrar-documentos-inscricao', {
          body: {
            inscricao_id: credenciado.inscricao_id,
            credenciado_id: credenciado.credenciado_id
          }
        });

        if (error) {
          console.error(`[CORRIGIR_DOCS] ❌ Erro ao migrar ${credenciado.nome}:`, error);
          falhas++;
          resultados.push({
            credenciado_id: credenciado.credenciado_id,
            nome: credenciado.nome,
            success: false,
            error: error.message
          });
        } else {
          console.log(`[CORRIGIR_DOCS] ✅ Documentos migrados para ${credenciado.nome}`);
          sucessos++;
          resultados.push({
            credenciado_id: credenciado.credenciado_id,
            nome: credenciado.nome,
            success: true,
            total_migrados: data?.total_migrados || 0
          });
        }

        // Pequeno delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`[CORRIGIR_DOCS] ❌ Exceção ao processar ${credenciado.nome}:`, error);
        falhas++;
        resultados.push({
          credenciado_id: credenciado.credenciado_id,
          nome: credenciado.nome,
          success: false,
          error: error.message
        });
      }
    }

    const endTime = new Date().toISOString();
    console.log(`[CORRIGIR_DOCS] ${endTime} - Correção concluída: ${sucessos} sucessos, ${falhas} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Correção concluída: ${sucessos} credenciados corrigidos, ${falhas} falhas`,
        total_processados: credenciadosSemDocs.length,
        total_sucessos: sucessos,
        total_falhas: falhas,
        resultados: resultados
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    const errorTime = new Date().toISOString();
    console.error(`[CORRIGIR_DOCS] ${errorTime} - Erro:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: errorTime,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
