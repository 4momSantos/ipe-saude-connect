import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedInscricoes(
  supabase: SupabaseClient,
  count: number,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-INSCRICOES] Criando ${count} inscrições (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'inscricoes', created: count, errors: [], duration: 0 };
  }

  try {
    const { data: editais } = await supabase
      .from('editais')
      .select('id')
      .eq('status', 'publicado')
      .limit(1);

    if (!editais || editais.length === 0) {
      throw new Error('Nenhum edital publicado encontrado');
    }

    const editalId = editais[0].id;

    // Buscar candidatos sem inscrição aprovada
    const { data: candidatos } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(nome, email)
      `)
      .eq('role', 'candidato')
      .limit(count);

    if (!candidatos || candidatos.length === 0) {
      console.log('[SEED-INSCRICOES] Nenhum candidato encontrado');
      return { success: true, phase: 'inscricoes', created: 0, errors: [], duration: 0 };
    }

    for (const candidato of candidatos) {
      // Verificar se já tem inscrição
      const { data: existing } = await supabase
        .from('inscricoes_edital')
        .select('id')
        .eq('candidato_id', candidato.user_id)
        .eq('status', 'aprovado')
        .single();

      if (existing) continue;

      const dadosInscricao = {
        dados_pessoais: {
          nome_completo: candidato.profiles?.nome || 'Candidato Seed',
          email: candidato.profiles?.email,
          cpf: `${Math.floor(Math.random() * 100000000000)}`,
          data_nascimento: '1985-05-15'
        },
        endereco_correspondencia: {
          endereco: 'Rua Exemplo, 123',
          cidade: 'Porto Alegre',
          estado: 'RS',
          cep: '90000-000'
        }
      };

      const { error } = await supabase
        .from('inscricoes_edital')
        .insert({
          edital_id: editalId,
          candidato_id: candidato.user_id,
          dados_inscricao: dadosInscricao,
          status: 'aprovado',
          is_rascunho: false
        });

      if (error && !error.message.includes('duplicate')) {
        errors.push(`Erro ao criar inscrição: ${error.message}`);
        continue;
      }

      created++;
    }

    return { success: errors.length === 0, phase: 'inscricoes', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de inscrições: ${error.message}`);
  }
}
