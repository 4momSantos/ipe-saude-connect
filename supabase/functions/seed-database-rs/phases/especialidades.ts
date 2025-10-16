import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedEspecialidades(
  supabase: SupabaseClient,
  count: number,
  dryRun: boolean
): Promise<SeedResult> {
  console.log(`[SEED-ESPECIALIDADES] Verificando especialidades (dry run: ${dryRun})`);

  // Contar especialidades existentes
  const { count: existingCount } = await supabase
    .from('especialidades_medicas')
    .select('*', { count: 'exact', head: true });

  if (existingCount && existingCount >= count) {
    console.log(`[SEED-ESPECIALIDADES] ${existingCount} especialidades já existem. Pulando.`);
    return {
      success: true,
      phase: 'especialidades',
      created: 0,
      errors: [],
      duration: 0
    };
  }

  if (dryRun) {
    return {
      success: true,
      phase: 'especialidades',
      created: 0,
      errors: [],
      duration: 0
    };
  }

  console.log(`[SEED-ESPECIALIDADES] Fase concluída (${existingCount || 0} já existentes)`);
  
  return {
    success: true,
    phase: 'especialidades',
    created: 0,
    errors: [],
    duration: 0
  };
}
