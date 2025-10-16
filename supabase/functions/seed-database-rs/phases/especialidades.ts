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
  console.log(`[SEED-ESPECIALIDADES] Verificando especialidades (necessário: ${count}, dry run: ${dryRun})`);

  try {
    // Contar especialidades existentes
    const { count: existingCount } = await supabase
      .from('especialidades_medicas')
      .select('*', { count: 'exact', head: true });

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

    if (dryRun) {
      return {
        success: true,
        phase: 'especialidades',
        created: count - (existingCount || 0),
        errors: [],
        duration: 0
      };
    }

    // Buscar códigos existentes
    const { data: existing } = await supabase
      .from('especialidades_medicas')
      .select('codigo');

    const existingCodes = new Set(existing?.map(e => e.codigo) || []);
    
    // Filtrar especialidades que ainda não existem
    const especialidadesToCreate = especialidadesPrioritarias
      .filter(esp => !existingCodes.has(esp.codigo))
      .slice(0, count - (existingCount || 0));

    if (especialidadesToCreate.length === 0) {
      console.log('[SEED-ESPECIALIDADES] Todas as especialidades necessárias já existem');
      return {
        success: true,
        phase: 'especialidades',
        created: 0,
        errors: [],
        duration: 0
      };
    }

    // Inserir especialidades faltantes
    const { data, error } = await supabase
      .from('especialidades_medicas')
      .insert(especialidadesToCreate.map(esp => ({
        codigo: esp.codigo,
        nome: esp.nome,
        ativa: true
      })))
      .select();

    if (error) {
      // Se erro de duplicata, apenas registrar
      if (error.message.includes('duplicate key')) {
        console.log(`[SEED-ESPECIALIDADES] Algumas especialidades já existiam (duplicata ignorada)`);
        return {
          success: true,
          phase: 'especialidades',
          created: 0,
          errors: [],
          duration: 0
        };
      }
      throw new Error(`Erro ao inserir especialidades: ${error.message}`);
    }

    const created = data?.length || 0;
    console.log(`[SEED-ESPECIALIDADES] ${created} especialidades criadas`);

    return {
      success: true,
      phase: 'especialidades',
      created,
      errors: [],
      duration: 0
    };
  } catch (error) {
    throw new Error(`Falha na fase de especialidades: ${error.message}`);
  }
}
