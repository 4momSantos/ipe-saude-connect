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

    // Buscar candidatos SEM join complexo
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'candidato')
      .limit(count);

    if (!userRoles || userRoles.length === 0) {
      console.log('[SEED-INSCRICOES] Nenhum candidato encontrado');
      return { success: true, phase: 'inscricoes', created: 0, errors: [], duration: 0 };
    }

    for (const userRole of userRoles) {
      // Verificar se já tem inscrição aprovada
      const { count: existingCount } = await supabase
        .from('inscricoes_edital')
        .select('*', { count: 'exact', head: true })
        .eq('candidato_id', userRole.user_id)
        .eq('status', 'aprovado');

      if (existingCount && existingCount > 0) continue;

      // Buscar profile do candidato
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', userRole.user_id)
        .single();

      const dadosInscricao = {
        dados_pessoais: {
          nome_completo: profile?.nome || 'Candidato Seed',
          email: profile?.email || `seed${created}@example.com`,
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
          candidato_id: userRole.user_id,
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
