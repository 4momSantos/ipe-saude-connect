import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedContratos(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-CONTRATOS] Criando contratos de credenciamento (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'contratos', created: 100, errors: [], duration: 0 };
  }

  try {
    // Buscar inscrições aprovadas com credenciados
    const { data: inscricoes } = await supabase
      .from('inscricoes_edital')
      .select('id, credenciados(id)')
      .eq('status', 'aprovado')
      .not('credenciados', 'is', null)
      .limit(100);

    if (!inscricoes || inscricoes.length === 0) {
      console.log('[SEED-CONTRATOS] Nenhuma inscrição aprovada com credenciado encontrada');
      return { success: true, phase: 'contratos', created: 0, errors: [], duration: 0 };
    }

    for (let i = 0; i < inscricoes.length; i++) {
      const inscricao = inscricoes[i];
      const numeroContrato = `CONT-2024-${String(i + 1).padStart(6, '0')}`;
      
      // 80% assinados, 20% pendentes
      const status = Math.random() > 0.2 ? 'assinado' : 'pendente_assinatura';
      
      const { error } = await supabase
        .from('contratos')
        .insert({
          inscricao_id: inscricao.id,
          numero_contrato: numeroContrato,
          tipo: 'credenciamento',
          status,
          dados_contrato: {
            vigencia_inicio: new Date(2024, 2, 1).toISOString(),
            vigencia_fim: new Date(2026, 1, 28).toISOString(),
            valor_mensal: 5000 + Math.floor(Math.random() * 10000),
            clausulas: 'Contrato de credenciamento padrão'
          },
          gerado_em: new Date(2024, 1, i % 28 + 1).toISOString(),
          assinado_em: status === 'assinado' 
            ? new Date(2024, 2, i % 31 + 1).toISOString() 
            : null
        });

      if (error && !error.message.includes('duplicate')) {
        errors.push(`Erro ao criar contrato ${numeroContrato}: ${error.message}`);
        continue;
      }

      created++;
    }

    return { success: errors.length === 0, phase: 'contratos', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de contratos: ${error.message}`);
  }
}
