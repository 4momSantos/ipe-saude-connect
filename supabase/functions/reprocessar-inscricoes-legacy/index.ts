/**
 * Edge Function: reprocessar-inscricoes-legacy
 * 
 * Reprocessa inscrições antigas do período híbrido (workflow + programático)
 * para completar contratos pendentes de assinatura.
 * 
 * FASE A: Pré-verificação
 * FASE B: Reprocessar inscrição sem contrato
 * FASE C: Reprocessar inscrição com contrato pendente
 * FASE D: Validação final
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReprocessResult {
  phase: string;
  success: boolean;
  inscricao_id?: string;
  message: string;
  details?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: ReprocessResult[] = [];

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const editalId = 'e8f42b11-d49c-4c49-8f4e-823d961b39c1';
    const inscricao3 = '57184b45-35d3-4889-955d-544cfbf524f1'; // Sem contrato
    const inscricao4 = '11b74e04-ea60-432b-a528-386be77ac5ff'; // Contrato pendente

    // ============================================================
    // FASE A: PRÉ-VERIFICAÇÃO
    // ============================================================
    console.log('[FASE A] Iniciando pré-verificação...');

    // A1: Verificar edital
    const { data: edital, error: editalError } = await supabase
      .from('editais')
      .select('id, numero_edital, use_programmatic_flow, workflow_id')
      .eq('id', editalId)
      .single();

    if (editalError || !edital) {
      throw new Error(`Edital não encontrado: ${editalError?.message}`);
    }

    if (!edital.use_programmatic_flow || edital.workflow_id !== null) {
      results.push({
        phase: 'A',
        success: false,
        message: 'Edital não está configurado corretamente (use_programmatic_flow=true, workflow_id=null)',
        details: { edital }
      });
      throw new Error('Edital em estado inconsistente');
    }

    results.push({
      phase: 'A',
      success: true,
      message: '✅ Edital verificado: use_programmatic_flow=true, workflow_id=null'
    });

    // A2: Verificar inscrições já completas (não tocar)
    const { data: inscricoesCompletas } = await supabase
      .from('inscricoes_edital')
      .select('id, status')
      .eq('edital_id', editalId)
      .in('id', [
        '11c3f696-3c8d-4319-a3ba-56f787b8a7a9',
        '01f9df51-b65e-4966-8f55-06a63e0e22ba'
      ]);

    results.push({
      phase: 'A',
      success: true,
      message: `✅ ${inscricoesCompletas?.length || 0} inscrições já completas preservadas`,
      details: { inscricoesCompletas }
    });

    // ============================================================
    // FASE B: REPROCESSAR INSCRIÇÃO #3 (SEM CONTRATO)
    // ============================================================
    console.log('[FASE B] Reprocessando inscrição #3...');

    // B1: Verificar estado atual
    const { data: insc3, error: insc3Error } = await supabase
      .from('inscricoes_edital')
      .select('id, status, dados_inscricao')
      .eq('id', inscricao3)
      .single();

    if (insc3Error || !insc3) {
      throw new Error(`Inscrição #3 não encontrada: ${insc3Error?.message}`);
    }

    // B2: Gerar contrato via edge function
    console.log('[FASE B] Invocando gerar-contrato-assinatura...');
    const { data: contratoB, error: contratoErrorB } = await supabase.functions.invoke(
      'gerar-contrato-assinatura',
      {
        body: { inscricao_id: inscricao3 }
      }
    );

    if (contratoErrorB) {
      results.push({
        phase: 'B',
        success: false,
        inscricao_id: inscricao3,
        message: `❌ Erro ao gerar contrato: ${contratoErrorB.message}`,
        details: { error: contratoErrorB }
      });
    } else {
      results.push({
        phase: 'B',
        success: true,
        inscricao_id: inscricao3,
        message: `✅ Contrato gerado: ${contratoB.numero_contrato}`,
        details: { contrato: contratoB }
      });

      // B3: Simular assinatura
      if (contratoB.contrato_id) {
        console.log('[FASE B] Simulando assinatura...');
        const { data: assinaturaB, error: assinaturaErrorB } = await supabase.functions.invoke(
          'simular-assinatura-contrato',
          {
            body: { contrato_id: contratoB.contrato_id, force: true }
          }
        );

        if (assinaturaErrorB) {
          results.push({
            phase: 'B',
            success: false,
            inscricao_id: inscricao3,
            message: `⚠️ Contrato gerado mas assinatura falhou: ${assinaturaErrorB.message}`
          });
        } else {
          results.push({
            phase: 'B',
            success: true,
            inscricao_id: inscricao3,
            message: '✅ Assinatura simulada com sucesso',
            details: { assinatura: assinaturaB }
          });
        }
      }
    }

    // ============================================================
    // FASE C: REPROCESSAR INSCRIÇÃO #4 (CONTRATO PENDENTE)
    // ============================================================
    console.log('[FASE C] Reprocessando inscrição #4...');

    const contratoId4 = 'c69a88f1-cb08-4299-8032-a9de6e40a190';

    // C1: Verificar signature_request existente
    const { data: existingSR, error: srError } = await supabase
      .from('signature_requests')
      .select('id, status')
      .eq('contrato_id', contratoId4)
      .maybeSingle();

    if (srError) {
      console.error('[FASE C] Erro ao verificar signature_request:', srError);
    }

    // C2: Criar signature_request se não existe
    if (!existingSR) {
      console.log('[FASE C] Criando signature_request...');
      
      // Buscar dados do candidato
      const { data: candidatoData } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          dados_inscricao,
          profiles!inscricoes_edital_candidato_id_fkey(nome, email)
        `)
        .eq('id', inscricao4)
        .single();

      if (candidatoData) {
        const profile = candidatoData.profiles as any;
        const cpf = candidatoData.dados_inscricao?.dados_pessoais?.cpf;

        const { error: insertSRError } = await supabase
          .from('signature_requests')
          .insert({
            provider: 'assinafy',
            status: 'pending',
            contrato_id: contratoId4,
            inscricao_id: inscricao4,
            signers: [{
              name: profile?.nome,
              email: profile?.email,
              cpf: cpf
            }],
            metadata: {
              inscricao_id: inscricao4,
              contrato_id: contratoId4,
              numero_contrato: 'CONT-2025-333154',
              reprocessed: true
            }
          });

        if (insertSRError) {
          results.push({
            phase: 'C',
            success: false,
            inscricao_id: inscricao4,
            message: `❌ Erro ao criar signature_request: ${insertSRError.message}`
          });
        } else {
          results.push({
            phase: 'C',
            success: true,
            inscricao_id: inscricao4,
            message: '✅ signature_request criado'
          });
        }
      }
    } else {
      results.push({
        phase: 'C',
        success: true,
        inscricao_id: inscricao4,
        message: `✅ signature_request já existe (status: ${existingSR.status})`
      });
    }

    // C3: Simular assinatura
    console.log('[FASE C] Simulando assinatura...');
    const { data: assinaturaC, error: assinaturaErrorC } = await supabase.functions.invoke(
      'simular-assinatura-contrato',
      {
        body: { contrato_id: contratoId4, force: true }
      }
    );

    if (assinaturaErrorC) {
      results.push({
        phase: 'C',
        success: false,
        inscricao_id: inscricao4,
        message: `❌ Erro ao simular assinatura: ${assinaturaErrorC.message}`
      });
    } else {
      results.push({
        phase: 'C',
        success: true,
        inscricao_id: inscricao4,
        message: '✅ Assinatura simulada com sucesso',
        details: { assinatura: assinaturaC }
      });
    }

    // ============================================================
    // FASE D: VALIDAÇÃO FINAL
    // ============================================================
    console.log('[FASE D] Validação final...');

    // D1: Verificar estado final
    const { data: validacao, error: validacaoError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        status,
        contratos(id, status),
        credenciados(id, status)
      `)
      .eq('edital_id', editalId);

    if (validacaoError) {
      throw new Error(`Erro na validação final: ${validacaoError.message}`);
    }

    const totalInscricoes = validacao?.length || 0;
    const inscricoesAprovadas = validacao?.filter(i => i.status === 'aprovado').length || 0;
    const contratosAssinados = validacao?.filter(i => 
      i.contratos && (i.contratos as any)[0]?.status === 'assinado'
    ).length || 0;
    const credenciadosAtivos = validacao?.filter(i => 
      i.credenciados && (i.credenciados as any)[0]?.status === 'Ativo'
    ).length || 0;

    results.push({
      phase: 'D',
      success: true,
      message: '📊 Validação final concluída',
      details: {
        total_inscricoes: totalInscricoes,
        inscricoes_aprovadas: inscricoesAprovadas,
        contratos_assinados: contratosAssinados,
        credenciados_ativos: credenciadosAtivos,
        validacao_completa: validacao
      }
    });

    // ============================================================
    // RELATÓRIO FINAL
    // ============================================================
    const elapsedTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: failureCount === 0,
      message: failureCount === 0 
        ? '✅ Reprocessamento concluído com sucesso'
        : `⚠️ Reprocessamento concluído com ${failureCount} erro(s)`,
      summary: {
        total_fases: 4,
        operacoes_sucesso: successCount,
        operacoes_falha: failureCount,
        tempo_total_ms: elapsedTime
      },
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[ERROR]', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
