import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

const comentariosPositivos = [
  'Excelente atendimento, profissional muito atencioso.',
  'Consulta rápida e eficiente, recomendo!',
  'Médico muito competente, tirou todas as minhas dúvidas.',
  'Ótima infraestrutura e equipe preparada.',
  'Atendimento humanizado e de qualidade.'
];

const comentariosNegativos = [
  'Demora excessiva no atendimento.',
  'Consulta muito rápida, não deu tempo de tirar dúvidas.',
  'Recepção não foi muito receptiva.'
];

export async function seedAvaliacoes(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-AVALIACOES] Criando avaliações públicas (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'avaliacoes', created: 200, errors: [], duration: 0 };
  }

  try {
    // Buscar credenciados ativos
    const { data: credenciados } = await supabase
      .from('credenciados')
      .select('id')
      .eq('status', 'Ativo')
      .limit(100);

    if (!credenciados || credenciados.length === 0) {
      console.log('[SEED-AVALIACOES] Nenhum credenciado encontrado');
      return { success: true, phase: 'avaliacoes', created: 0, errors: [], duration: 0 };
    }

    for (const credenciado of credenciados) {
      // Criar 1-5 avaliações por credenciado
      const numAvaliacoes = 1 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < numAvaliacoes; i++) {
        const nota = Math.random() > 0.2 
          ? 4 + Math.floor(Math.random() * 2) // 80% notas 4-5
          : 2 + Math.floor(Math.random() * 2); // 20% notas 2-3
        
        const comentarios = nota >= 4 ? comentariosPositivos : comentariosNegativos;
        const comentario = comentarios[Math.floor(Math.random() * comentarios.length)];
        
        const dataAtendimento = new Date(2024, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1);
        
        const { error } = await supabase
          .from('avaliacoes_publicas')
          .insert({
            credenciado_id: credenciado.id,
            nota_estrelas: nota,
            comentario,
            avaliador_nome: `Paciente ${Math.floor(Math.random() * 1000)}`,
            avaliador_email: `paciente${Math.floor(Math.random() * 10000)}@example.com`,
            avaliador_verificado: Math.random() > 0.5,
            data_atendimento: dataAtendimento.toISOString().split('T')[0],
            status: 'aprovada',
            tipo_servico: 'Consulta Médica'
          });

        if (error && !error.message.includes('duplicate')) {
          errors.push(`Erro ao criar avaliação: ${error.message}`);
          continue;
        }

        created++;
      }
    }

    return { success: errors.length === 0, phase: 'avaliacoes', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de avaliações: ${error.message}`);
  }
}
