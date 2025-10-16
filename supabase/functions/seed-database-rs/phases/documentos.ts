import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

const tiposDocumento = [
  'CRM',
  'RQE',
  'Diploma',
  'Certidão Negativa',
  'Comprovante de Residência'
];

export async function seedDocumentos(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-DOCUMENTOS] Criando documentos de credenciados (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'documentos', created: 150, errors: [], duration: 0 };
  }

  try {
    // Buscar credenciados ativos
    const { data: credenciados } = await supabase
      .from('credenciados')
      .select('id')
      .eq('status', 'Ativo')
      .limit(100);

    if (!credenciados || credenciados.length === 0) {
      console.log('[SEED-DOCUMENTOS] Nenhum credenciado encontrado');
      return { success: true, phase: 'documentos', created: 0, errors: [], duration: 0 };
    }

    for (const credenciado of credenciados) {
      // Criar 3-5 documentos por credenciado
      const numDocs = 3 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < numDocs && i < tiposDocumento.length; i++) {
        const dataValidade = new Date();
        dataValidade.setFullYear(dataValidade.getFullYear() + 1 + Math.floor(Math.random() * 3));
        
        const { error } = await supabase
          .from('documentos_credenciados')
          .insert({
            credenciado_id: credenciado.id,
            tipo_documento: tiposDocumento[i],
            numero_documento: `DOC${Math.floor(Math.random() * 1000000)}`,
            data_emissao: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            data_validade: dataValidade.toISOString().split('T')[0],
            status: 'ativo',
            caminho_arquivo: `/seed-docs/credenciado-${credenciado.id}/${tiposDocumento[i].toLowerCase()}.pdf`
          });

        if (error && !error.message.includes('duplicate')) {
          errors.push(`Erro ao criar documento: ${error.message}`);
          continue;
        }

        created++;
      }
    }

    return { success: errors.length === 0, phase: 'documentos', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de documentos: ${error.message}`);
  }
}
