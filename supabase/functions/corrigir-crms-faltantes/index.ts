import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[CORRIGIR_CRMS] Iniciando correção de CRMs faltantes...');

    // Buscar credenciados PF sem CRM usando RPC
    const { data: credenciados, error: credenciadosError } = await supabase
      .rpc('get_credenciados_sem_crms', { tipo_cred: 'PF' });

    if (credenciadosError) {
      throw new Error(`Erro ao buscar credenciados: ${credenciadosError.message}`);
    }

    console.log(`[CORRIGIR_CRMS] ${credenciados?.length || 0} credenciados encontrados`);

    const results = [];
    let criadosCount = 0;

    for (const credenciado of credenciados || []) {
      const dadosInscricao = credenciado.dados_inscricao;
      const crm = dadosInscricao?.dados_pessoais?.crm;
      const ufCrm = dadosInscricao?.dados_pessoais?.uf_crm;

      console.log(`[CORRIGIR_CRMS] 📋 Analisando ${credenciado.nome}...`);
      console.log(`[CORRIGIR_CRMS] Estrutura dados_inscricao:`, JSON.stringify(dadosInscricao, null, 2));

      if (!crm || !ufCrm) {
        console.log(`[CORRIGIR_CRMS] ⚠️ ${credenciado.nome} - CRM ou UF_CRM ausente (CRM: ${crm}, UF: ${ufCrm})`);
        results.push({
          credenciado_id: credenciado.id,
          nome: credenciado.nome,
          erro: 'CRM ou UF_CRM não encontrado em dados_inscricao.dados_pessoais'
        });
        continue;
      }

      // Buscar especialidades - tentar SINGULAR (consultorio) E PLURAL (consultorios)
      let especialidadesIds: string[] = [];
      
      // Tentar primeiro singular (formato correto)
      if (dadosInscricao?.consultorio) {
        especialidadesIds = dadosInscricao.consultorio.especialidades_ids || [];
        console.log(`[CORRIGIR_CRMS] ✓ Encontrado consultorio (singular) com ${especialidadesIds.length} especialidades`);
      }
      // Fallback para plural (formato antigo)
      else if (Array.isArray(dadosInscricao?.consultorios) && dadosInscricao.consultorios.length > 0) {
        especialidadesIds = dadosInscricao.consultorios[0]?.especialidades_ids || [];
        console.log(`[CORRIGIR_CRMS] ✓ Encontrado consultorios (plural) com ${especialidadesIds.length} especialidades`);
      }

      console.log(`[CORRIGIR_CRMS] 🔍 Processando ${credenciado.nome} - CRM: ${crm}/${ufCrm} - ${especialidadesIds.length} especialidades`);

      if (especialidadesIds.length === 0) {
        // Criar CRM genérico
        const { error: insertError } = await supabase
          .from('credenciado_crms')
          .insert({
            credenciado_id: credenciado.id,
            crm,
            uf_crm: ufCrm,
            especialidade: 'Medicina Geral',
            especialidade_id: null
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error(`[CORRIGIR_CRMS] Erro ao criar CRM genérico: ${insertError.message}`);
          results.push({
            credenciado_id: credenciado.id,
            nome: credenciado.nome,
            erro: insertError.message
          });
          continue;
        }

        criadosCount++;
        results.push({
          credenciado_id: credenciado.id,
          nome: credenciado.nome,
          crm_criado: `${crm}/${ufCrm} - Medicina Geral`
        });
      } else {
        // Criar CRM para cada especialidade
        let especialidadesCriadas = 0;
        
        for (const especialidadeId of especialidadesIds) {
          const { data: especialidade } = await supabase
            .from('especialidades_medicas')
            .select('nome')
            .eq('id', especialidadeId)
            .single();

          if (!especialidade) {
            console.warn(`[CORRIGIR_CRMS] Especialidade ${especialidadeId} não encontrada`);
            continue;
          }

          const { error: insertError } = await supabase
            .from('credenciado_crms')
            .insert({
              credenciado_id: credenciado.id,
              crm,
              uf_crm: ufCrm,
              especialidade: especialidade.nome,
              especialidade_id: especialidadeId
            });

          if (insertError && !insertError.message.includes('duplicate')) {
            console.error(`[CORRIGIR_CRMS] Erro ao criar CRM: ${insertError.message}`);
            continue;
          }

          especialidadesCriadas++;
          console.log(`[CORRIGIR_CRMS] ✅ CRM criado: ${crm}/${ufCrm} - ${especialidade.nome}`);
        }

        if (especialidadesCriadas > 0) {
          criadosCount++;
          
          // Atualizar status para Ativo se estava Incompleto
          if (credenciado.status === 'Incompleto') {
            await supabase
              .from('credenciados')
              .update({ status: 'Ativo' })
              .eq('id', credenciado.id);
          }

          results.push({
            credenciado_id: credenciado.id,
            nome: credenciado.nome,
            crms_criados: especialidadesCriadas
          });
        }
      }
    }

    console.log(`[CORRIGIR_CRMS] ✅ Correção concluída: ${criadosCount} credenciados processados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${criadosCount} credenciados corrigidos`,
        total_processados: credenciados?.length || 0,
        crms_criados: criadosCount,
        detalhes: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CORRIGIR_CRMS] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
