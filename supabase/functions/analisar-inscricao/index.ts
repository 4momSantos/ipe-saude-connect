import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inscricao_id, analista_id, decisao, comentarios } = await req.json();

    if (!inscricao_id || !decisao) {
      throw new Error('inscricao_id e decisao são obrigatórios');
    }

    if (!['aprovado', 'rejeitado'].includes(decisao)) {
      throw new Error('decisao deve ser "aprovado" ou "rejeitado"');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[ANALISAR_INSCRICAO] Processando decisão:', { inscricao_id, decisao, analista_id });

    // Buscar dados da inscrição
    const { data: inscricao, error: inscricaoError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        edital_id,
        candidato_id,
        status,
        editais (
          id,
          titulo,
          numero_edital
        )
      `)
      .eq('id', inscricao_id)
      .single();

    if (inscricaoError) throw inscricaoError;
    if (!inscricao) throw new Error('Inscrição não encontrada');

    // Buscar análise existente
    const { data: analise } = await supabase
      .from('analises')
      .select('id')
      .eq('inscricao_id', inscricao_id)
      .single();

    if (decisao === 'aprovado') {
      // ✅ APROVAR
      
      // 1. Atualizar análise
      const { error: analiseError } = await supabase
        .from('analises')
        .update({
          status: 'aprovado',
          parecer: comentarios,
          analisado_em: new Date().toISOString(),
          analista_id
        })
        .eq('inscricao_id', inscricao_id);

      if (analiseError) throw analiseError;

      // 2. Atualizar inscrição
      const { error: updateError } = await supabase
        .from('inscricoes_edital')
        .update({
          status: 'aprovado',
          analisado_por: analista_id,
          analisado_em: new Date().toISOString()
        })
        .eq('id', inscricao_id);

      if (updateError) throw updateError;

      console.log('[ANALISAR_INSCRICAO] Inscrição aprovada');

      // 3. Gerar contrato via edge function
      console.log('[ANALISAR_INSCRICAO] Invocando geração de contrato...');
      const { error: contratoError } = await supabase.functions.invoke('gerar-contrato-assinatura', {
        body: { inscricao_id }
      });

      if (contratoError) {
        console.error('[ANALISAR_INSCRICAO] Erro ao gerar contrato:', contratoError);
      } else {
        console.log('[ANALISAR_INSCRICAO] Contrato gerado com sucesso');
      }

      // 4. Notificar candidato sobre aprovação
      await supabase.from('app_notifications').insert({
        user_id: inscricao.candidato_id,
        type: 'success',
        title: 'Inscrição Aprovada! 🎉',
        message: `Sua inscrição no edital "${(inscricao.editais as any).titulo}" foi aprovada! Em breve você receberá o contrato para assinatura.`,
        related_type: 'inscricao',
        related_id: inscricao_id
      });

      // 5. Notificar analista sobre aprovação
      if (analista_id) {
        await supabase.from('app_notifications').insert({
          user_id: analista_id,
          type: 'info',
          title: 'Análise Concluída',
          message: `Inscrição aprovada no edital "${(inscricao.editais as any).titulo}". Contrato em geração.`,
          related_type: 'inscricao',
          related_id: inscricao_id
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          inscricao_id,
          decisao: 'aprovado',
          contrato_gerado: !contratoError
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else {
      // ❌ REJEITAR
      
      // 1. Atualizar análise
      const { error: analiseError } = await supabase
        .from('analises')
        .update({
          status: 'reprovado',
          motivo_reprovacao: comentarios,
          analisado_em: new Date().toISOString(),
          analista_id
        })
        .eq('inscricao_id', inscricao_id);

      if (analiseError) throw analiseError;

      // 2. Atualizar inscrição
      const { error: updateError } = await supabase
        .from('inscricoes_edital')
        .update({
          status: 'inabilitado',
          motivo_rejeicao: comentarios,
          analisado_por: analista_id,
          analisado_em: new Date().toISOString()
        })
        .eq('id', inscricao_id);

      if (updateError) throw updateError;

      console.log('[ANALISAR_INSCRICAO] Inscrição rejeitada');

      // 3. Notificar candidato sobre rejeição
      await supabase.from('app_notifications').insert({
        user_id: inscricao.candidato_id,
        type: 'error',
        title: 'Inscrição Não Aprovada',
        message: `Sua inscrição no edital "${(inscricao.editais as any).titulo}" não foi aprovada. Motivo: ${comentarios || 'Não especificado'}`,
        related_type: 'inscricao',
        related_id: inscricao_id
      });

      // 4. Notificar analista sobre rejeição
      if (analista_id) {
        await supabase.from('app_notifications').insert({
          user_id: analista_id,
          type: 'info',
          title: 'Análise Concluída',
          message: `Inscrição rejeitada no edital "${(inscricao.editais as any).titulo}".`,
          related_type: 'inscricao',
          related_id: inscricao_id
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          inscricao_id,
          decisao: 'rejeitado'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

  } catch (error: any) {
    console.error('[ANALISAR_INSCRICAO] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
