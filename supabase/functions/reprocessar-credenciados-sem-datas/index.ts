import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[REPROCESSAR_DATAS] Iniciando busca de credenciados sem datas');

    // Buscar credenciados com datas NULL
    const { data: credenciadosSemDatas, error: fetchError } = await supabase
      .from('credenciados')
      .select('id, numero_credenciado, nome, inscricao_id, data_solicitacao, data_habilitacao, data_inicio_atendimento')
      .or('data_solicitacao.is.null,data_habilitacao.is.null,data_inicio_atendimento.is.null')
      .eq('status', 'Ativo')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[REPROCESSAR_DATAS] Erro ao buscar credenciados:', fetchError);
      throw fetchError;
    }

    if (!credenciadosSemDatas || credenciadosSemDatas.length === 0) {
      console.log('[REPROCESSAR_DATAS] ✅ Nenhum credenciado sem datas encontrado');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum credenciado sem datas encontrado',
          processados: 0,
          sucesso: 0,
          falhas: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REPROCESSAR_DATAS] Encontrados ${credenciadosSemDatas.length} credenciados sem datas`);

    const resultados = [];
    let sucessos = 0;
    let falhas = 0;

    for (const credenciado of credenciadosSemDatas) {
      try {
        console.log(`[REPROCESSAR_DATAS] Reprocessando ${credenciado.numero_credenciado} (${credenciado.nome})`);

        // Chamar sync_credenciado_from_contract para reprocessar
        const { data: syncResult, error: syncError } = await supabase.rpc(
          'sync_credenciado_from_contract',
          { p_inscricao_id: credenciado.inscricao_id }
        );

        if (syncError) {
          console.error(`[REPROCESSAR_DATAS] ❌ Erro ao reprocessar ${credenciado.numero_credenciado}:`, syncError);
          falhas++;
          resultados.push({
            credenciado_id: credenciado.id,
            numero: credenciado.numero_credenciado,
            nome: credenciado.nome,
            status: 'erro',
            erro: syncError.message
          });
          continue;
        }

        console.log(`[REPROCESSAR_DATAS] ✅ ${credenciado.numero_credenciado} reprocessado com sucesso`);
        sucessos++;
        resultados.push({
          credenciado_id: credenciado.id,
          numero: credenciado.numero_credenciado,
          nome: credenciado.nome,
          status: 'sucesso',
          sync_result: syncResult
        });

        // Rate limiting: 1 requisição por segundo
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`[REPROCESSAR_DATAS] ❌ Erro inesperado ao processar ${credenciado.numero_credenciado}:`, error);
        falhas++;
        resultados.push({
          credenciado_id: credenciado.id,
          numero: credenciado.numero_credenciado,
          nome: credenciado.nome,
          status: 'erro',
          erro: error.message
        });
      }
    }

    console.log(`[REPROCESSAR_DATAS] ✅ Concluído: ${sucessos} sucessos, ${falhas} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reprocessamento concluído`,
        processados: credenciadosSemDatas.length,
        sucesso: sucessos,
        falhas: falhas,
        resultados: resultados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[REPROCESSAR_DATAS] Erro geral:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
