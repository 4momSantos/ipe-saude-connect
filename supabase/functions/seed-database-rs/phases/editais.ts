import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedEditais(
  supabase: SupabaseClient,
  count: number,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-EDITAIS] Criando ${count} editais (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'editais', created: count, errors: [], duration: 0 };
  }

  try {
    // Verificar editais existentes
    const { count: existingCount } = await supabase
      .from('editais')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'publicado');

    if (existingCount && existingCount >= count) {
      console.log(`[SEED-EDITAIS] ${existingCount} editais já existem`);
      return { success: true, phase: 'editais', created: 0, errors: [], duration: 0 };
    }

    const { data: especialidades } = await supabase
      .from('especialidades_medicas')
      .select('id')
      .limit(5);

    if (!especialidades || especialidades.length === 0) {
      throw new Error('Nenhuma especialidade encontrada');
    }

    const { data: gestores } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'gestor')
      .limit(1);

    const createdBy = gestores?.[0]?.user_id;

    for (let i = 0; i < count - (existingCount || 0); i++) {
      const timestamp = Date.now();
      const numero = `SEED-${timestamp}-${i}`;
      
      const { data, error } = await supabase
        .from('editais')
        .insert({
          numero_edital: numero,
          titulo: `Credenciamento de Profissionais de Saúde - RS`,
          descricao: `Edital para credenciamento de profissionais da área da saúde para atendimento no Rio Grande do Sul.`,
          tipo: 'credenciamento',
          status: 'publicado',
          data_abertura: new Date(2024, 0, 1).toISOString(),
          data_encerramento: new Date(2024, 11, 31).toISOString(),
          vagas: 150,
          modalidade: 'credenciamento',
          created_by: createdBy
        })
        .select()
        .single();

      if (error && !error.message.includes('duplicate')) {
        errors.push(`Erro ao criar edital ${numero}: ${error.message}`);
        continue;
      }
      
      if (!data) continue;

      // Vincular especialidades
      if (data) {
        const { error: linkError } = await supabase
          .from('edital_especialidades')
          .insert(
            especialidades.slice(0, 3).map(esp => ({
              edital_id: data.id,
              especialidade_id: esp.id
            }))
          );

        if (linkError) {
          errors.push(`Erro ao vincular especialidades ao edital ${numero}: ${linkError.message}`);
        }
      }

      created++;
    }

    return { success: errors.length === 0, phase: 'editais', created, errors, duration: 0 };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Falha na fase de editais: ${errorMessage}`);
  }
}
