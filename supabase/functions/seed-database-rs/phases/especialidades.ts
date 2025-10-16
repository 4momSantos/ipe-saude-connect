import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

const especialidadesPrioritarias = [
  { codigo: 'CARDIO', nome: 'Cardiologia' },
  { codigo: 'ORTOP', nome: 'Ortopedia' },
  { codigo: 'PEDIATR', nome: 'Pediatria' },
  { codigo: 'GINECO', nome: 'Ginecologia e Obstetrícia' },
  { codigo: 'NEURO', nome: 'Neurologia' },
  { codigo: 'OFTALMO', nome: 'Oftalmologia' },
  { codigo: 'DERMAT', nome: 'Dermatologia' },
  { codigo: 'PSIQ', nome: 'Psiquiatria' },
  { codigo: 'ENDOCR', nome: 'Endocrinologia' },
  { codigo: 'GASTRO', nome: 'Gastroenterologia' },
  { codigo: 'UROLOGO', nome: 'Urologia' },
  { codigo: 'OTORRIN', nome: 'Otorrinolaringologia' }
];

export async function seedEspecialidades(
  supabase: SupabaseClient,
  count: number,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-ESPECIALIDADES] Criando ${count} especialidades (dry run: ${dryRun})`);

  if (dryRun) {
    return {
      success: true,
      phase: 'especialidades',
      created: count,
      errors: [],
      duration: 0
    };
  }

  try {
    // Buscar especialidades existentes com count
    const { data: existing, count: existingCount } = await supabase
      .from('especialidades_medicas')
      .select('codigo', { count: 'exact' });
    
    // Se já existem especialidades suficientes, pular esta fase
    if (existingCount && existingCount >= count) {
      console.log(`[SEED-ESPECIALIDADES] ${existingCount} especialidades já existem (necessário: ${count}). Pulando fase.`);
      return {
        success: true,
        phase: 'especialidades',
        created: 0,
        errors: [],
        duration: 0
      };
    }

    const existingCodes = new Set(existing?.map(e => e.codigo) || []);

    const especialidadesToCreate = especialidadesPrioritarias
      .slice(0, count)
      .filter(esp => !existingCodes.has(esp.codigo));

    if (especialidadesToCreate.length === 0) {
      console.log('[SEED-ESPECIALIDADES] Todas as especialidades já existem');
      return {
        success: true,
        phase: 'especialidades',
        created: 0,
        errors: [],
        duration: 0
      };
    }

    const { data, error } = await supabase
      .from('especialidades_medicas')
      .insert(especialidadesToCreate.map(esp => ({
        codigo: esp.codigo,
        nome: esp.nome,
        ativa: true
      })))
      .select();

    if (error) {
      throw new Error(`Erro ao inserir especialidades: ${error.message}`);
    }

    created = data?.length || 0;

    return {
      success: true,
      phase: 'especialidades',
      created,
      errors,
      duration: 0
    };
  } catch (error) {
    throw new Error(`Falha na fase de especialidades: ${error.message}`);
  }
}
