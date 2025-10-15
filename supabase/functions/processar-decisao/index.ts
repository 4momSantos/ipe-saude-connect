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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Validar justificativa (aprovação requer 100 chars, outros 50)
    const minCaracteres = decisao.status === 'aprovado' ? 100 : 50;
    const errorMessage = 'Justificativa deve ter no mínimo ' + minCaracteres + ' caracteres';
    
    if (!decisao.justificativa || decisao.justificativa.length < minCaracteres) {
      return new Response(
        JSON.stringify({ error: errorMessage }),
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

    // 1. Atualizar tabela analises
    const statusAnalise = decisao.status === 'aprovado' ? 'aprovada' : 
                          decisao.status === 'reprovado' ? 'rejeitada' : 
                          'pendente_correcao';

    const { error: updateAnaliseError } = await supabase
      .from('analises')
      .update({
        status: statusAnalise,
        parecer: decisao.justificativa,
        motivo_reprovacao: decisao.status === 'reprovado' ? decisao.justificativa : null,
        analista_id: user.id,
        analisado_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', analise_id);

    if (updateAnaliseError) {
      console.error('[DECISAO] Erro ao atualizar análise:', updateAnaliseError);
      throw updateAnaliseError;
    }

    // 2. Atualizar inscricoes_edital
    const statusInscricao = decisao.status === 'aprovado' ? 'aprovado' : 
                            decisao.status === 'reprovado' ? 'inabilitado' : 
                            'aguardando_correcao';

    const { error: updateInscricaoError } = await supabase
      .from('inscricoes_edital')
      .update({
        status: statusInscricao,
        analisado_por: user.id,
        analisado_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', inscricao_id);

    if (updateInscricaoError) {
      console.error('[DECISAO] Erro ao atualizar inscrição:', updateInscricaoError);
      throw updateInscricaoError;
    }

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
        tipo_manifestacao: 'decisao',
        visivel_para: ['candidato', 'analista', 'gestor'],
        metadata: {
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

    // 5. Criar notificação in-app para candidato
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

    console.log(`[DECISAO] Decisão processada: ${decisao.status} para inscrição ${inscricao_id}`);

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
