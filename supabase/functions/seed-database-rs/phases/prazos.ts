import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

const tiposPrazo = [
  'renovacao_crm',
  'renovacao_documento',
  'avaliacao_desempenho',
  'atualizacao_cadastral',
  'renovacao_contrato'
];

export async function seedPrazos(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-PRAZOS] Criando prazos de credenciamento (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'prazos', created: 150, errors: [], duration: 0 };
  }

  try {
    // Buscar credenciados ativos
    const { data: credenciados } = await supabase
      .from('credenciados')
      .select('id, nome, email')
      .eq('status', 'Ativo')
      .limit(100);

    if (!credenciados || credenciados.length === 0) {
      console.log('[SEED-PRAZOS] Nenhum credenciado encontrado');
      return { success: true, phase: 'prazos', created: 0, errors: [], duration: 0 };
    }

    for (const credenciado of credenciados) {
      // Criar 1-3 prazos por credenciado
      const numPrazos = 1 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < numPrazos && i < tiposPrazo.length; i++) {
        const hoje = new Date();
        const diasAteVencimento = 30 + Math.floor(Math.random() * 335); // 30-365 dias
        const dataVencimento = new Date(hoje);
        dataVencimento.setDate(dataVencimento.getDate() + diasAteVencimento);
        
        const status = diasAteVencimento < 15 ? 'alerta_critico' :
                      diasAteVencimento < 30 ? 'alerta' : 'ativo';
        
        const { error } = await supabase
          .from('prazos_credenciamento')
          .insert({
            credenciado_id: credenciado.id,
            tipo_prazo: tiposPrazo[i],
            descricao: `${tiposPrazo[i].replace(/_/g, ' ').toUpperCase()} - ${credenciado.nome}`,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            status,
            dias_antecedencia_alerta: 30,
            notificacao_enviada: diasAteVencimento < 30,
            observacoes: `Prazo criado automaticamente via seed`
          });

        if (error && !error.message.includes('duplicate')) {
          errors.push(`Erro ao criar prazo: ${error.message}`);
          continue;
        }

        created++;
      }
    }

    return { success: errors.length === 0, phase: 'prazos', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de prazos: ${error.message}`);
  }
}
