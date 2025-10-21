import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessarDecisaoRequest {
  inscricao_id: string;
  analise_id: string;
  decisao: {
    status: 'aprovado' | 'reprovado' | 'pendente_correcao';
    justificativa: string;
    campos_reprovados?: Array<{
      campo: string;
      secao: string;
      motivo: string;
      valor_atual?: string;
      valor_esperado?: string;
    }>;
    documentos_reprovados?: Array<{
      documento_id: string;
      tipo_documento: string;
      motivo: string;
      acao_requerida: 'reenviar' | 'complementar' | 'corrigir';
    }>;
    prazo_correcao?: string;
    proxima_etapa?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now(); // FASE 4: Métrica de duração
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // FASE 2: Feature toggle para rollback rápido
    const AUTO_GERAR_CONTRATO = Deno.env.get('AUTO_GERAR_CONTRATO') !== 'false';

    // Autenticação
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar permissões (analista/gestor/admin)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = roles?.some(r => 
      ['analista', 'gestor', 'admin'].includes(r.role)
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para processar decisões' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { inscricao_id, analise_id, decisao }: ProcessarDecisaoRequest = await req.json();

    // Log de debugging do payload recebido
    console.log('[DEBUG] Payload recebido:', {
      inscricao_id,
      analise_id,
      status: decisao.status,
      justificativa_length: decisao.justificativa?.length || 0,
      tem_prazo: !!decisao.prazo_correcao
    });

    // Validar justificativa (todos os status requerem 100 caracteres)
    const minCaracteres = 100;
    const errorMessage = 'Justificativa deve ter no mínimo 100 caracteres';
    
    if (!decisao.justificativa || decisao.justificativa.length < minCaracteres) {
      console.error('[VALIDACAO] Justificativa inválida:', {
        recebido: decisao.justificativa?.length || 0,
        minimo: 100,
        status: decisao.status
      });
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          detalhes: {
            caracteres_recebidos: decisao.justificativa?.length || 0,
            caracteres_minimos: 100
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar prazo se pendente_correcao
    if (decisao.status === 'pendente_correcao' && !decisao.prazo_correcao) {
      return new Response(
        JSON.stringify({ error: 'Prazo de correção é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar nome do analista
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single();

    const analista_nome = profile?.nome || user.email;

    // 1. Processar decisão usando transação atômica (database function)
    console.log(`[DECISAO] 🔄 Processando decisão via RPC: ${decisao.status}`);
    
    const { data: resultadoDecisao, error: decisaoError } = await supabase.rpc(
      'processar_decisao_inscricao',
      {
        p_inscricao_id: inscricao_id,
        p_analise_id: analise_id,
        p_analista_id: user.id,
        p_status_decisao: decisao.status,
        p_justificativa: decisao.justificativa,
        p_motivo_reprovacao: decisao.status === 'reprovado' ? decisao.justificativa : null,
        p_campos_reprovados: decisao.campos_reprovados || null,
        p_documentos_reprovados: decisao.documentos_reprovados || null,
        p_prazo_correcao: decisao.prazo_correcao || null
      }
    );

    if (decisaoError) {
      console.error('[DECISAO] ❌ Erro ao processar decisão (RPC):', decisaoError);
      throw decisaoError;
    }

    console.log(`[DECISAO] ✅ Decisão processada com sucesso:`, {
      status_analise: resultadoDecisao.status_analise,
      status_inscricao: resultadoDecisao.status_inscricao,
      inscricao_id: resultadoDecisao.inscricao_id
    });

    // 3. Registrar manifestação formal em workflow_messages
    const messageContent = decisao.status === 'aprovado' 
      ? `✅ **DECISÃO: APROVADO**\n\n${decisao.justificativa}`
      : decisao.status === 'reprovado'
      ? `❌ **DECISÃO: REPROVADO**\n\n${decisao.justificativa}`
      : `⚠️ **DECISÃO: CORREÇÃO SOLICITADA**\n\n${decisao.justificativa}\n\n**Prazo:** ${decisao.prazo_correcao}`;

    const { error: messageError } = await supabase
      .from('workflow_messages')
      .insert({
        inscricao_id,
        sender_id: user.id,
        sender_type: 'analista',
        content: messageContent,
        tipo: 'decisao',
        visivel_para: ['candidato', 'analista', 'gestor'],
        manifestacao_metadata: {
          decisao: decisao,
          analista_nome: analista_nome
        }
      });

    if (messageError) {
      console.error('[DECISAO] Erro ao criar mensagem:', messageError);
    }

    // 4. Atualizar documentos reprovados
    if (decisao.documentos_reprovados && decisao.documentos_reprovados.length > 0) {
      for (const doc of decisao.documentos_reprovados) {
        await supabase
          .from('inscricao_documentos')
          .update({
            status: 'rejeitado',
            observacoes: doc.motivo,
            analisado_por: user.id,
            analisado_em: new Date().toISOString()
          })
          .eq('id', doc.documento_id);
      }
    }

    // 5. FASE 2: Gerar contrato automaticamente se aprovado
    if (decisao.status === 'aprovado' && AUTO_GERAR_CONTRATO) {
      console.log(`[DECISAO] 🚀 Iniciando geração automática de contrato para inscrição ${inscricao_id}`);
      
      try {
        const { data: contratoData, error: contratoError } = await supabase.functions.invoke(
          'gerar-contrato-assinatura',
          {
            body: {
              inscricao_id: inscricao_id
            }
          }
        );

        if (contratoError) {
          console.error('[DECISAO] ❌ Erro ao gerar contrato:', contratoError);
          // ⚠️ NÃO bloqueia a aprovação, apenas registra erro
          await supabase
            .from('workflow_messages')
            .insert({
              inscricao_id,
              sender_id: user.id,
              sender_type: 'sistema',
              content: `⚠️ **AVISO**: Contrato não foi gerado automaticamente. Erro: ${contratoError.message}. Solicite geração manual.`,
              tipo: 'alerta',
              visivel_para: ['analista', 'gestor'],
              manifestacao_metadata: { erro: contratoError }
            });
        } else {
          console.log(`[DECISAO] ✅ Contrato gerado: ${contratoData?.numero_contrato || 'N/A'}`);
          
          // Registrar sucesso
          await supabase
            .from('workflow_messages')
            .insert({
              inscricao_id,
              sender_id: user.id,
              sender_type: 'sistema',
              content: `📄 **Contrato gerado automaticamente**: ${contratoData?.numero_contrato || 'N/A'}\n\nEnviado para assinatura via Assinafy.`,
              tipo: 'info',
              visivel_para: ['candidato', 'analista', 'gestor'],
              manifestacao_metadata: { 
                contrato_id: contratoData?.contrato_id,
                numero_contrato: contratoData?.numero_contrato 
              }
            });
        }
      } catch (err: any) {
        console.error('[DECISAO] 💥 Exceção ao gerar contrato:', err);
        // Não bloqueia aprovação
      }
    } else if (decisao.status === 'aprovado' && !AUTO_GERAR_CONTRATO) {
      console.log('[DECISAO] ⚠️ AUTO_GERAR_CONTRATO=false, geração manual necessária');
    }

    // 6. Criar notificação in-app para candidato
    const { data: inscricao } = await supabase
      .from('inscricoes_edital')
      .select('candidato_id')
      .eq('id', inscricao_id)
      .single();

    if (inscricao?.candidato_id) {
      const notificationTitle = decisao.status === 'aprovado' 
        ? '✅ Inscrição Aprovada'
        : decisao.status === 'reprovado'
        ? '❌ Inscrição Reprovada'
        : '⚠️ Correção Solicitada';

      const notificationMessage = decisao.status === 'aprovado'
        ? 'Sua inscrição foi aprovada! Verifique os próximos passos.'
        : decisao.status === 'reprovado'
        ? `Sua inscrição foi reprovada. Motivo: ${decisao.justificativa.substring(0, 100)}...`
        : `Correções foram solicitadas em sua inscrição. Prazo: ${decisao.prazo_correcao}`;

      await supabase
        .from('app_notifications')
        .insert({
          user_id: inscricao.candidato_id,
          type: decisao.status === 'aprovado' ? 'success' : 'warning',
          title: notificationTitle,
          message: notificationMessage,
          related_type: 'inscricao',
          related_id: inscricao_id
        });
    }

    // FASE 4: Log estruturado
    console.log(JSON.stringify({
      level: "info",
      action: "decisao_processada",
      inscricao_id,
      status: decisao.status,
      justificativa_length: decisao.justificativa.length,
      analista_id: user.id,
      contrato_gerado: decisao.status === 'aprovado' && AUTO_GERAR_CONTRATO,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }));

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Decisão registrada com sucesso',
        status: decisao.status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[DECISAO] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
