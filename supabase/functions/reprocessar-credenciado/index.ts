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

    const { credenciado_ids } = await req.json();

    if (!credenciado_ids || !Array.isArray(credenciado_ids)) {
      throw new Error('credenciado_ids deve ser um array');
    }

    console.log(`[reprocessar-credenciado] Reprocessando ${credenciado_ids.length} credenciados...`);

    const resultados = [];

    for (const credenciado_id of credenciado_ids) {
      console.log(`[reprocessar-credenciado] Processando credenciado: ${credenciado_id}`);

      // 1. Buscar credenciado e inscrição
      const { data: credenciado, error: credError } = await supabase
        .from('credenciados')
        .select('id, inscricao_id, nome')
        .eq('id', credenciado_id)
        .single();

      if (credError || !credenciado || !credenciado.inscricao_id) {
        console.error(`[reprocessar-credenciado] Credenciado não encontrado ou sem inscrição: ${credenciado_id}`);
        resultados.push({
          credenciado_id,
          sucesso: false,
          erro: 'Credenciado não encontrado ou sem inscrição',
        });
        continue;
      }

      // 2. Buscar documentos da inscrição
      const { data: docsInscricao, error: docsError } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('inscricao_id', credenciado.inscricao_id)
        .not('arquivo_url', 'is', null);

      if (docsError) {
        console.error(`[reprocessar-credenciado] Erro ao buscar documentos da inscrição:`, docsError);
        resultados.push({
          credenciado_id,
          nome: credenciado.nome,
          sucesso: false,
          erro: docsError.message,
        });
        continue;
      }

      if (!docsInscricao || docsInscricao.length === 0) {
        console.log(`[reprocessar-credenciado] Sem documentos na inscrição para credenciado ${credenciado.nome}`);
        resultados.push({
          credenciado_id,
          nome: credenciado.nome,
          sucesso: true,
          documentos_migrados: 0,
          mensagem: 'Sem documentos na inscrição',
        });
        continue;
      }

      // 3. Migrar cada documento
      const validadeTipos: Record<string, number> = {
        cnpj: 0,
        contrato_social: 0,
        comp_endereco: 6,
        rg_cpf: 0,
        identidade_medica: 0,
        CNH: 60,
        certidoes_negativas: 12,
        cert_regularidade_pj: 12,
        alvara_sanitario: 12,
        cert_fgts: 12,
        ficha_cadastral: 0,
        registro_especialidade: 0,
        comp_bancario: 0,
      };

      let docsMigrados = 0;

      for (const docInscricao of docsInscricao) {
        // Verificar se já existe
        const { data: docExistente } = await supabase
          .from('documentos_credenciados')
          .select('id')
          .eq('credenciado_id', credenciado_id)
          .eq('tipo_documento', docInscricao.tipo_documento)
          .eq('is_current', true)
          .maybeSingle();

        if (docExistente) {
          console.log(`[reprocessar-credenciado] Documento já existe: ${docInscricao.tipo_documento}`);
          continue;
        }

        // Calcular data de vencimento
        let dataVencimento: string | null = null;

        // Tentar extrair do OCR
        if (docInscricao.ocr_resultado?.dataValidade) {
          try {
            dataVencimento = docInscricao.ocr_resultado.dataValidade;
          } catch (e) {
            console.warn(`[reprocessar-credenciado] Erro ao parsear data do OCR:`, e);
          }
        }

        // Se não tem no OCR, calcular pela validade padrão
        if (!dataVencimento) {
          const mesesValidade = validadeTipos[docInscricao.tipo_documento];
          if (mesesValidade && mesesValidade > 0) {
            const dataBase = docInscricao.analisado_em || docInscricao.created_at;
            const data = new Date(dataBase);
            data.setMonth(data.getMonth() + mesesValidade);
            dataVencimento = data.toISOString().split('T')[0];
          }
        }

        // Determinar status
        const status = dataVencimento && new Date(dataVencimento) < new Date() ? 'vencido' : 'ativo';

        // Inserir documento
        const { error: insertError } = await supabase
          .from('documentos_credenciados')
          .insert({
            credenciado_id: credenciado_id,
            documento_origem_id: docInscricao.id,
            inscricao_id: credenciado.inscricao_id,
            tipo_documento: docInscricao.tipo_documento,
            arquivo_nome: docInscricao.arquivo_nome,
            url_arquivo: docInscricao.arquivo_url,
            data_emissao: (docInscricao.analisado_em || docInscricao.created_at).split('T')[0],
            data_vencimento: dataVencimento,
            ocr_resultado: docInscricao.ocr_resultado,
            status: status,
            is_current: true,
            origem: 'reprocessamento_edge_function',
          });

        if (insertError) {
          console.error(`[reprocessar-credenciado] Erro ao inserir documento ${docInscricao.tipo_documento}:`, insertError);
        } else {
          docsMigrados++;
          console.log(`[reprocessar-credenciado] ✅ Documento migrado: ${docInscricao.tipo_documento}`);
        }
      }

      resultados.push({
        credenciado_id,
        nome: credenciado.nome,
        sucesso: true,
        documentos_migrados: docsMigrados,
        total_documentos_inscricao: docsInscricao.length,
      });

      console.log(`[reprocessar-credenciado] ✅ Credenciado ${credenciado.nome}: ${docsMigrados} documentos migrados`);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        total_processados: credenciado_ids.length,
        resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[reprocessar-credenciado] Erro:', error);
    return new Response(
      JSON.stringify({
        erro: error.message,
        detalhes: error,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
