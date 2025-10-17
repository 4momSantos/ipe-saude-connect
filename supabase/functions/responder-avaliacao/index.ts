import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResponderAvaliacaoRequest {
  avaliacao_id: string;
  resposta: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header obrigatório');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Pegar usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { avaliacao_id, resposta }: ResponderAvaliacaoRequest = await req.json();

    console.log('[responder-avaliacao] Respondendo avaliação:', {
      avaliacao_id,
      user_id: user.id
    });

    // Validar resposta
    if (!resposta || resposta.trim().length < 10) {
      throw new Error('Resposta deve ter pelo menos 10 caracteres');
    }

    if (resposta.length > 500) {
      throw new Error('Resposta não pode exceder 500 caracteres');
    }

    // Buscar avaliação e verificar se usuário é o credenciado
    const { data: avaliacao, error: avaliacaoError } = await supabase
      .from('avaliacoes_publicas')
      .select(`
        id,
        credenciado_id,
        credenciados!inner(
          id,
          inscricao_id,
          inscricoes_edital!inner(candidato_id)
        )
      `)
      .eq('id', avaliacao_id)
      .single();

    if (avaliacaoError || !avaliacao) {
      throw new Error('Avaliação não encontrada');
    }

    // Verificar se o usuário é o dono do credenciado
    const credenciadoCandidatoId = (avaliacao.credenciados as any).inscricoes_edital.candidato_id;
    
    if (credenciadoCandidatoId !== user.id) {
      throw new Error('Você não tem permissão para responder esta avaliação');
    }

    // Atualizar avaliação com resposta
    const { data: avaliacaoAtualizada, error: updateError } = await supabase
      .from('avaliacoes_publicas')
      .update({
        resposta_profissional: resposta.trim(),
        respondido_em: new Date().toISOString(),
        respondido_por: user.id
      })
      .eq('id', avaliacao_id)
      .select()
      .single();

    if (updateError) {
      console.error('[responder-avaliacao] Erro ao atualizar:', updateError);
      throw updateError;
    }

    console.log('[responder-avaliacao] Resposta adicionada com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        avaliacao: avaliacaoAtualizada,
        mensagem: 'Resposta publicada com sucesso!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[responder-avaliacao] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
