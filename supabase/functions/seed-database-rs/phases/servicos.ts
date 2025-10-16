import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

const procedimentosComuns = [
  'Consulta Médica',
  'Exame Clínico',
  'Eletrocardiograma',
  'Teste Ergométrico',
  'Ultrassonografia',
  'Raio-X',
  'Avaliação Ortopédica',
  'Consulta Pediátrica',
  'Exame Ginecológico',
  'Avaliação Neurológica'
];

export async function seedServicos(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-SERVICOS] Criando serviços de credenciados (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'servicos', created: 100, errors: [], duration: 0 };
  }

  try {
    // Buscar credenciados ativos com CRMs
    const { data: credenciados } = await supabase
      .from('credenciados')
      .select('id, credenciado_crms(id, especialidade_id)')
      .eq('status', 'Ativo')
      .not('credenciado_crms', 'is', null)
      .limit(100);

    if (!credenciados || credenciados.length === 0) {
      console.log('[SEED-SERVICOS] Nenhum credenciado com CRM encontrado');
      return { success: true, phase: 'servicos', created: 0, errors: [], duration: 0 };
    }

    // Buscar procedimentos existentes
    const { data: procedimentos } = await supabase
      .from('procedimentos_medicos')
      .select('id, nome')
      .limit(30);

    if (!procedimentos || procedimentos.length === 0) {
      throw new Error('Nenhum procedimento encontrado');
    }

    for (const credenciado of credenciados) {
      const crms = Array.isArray(credenciado.credenciado_crms) 
        ? credenciado.credenciado_crms 
        : [credenciado.credenciado_crms];
      
      const crm = crms[0];
      if (!crm) continue;

      // Criar 2-4 serviços por credenciado
      const numServicos = 2 + Math.floor(Math.random() * 3);
      const servicosSelecionados = procedimentos
        .sort(() => Math.random() - 0.5)
        .slice(0, numServicos);

      for (const proc of servicosSelecionados) {
        const precoBase = 100 + Math.floor(Math.random() * 400);
        
        const { error } = await supabase
          .from('credenciado_servicos')
          .insert({
            credenciado_id: credenciado.id,
            profissional_id: crm.id,
            procedimento_id: proc.id,
            disponivel: true,
            preco_base: precoBase,
            preco_particular: precoBase * 1.2,
            preco_convenio: precoBase * 0.8,
            aceita_sus: Math.random() > 0.3,
            disponivel_online: Math.random() > 0.5,
            tempo_espera_medio: Math.floor(Math.random() * 30) + 5,
            dias_atendimento: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
              .filter(() => Math.random() > 0.3),
            horario_inicio: '08:00',
            horario_fim: '18:00'
          });

        if (error && !error.message.includes('duplicate')) {
          errors.push(`Erro ao criar serviço: ${error.message}`);
          continue;
        }

        created++;
      }
    }

    return { success: errors.length === 0, phase: 'servicos', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de serviços: ${error.message}`);
  }
}
