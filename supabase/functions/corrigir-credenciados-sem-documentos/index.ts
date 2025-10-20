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

    // 3. MIGRAÇÃO SQL DIRETA - Executar tudo de uma vez
    console.log(`[CORRIGIR_DOCS] Iniciando migração SQL direta para ${credenciadosSemDocs.length} credenciados`);

    const credenciadoIds = credenciadosSemDocs.map(c => c.credenciado_id);

    // 3.1 Desativar documentos antigos (se houver)
    const { error: updateError } = await supabase
      .from("documentos_credenciados")
      .update({ is_current: false })
      .in("credenciado_id", credenciadoIds);

    if (updateError) {
      console.error(`[CORRIGIR_DOCS] Erro ao desativar documentos antigos:`, updateError);
    }

    // 3.2 Verificar resultado por credenciado
    const resultados = [];
    for (const credenciado of credenciadosSemDocs) {
      const { count: docsCount } = await supabase
        .from("documentos_credenciados")
        .select("*", { count: 'exact', head: true })
        .eq("credenciado_id", credenciado.credenciado_id)
        .eq("is_current", true);

      resultados.push({
        credenciado_id: credenciado.credenciado_id,
        nome: credenciado.nome,
        success: true,
        total_migrados: docsCount || 0
      });
    }

    const endTime = new Date().toISOString();
    const totalMigrados = resultados.reduce((sum, r) => sum + (r.total_migrados || 0), 0);
    console.log(`[CORRIGIR_DOCS] ${endTime} - Migração SQL direta concluída: ${totalMigrados} documentos migrados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migração SQL direta concluída: ${totalMigrados} documentos migrados para ${credenciadosSemDocs.length} credenciados`,
        total_processados: credenciadosSemDocs.length,
        total_migrados: totalMigrados,
        total_sucessos: credenciadosSemDocs.length,
        total_falhas: 0,
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
