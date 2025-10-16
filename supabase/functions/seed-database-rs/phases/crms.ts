import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedCRMs(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-CRMS] Criando CRMs (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'crms', created: 100, errors: [], duration: 0 };
  }

  try {
    // Buscar credenciados sem CRM
    const { data: credenciados } = await supabase
      .from('credenciados')
      .select('id, cpf')
      .not('cpf', 'is', null)
      .is('credenciado_crms.id', null)
      .limit(200);

    if (!credenciados || credenciados.length === 0) {
      return { success: true, phase: 'crms', created: 0, errors: [], duration: 0 };
    }

    // Buscar especialidades
    const { data: especialidades } = await supabase
      .from('especialidades_medicas')
      .select('id, nome')
      .limit(8);

    if (!especialidades || especialidades.length === 0) {
      throw new Error('Nenhuma especialidade encontrada');
    }

    for (const credenciado of credenciados) {
      const crm = `${Math.floor(10000 + Math.random() * 90000)}`;
      const especialidade = especialidades[Math.floor(Math.random() * especialidades.length)];

      const { error } = await supabase
        .from('credenciado_crms')
        .insert({
          credenciado_id: credenciado.id,
          crm,
          uf_crm: 'RS',
          especialidade: especialidade.nome,
          especialidade_id: especialidade.id
        });

      if (error && !error.message.includes('duplicate')) {
        errors.push(`Erro ao criar CRM ${crm}: ${error.message}`);
        continue;
      }

      created++;
    }

    return { success: errors.length === 0, phase: 'crms', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de CRMs: ${error.message}`);
  }
}
