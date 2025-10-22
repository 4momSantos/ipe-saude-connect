import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CriarAvaliacaoRequest {
  credenciado_id: string;
  nota_estrelas: number;
  comentario: string;
  profissional_id?: string;
  nota_profissional?: number;
  comentario_profissional?: string;
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
    // ✅ Usar Service Role Key para acesso total ao schema
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: CriarAvaliacaoRequest = await req.json();

    console.log('[criar-avaliacao-publica] 📝 Payload recebido:', {
      credenciado_id: body.credenciado_id,
      nota_estrelas: body.nota_estrelas,
      comentario_length: body.comentario?.length,
      avaliador_anonimo: body.avaliador_anonimo
    });

    // 1. Validar credenciado existe
    const { data: credenciado, error: credenciadoError } = await supabase
      .from('credenciados')
      .select('id, nome')
      .eq('id', body.credenciado_id)
      .single();

    if (credenciadoError || !credenciado) {
      console.error('[criar-avaliacao-publica] ❌ Credenciado não encontrado:', credenciadoError);
      throw new Error('Credenciado não encontrado');
    }

    console.log('[criar-avaliacao-publica] ✅ Credenciado válido:', credenciado.nome);

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

    // 3. Aprovar avaliação automaticamente
    const status = 'aprovada';
    console.log('[criar-avaliacao-publica] ✅ Avaliação será aprovada automaticamente');

    // 4. Criar avaliação
    const { data: avaliacao, error: avaliacaoError } = await supabase
      .from('avaliacoes_publicas')
      .insert({
        credenciado_id: body.credenciado_id,
        nota_estrelas: body.nota_estrelas,
        comentario: body.comentario.trim(),
        profissional_id: body.profissional_id || null,
        nota_profissional: body.nota_profissional || null,
        comentario_profissional: body.comentario_profissional?.trim() || null,
        data_atendimento: body.data_atendimento || null,
        tipo_servico: body.tipo_servico || null,
        avaliador_nome: body.avaliador_anonimo ? null : body.avaliador_nome,
        avaliador_email: body.avaliador_anonimo ? null : body.avaliador_email,
        avaliador_anonimo: body.avaliador_anonimo || false,
        comprovante_url: body.comprovante_url || null,
        status,
        moderacao_ia_score: null,
        moderacao_ia_motivo: null,
        moderado_em: new Date().toISOString()
      })
      .select()
      .single();

    if (avaliacaoError) {
      console.error('[criar-avaliacao-publica] ❌ Erro ao criar:', {
        code: avaliacaoError.code,
        message: avaliacaoError.message,
        details: avaliacaoError.details,
        hint: avaliacaoError.hint
      });
      throw avaliacaoError;
    }

    console.log('[criar-avaliacao-publica] ✅ Avaliação criada:', {
      id: avaliacao.id,
      status: avaliacao.status
    });

    // 5. As estatísticas serão atualizadas automaticamente pelo trigger

    return new Response(
      JSON.stringify({
        success: true,
        avaliacao,
        mensagem: 'Avaliação publicada com sucesso!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[criar-avaliacao-publica] ❌ Erro geral:', {
      message: errorMessage,
      stack: errorStack
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
