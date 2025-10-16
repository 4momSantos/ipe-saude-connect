import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CriarAvaliacaoRequest {
  credenciado_id: string;
  nota_estrelas: number;
  comentario: string;
  data_atendimento?: string;
  tipo_servico?: string;
  avaliador_nome?: string;
  avaliador_email?: string;
  avaliador_anonimo?: boolean;
  comprovante_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: CriarAvaliacaoRequest = await req.json();

    console.log('[criar-avaliacao-publica] Criando avaliação:', {
      credenciado_id: body.credenciado_id,
      nota_estrelas: body.nota_estrelas
    });

    // 1. Validar credenciado existe
    const { data: credenciado, error: credenciadoError } = await supabase
      .from('credenciados')
      .select('id, nome')
      .eq('id', body.credenciado_id)
      .single();

    if (credenciadoError || !credenciado) {
      throw new Error('Credenciado não encontrado');
    }

    // 2. Validar campos obrigatórios
    if (!body.nota_estrelas || body.nota_estrelas < 1 || body.nota_estrelas > 5) {
      throw new Error('Nota deve estar entre 1 e 5 estrelas');
    }

    if (!body.comentario || body.comentario.trim().length < 10) {
      throw new Error('Comentário deve ter pelo menos 10 caracteres');
    }

    if (body.comentario.length > 500) {
      throw new Error('Comentário não pode exceder 500 caracteres');
    }

    // 3. Chamar moderação por IA
    const moderacaoResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/moderar-avaliacao-ia`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          comentario: body.comentario,
          avaliador_nome: body.avaliador_nome
        })
      }
    );

    const moderacao = await moderacaoResponse.json();

    console.log('[criar-avaliacao-publica] Resultado moderação:', moderacao);

    // 4. Determinar status baseado no score
    let status = 'pendente';
    if (moderacao.score >= 80) {
      status = 'aprovada';
    } else if (moderacao.score < 30) {
      status = 'rejeitada';
    }

    // 5. Criar avaliação
    const { data: avaliacao, error: avaliacaoError } = await supabase
      .from('avaliacoes_publicas')
      .insert({
        credenciado_id: body.credenciado_id,
        nota_estrelas: body.nota_estrelas,
        comentario: body.comentario.trim(),
        data_atendimento: body.data_atendimento || null,
        tipo_servico: body.tipo_servico || null,
        avaliador_nome: body.avaliador_anonimo ? null : body.avaliador_nome,
        avaliador_email: body.avaliador_anonimo ? null : body.avaliador_email,
        avaliador_anonimo: body.avaliador_anonimo || false,
        comprovante_url: body.comprovante_url || null,
        status,
        moderacao_ia_score: moderacao.score,
        moderacao_ia_motivo: moderacao.motivo,
        moderado_em: status !== 'pendente' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (avaliacaoError) {
      console.error('[criar-avaliacao-publica] Erro ao criar:', avaliacaoError);
      throw avaliacaoError;
    }

    console.log('[criar-avaliacao-publica] Avaliação criada:', {
      id: avaliacao.id,
      status: avaliacao.status
    });

    // 6. As estatísticas serão atualizadas automaticamente pelo trigger

    return new Response(
      JSON.stringify({
        success: true,
        avaliacao,
        mensagem: status === 'aprovada' 
          ? 'Avaliação publicada com sucesso!' 
          : status === 'pendente'
          ? 'Avaliação enviada para análise'
          : 'Avaliação não pôde ser aprovada'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    );

  } catch (error) {
    console.error('[criar-avaliacao-publica] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
