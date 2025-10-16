import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

const especialidadesPrioritarias = [
  { codigo: 'CARDIO', nome: 'Cardiologia', area: 'Clínica Médica' },
  { codigo: 'ORTOP', nome: 'Ortopedia', area: 'Cirurgia' },
  { codigo: 'PEDIATR', nome: 'Pediatria', area: 'Pediatria' },
  { codigo: 'GINECO', nome: 'Ginecologia e Obstetrícia', area: 'Ginecologia' },
  { codigo: 'NEURO', nome: 'Neurologia', area: 'Clínica Médica' },
  { codigo: 'OFTALMO', nome: 'Oftalmologia', area: 'Especialidades Cirúrgicas' },
  { codigo: 'DERMAT', nome: 'Dermatologia', area: 'Clínica Médica' },
  { codigo: 'PSIQ', nome: 'Psiquiatria', area: 'Saúde Mental' },
  { codigo: 'ENDOCR', nome: 'Endocrinologia', area: 'Clínica Médica' },
  { codigo: 'GASTRO', nome: 'Gastroenterologia', area: 'Clínica Médica' },
  { codigo: 'UROLOGO', nome: 'Urologia', area: 'Cirurgia' },
  { codigo: 'OTORRIN', nome: 'Otorrinolaringologia', area: 'Especialidades Cirúrgicas' }
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
    // Buscar especialidades existentes
    const { data: existing } = await supabase
      .from('especialidades_medicas')
      .select('codigo');

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
        area: esp.area,
        ativo: true
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
