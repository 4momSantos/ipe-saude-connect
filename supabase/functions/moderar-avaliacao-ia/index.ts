import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModeracaoRequest {
  comentario: string;
  avaliador_nome?: string;
}

interface ModeracaoResponse {
  aprovado: boolean;
  score: number;
  motivo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { comentario, avaliador_nome }: ModeracaoRequest = await req.json();

    console.log('[moderar-avaliacao-ia] Iniciando moderação:', { 
      comentario_length: comentario?.length,
      tem_nome: !!avaliador_nome 
    });

    // Usar Lovable AI (gemini-2.5-flash) para moderação
    const prompt = `Você é um moderador de avaliações de profissionais de saúde.

Comentário: "${comentario}"
${avaliador_nome ? `Nome: ${avaliador_nome}` : 'AVALIAÇÃO ANÔNIMA'}

⚠️ IMPORTANTE: Avaliações anônimas tendem a ser mais breves e diretas. Seja tolerante com feedback objetivo.

Critérios para APROVAÇÃO (Score 70-100):
- Feedback genuíno, mesmo que breve ("bom", "ruim", "péssimo", "ótimo")
- Críticas diretas são VÁLIDAS e devem ser aprovadas
- Elogios simples são VÁLIDOS e devem ser aprovados
- Relatos objetivos de experiência
- Comentários curtos mas com sentido claro
- Linguagem informal é aceitável

Critérios para MODERAÇÃO MANUAL (Score 30-69):
- Comentários muito vagos sem qualquer contexto
- Apenas pontuação ou emoticons
- Suspeita de manipulação mas não conclusiva

Critérios para REJEIÇÃO (Score 0-29):
- Spam evidente (caracteres aleatórios, "asdfgh", "teste123")
- Ofensas pessoais graves ou discriminação
- Conteúdo sexual ou violento
- Ameaças ou intimidação
- Tentativa de golpe ou phishing

Responda APENAS com um JSON neste formato exato:
{
  "aprovado": true ou false,
  "score": número de 0 a 100 (0=spam/fake, 100=legítimo),
  "motivo": "breve explicação se score < 70" ou null se aprovado
}`;

    // Chamar Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Gateway error: ${aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    const conteudo = aiResult.choices[0].message.content;
    
    console.log('[moderar-avaliacao-ia] Resposta da IA:', conteudo);

    // Extrair JSON da resposta
    const jsonMatch = conteudo.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    const moderacao: ModeracaoResponse = JSON.parse(jsonMatch[0]);

    console.log('[moderar-avaliacao-ia] Resultado:', moderacao);

    return new Response(
      JSON.stringify(moderacao),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[moderar-avaliacao-ia] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        // Em caso de erro, aprovar manualmente (fallback seguro)
        aprovado: false,
        score: 50,
        motivo: 'Erro na moderação automática - requer revisão manual'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});
