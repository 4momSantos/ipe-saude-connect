import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para normalizar texto para comparação
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

// Função para calcular similaridade entre strings (algoritmo de Levenshtein simplificado)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Função para buscar especialidade com fuzzy matching
async function findBestMatchingEspecialidade(
  supabase: any,
  especialidadeId: string
): Promise<{ id: string; nome: string; matchType: 'exact' | 'fuzzy' | 'not_found'; similarity?: number } | null> {
  
  // Primeiro tenta busca exata por ID
  const { data: especialidade } = await supabase
    .from('especialidades_medicas')
    .select('id, nome')
    .eq('id', especialidadeId)
    .single();

  if (especialidade) {
    return { ...especialidade, matchType: 'exact' };
  }

  console.log(`[FUZZY] Especialidade ${especialidadeId} não encontrada, tentando busca fuzzy...`);

  // Se não encontrou por ID, busca todas as especialidades para fuzzy matching
  const { data: todasEspecialidades } = await supabase
    .from('especialidades_medicas')
    .select('id, nome');

  if (!todasEspecialidades || todasEspecialidades.length === 0) {
    return null;
  }

  // Busca por similaridade de nome (caso o ID seja na verdade um nome)
  const searchTerm = normalizeText(especialidadeId);
  let bestMatch = null;
  let bestSimilarity = 0;

  for (const esp of todasEspecialidades) {
    const normalizedNome = normalizeText(esp.nome);
    
    // Verifica se contém o termo
    if (normalizedNome.includes(searchTerm) || searchTerm.includes(normalizedNome)) {
      const sim = similarity(searchTerm, normalizedNome);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatch = esp;
      }
    }
  }

  // Só retorna se a similaridade for maior que 60%
  if (bestMatch && bestSimilarity > 0.6) {
    console.log(`[FUZZY] ✓ Match encontrado: "${especialidadeId}" → "${bestMatch.nome}" (${Math.round(bestSimilarity * 100)}%)`);
    return { ...bestMatch, matchType: 'fuzzy', similarity: bestSimilarity };
  }

  console.log(`[FUZZY] ✗ Nenhum match encontrado para "${especialidadeId}"`);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[CORRIGIR_CRMS] 🚀 Iniciando correção de CRMs faltantes...');

    // Buscar credenciados PF sem CRM usando RPC
    const { data: credenciados, error: credenciadosError } = await supabase
      .rpc('get_credenciados_sem_crms', { tipo_cred: 'PF' });

    if (credenciadosError) {
      throw new Error(`Erro ao buscar credenciados: ${credenciadosError.message}`);
    }

    console.log(`[CORRIGIR_CRMS] 📊 ${credenciados?.length || 0} credenciados encontrados sem CRM`);

    const results = [];
    let criadosCount = 0;
    let errosCount = 0;
    let requererRevisaoCount = 0;

    for (const credenciado of credenciados || []) {
      const dadosInscricao = credenciado.dados_inscricao;
      const crm = dadosInscricao?.dados_pessoais?.crm;
      const ufCrm = dadosInscricao?.dados_pessoais?.uf_crm;

      console.log(`\n[CORRIGIR_CRMS] 👤 Processando: ${credenciado.nome}`);

      if (!crm || !ufCrm) {
        console.log(`[CORRIGIR_CRMS] ⚠️ CRM ou UF_CRM ausente (CRM: ${crm}, UF: ${ufCrm})`);
        errosCount++;
        results.push({
          credenciado_id: credenciado.id,
          nome: credenciado.nome,
          status: 'erro',
          erro: 'CRM ou UF_CRM não encontrado em dados_inscricao.dados_pessoais'
        });
        continue;
      }

      // Buscar especialidades - tentar SINGULAR (consultorio) E PLURAL (consultorios)
      let especialidadesIds: string[] = [];
      
      if (dadosInscricao?.consultorio) {
        especialidadesIds = dadosInscricao.consultorio.especialidades_ids || [];
        console.log(`[CORRIGIR_CRMS] ✓ Consultório (singular): ${especialidadesIds.length} especialidades`);
      } else if (Array.isArray(dadosInscricao?.consultorios) && dadosInscricao.consultorios.length > 0) {
        especialidadesIds = dadosInscricao.consultorios[0]?.especialidades_ids || [];
        console.log(`[CORRIGIR_CRMS] ✓ Consultórios (plural): ${especialidadesIds.length} especialidades`);
      }

      if (especialidadesIds.length === 0) {
        console.log(`[CORRIGIR_CRMS] ⚠️ Nenhuma especialidade encontrada - REQUER REVISÃO MANUAL`);
        requererRevisaoCount++;
        results.push({
          credenciado_id: credenciado.id,
          nome: credenciado.nome,
          crm: `${crm}/${ufCrm}`,
          status: 'requer_revisao',
          motivo: 'Nenhuma especialidade encontrada nos dados de inscrição'
        });
        continue;
      }

      // Processar cada especialidade
      let especialidadesCriadas = 0;
      let especialidadesNaoEncontradas = [];
      let especialidadesFuzzy = [];

      for (const especialidadeId of especialidadesIds) {
        const match = await findBestMatchingEspecialidade(supabase, especialidadeId);

        if (!match) {
          console.log(`[CORRIGIR_CRMS] ✗ Especialidade não encontrada: ${especialidadeId}`);
          especialidadesNaoEncontradas.push(especialidadeId);
          continue;
        }

        if (match.matchType === 'fuzzy') {
          especialidadesFuzzy.push({
            original: especialidadeId,
            encontrado: match.nome,
            similaridade: Math.round((match.similarity || 0) * 100)
          });
        }

        const { error: insertError } = await supabase
          .from('credenciado_crms')
          .insert({
            credenciado_id: credenciado.id,
            crm,
            uf_crm: ufCrm,
            especialidade: match.nome,
            especialidade_id: match.id
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error(`[CORRIGIR_CRMS] ✗ Erro ao criar CRM: ${insertError.message}`);
          continue;
        }

        especialidadesCriadas++;
        console.log(`[CORRIGIR_CRMS] ✅ CRM criado: ${crm}/${ufCrm} - ${match.nome} (${match.matchType})`);
      }

      if (especialidadesCriadas > 0) {
        criadosCount++;
        
        // Atualizar status para Ativo se estava Incompleto
        if (credenciado.status === 'Incompleto') {
          await supabase
            .from('credenciados')
            .update({ status: 'Ativo' })
            .eq('id', credenciado.id);
          console.log(`[CORRIGIR_CRMS] ✅ Status atualizado: Incompleto → Ativo`);
        }

        const resultado: any = {
          credenciado_id: credenciado.id,
          nome: credenciado.nome,
          crm: `${crm}/${ufCrm}`,
          status: 'sucesso',
          crms_criados: especialidadesCriadas
        };

        if (especialidadesFuzzy.length > 0) {
          resultado.fuzzy_matches = especialidadesFuzzy;
          resultado.status = 'sucesso_com_fuzzy';
        }

        if (especialidadesNaoEncontradas.length > 0) {
          resultado.especialidades_nao_encontradas = especialidadesNaoEncontradas;
          resultado.status = 'parcial';
        }

        results.push(resultado);
      } else {
        errosCount++;
        results.push({
          credenciado_id: credenciado.id,
          nome: credenciado.nome,
          crm: `${crm}/${ufCrm}`,
          status: 'erro',
          erro: 'Nenhuma especialidade válida encontrada',
          especialidades_tentadas: especialidadesIds,
          especialidades_nao_encontradas: especialidadesNaoEncontradas
        });
      }
    }

    console.log(`\n[CORRIGIR_CRMS] 🎯 RESUMO:`);
    console.log(`[CORRIGIR_CRMS] ✅ Sucesso: ${criadosCount}`);
    console.log(`[CORRIGIR_CRMS] ⚠️ Requer revisão: ${requererRevisaoCount}`);
    console.log(`[CORRIGIR_CRMS] ✗ Erros: ${errosCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Correção concluída: ${criadosCount} sucesso, ${requererRevisaoCount} requerem revisão, ${errosCount} erros`,
        total_processados: credenciados?.length || 0,
        crms_criados: criadosCount,
        requer_revisao: requererRevisaoCount,
        erros: errosCount,
        detalhes: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CORRIGIR_CRMS] 💥 Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});