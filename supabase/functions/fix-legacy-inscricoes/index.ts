import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixResult {
  editais_corrigidos: number;
  analises_criadas: number;
  inscricoes_processadas: string[];
  erros: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const result: FixResult = {
      editais_corrigidos: 0,
      analises_criadas: 0,
      inscricoes_processadas: [],
      erros: [],
    };

    console.log('[FIX_LEGACY] Iniciando processamento de inscrições antigas...');

    // 1. Corrigir editais sem workflow e sem fluxo programático
    const { data: editaisProblematicos, error: editaisError } = await supabase
      .from('editais')
      .select('id, numero_edital, workflow_id, use_programmatic_flow')
      .or('workflow_id.is.null,and(workflow_id.is.null,use_programmatic_flow.eq.false)');

    if (editaisError) {
      console.error('[FIX_LEGACY] Erro ao buscar editais:', editaisError);
      result.erros.push(`Erro ao buscar editais: ${editaisError.message}`);
    } else if (editaisProblematicos && editaisProblematicos.length > 0) {
      console.log(`[FIX_LEGACY] Encontrados ${editaisProblematicos.length} editais sem configuração`);

      for (const edital of editaisProblematicos) {
        // Atualizar para usar fluxo programático
        const { error: updateError } = await supabase
          .from('editais')
          .update({ use_programmatic_flow: true })
          .eq('id', edital.id);

        if (updateError) {
          console.error(`[FIX_LEGACY] Erro ao atualizar edital ${edital.numero_edital}:`, updateError);
          result.erros.push(`Edital ${edital.numero_edital}: ${updateError.message}`);
        } else {
          result.editais_corrigidos++;
          console.log(`[FIX_LEGACY] ✅ Edital ${edital.numero_edital} configurado para fluxo programático`);
        }
      }
    }

    // 2. Buscar inscrições que precisam de análise
    const { data: inscricoesSemAnalise, error: inscricoesError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        status,
        is_rascunho,
        edital_id,
        editais!inner(numero_edital, use_programmatic_flow)
      `)
      .eq('is_rascunho', false)
      .in('status', ['aguardando_analise', 'em_analise'])
      .is('workflow_execution_id', null)
      .limit(50); // Processar no máximo 50 por vez

    if (inscricoesError) {
      console.error('[FIX_LEGACY] Erro ao buscar inscrições:', inscricoesError);
      result.erros.push(`Erro ao buscar inscrições: ${inscricoesError.message}`);
    } else if (inscricoesSemAnalise && inscricoesSemAnalise.length > 0) {
      console.log(`[FIX_LEGACY] Encontradas ${inscricoesSemAnalise.length} inscrições sem análise`);

      for (const inscricao of inscricoesSemAnalise) {
        try {
          // Verificar se já tem análise
          const { data: analiseExistente } = await supabase
            .from('analises')
            .select('id')
            .eq('inscricao_id', inscricao.id)
            .maybeSingle();

          if (!analiseExistente) {
            // Criar análise
            const { error: analiseError } = await supabase
              .from('analises')
              .insert({
                inscricao_id: inscricao.id,
                status: 'pendente',
                created_at: new Date().toISOString(),
              });

            if (analiseError) {
              console.error(`[FIX_LEGACY] Erro ao criar análise para inscrição ${inscricao.id}:`, analiseError);
              result.erros.push(`Inscrição ${inscricao.id}: ${analiseError.message}`);
            } else {
              result.analises_criadas++;
              result.inscricoes_processadas.push(inscricao.id);
              console.log(`[FIX_LEGACY] ✅ Análise criada para inscrição ${inscricao.id}`);
            }
          } else {
            result.inscricoes_processadas.push(inscricao.id);
            console.log(`[FIX_LEGACY] ℹ️ Inscrição ${inscricao.id} já possui análise`);
          }

          // Atualizar status se necessário
          if (inscricao.status !== 'aguardando_analise') {
            await supabase
              .from('inscricoes_edital')
              .update({ status: 'aguardando_analise' })
              .eq('id', inscricao.id);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          console.error(`[FIX_LEGACY] Erro ao processar inscrição ${inscricao.id}:`, error);
          result.erros.push(`Inscrição ${inscricao.id}: ${errorMessage}`);
        }
      }
    }

    console.log('[FIX_LEGACY] ✅ Processamento concluído');
    console.log('[FIX_LEGACY] Resultado:', result);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[FIX_LEGACY] Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: 'Erro ao processar inscrições antigas',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

