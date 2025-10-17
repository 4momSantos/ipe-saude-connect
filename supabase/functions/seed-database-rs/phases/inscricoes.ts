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

    for (let i = 0; i < userRoles.length; i++) {
      const userRole = userRoles[i];
      
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
        .maybeSingle();

      // Gerar tipo de credenciamento aleatório
      const tipoCredenciamento = Math.random() > 0.5 ? 'PF' : 'PJ';

      const dadosInscricao = {
        dados_pessoais: {
          nome_completo: profile?.nome || `Candidato Seed ${i + 1}`,
          email: profile?.email || `seed${created}@example.com`,
          cpf: `${Math.floor(Math.random() * 100000000000)}`,
          data_nascimento: '1985-05-15',
          crm: `${100000 + i}`,
          uf_crm: 'RS',
        },
        pessoa_juridica: tipoCredenciamento === 'PJ' ? {
          cnpj: '12345678000100',
          denominacao_social: `Clínica Seed ${i + 1}`,
          nome_fantasia: `Clínica ${i + 1}`,
        } : undefined,
        endereco_correspondencia: {
          endereco: 'Rua Exemplo, 123',
          cidade: 'Porto Alegre',
          estado: 'RS',
          cep: '90000-000'
        },
        consultorio: tipoCredenciamento === 'PF' ? {
          especialidades_ids: [],
          horarios: [
            {
              dia_semana: 'Segunda',
              horario_inicio: '08:00',
              horario_fim: '12:00',
            },
          ],
        } : undefined,
      };

      const { data: inscricaoData, error } = await supabase
        .from('inscricoes_edital')
        .insert({
          edital_id: editalId,
          candidato_id: userRole.user_id,
          tipo_credenciamento: tipoCredenciamento,
          dados_inscricao: dadosInscricao,
          status: 'aprovado',
          is_rascunho: false
        })
        .select()
        .maybeSingle();

      if (error && !error.message.includes('duplicate')) {
        errors.push(`Erro ao criar inscrição: ${error.message}`);
        continue;
      }

      // Se PJ, criar consultórios de exemplo
      if (tipoCredenciamento === 'PJ' && inscricaoData) {
        const consultoriosExemplo = [
          {
            inscricao_id: inscricaoData.id,
            nome_consultorio: 'Clínica Principal',
            cnes: `${1000000 + i}`,
            telefone: '51999999999',
            cep: '90000-000',
            logradouro: 'Rua Principal',
            numero: '100',
            bairro: 'Centro',
            cidade: 'Porto Alegre',
            estado: 'RS',
            responsavel_tecnico_nome: `Dr. Responsável ${i + 1}`,
            responsavel_tecnico_crm: `${200000 + i}`,
            responsavel_tecnico_uf: 'RS',
            is_principal: true,
            ativo: true,
          },
          {
            inscricao_id: inscricaoData.id,
            nome_consultorio: 'Clínica Filial',
            cnes: `${2000000 + i}`,
            telefone: '51988888888',
            cep: '91000-000',
            logradouro: 'Rua Secundária',
            numero: '200',
            bairro: 'Bom Fim',
            cidade: 'Porto Alegre',
            estado: 'RS',
            responsavel_tecnico_nome: `Dr. Secundário ${i + 1}`,
            responsavel_tecnico_crm: `${300000 + i}`,
            responsavel_tecnico_uf: 'RS',
            is_principal: false,
            ativo: true,
          },
        ];

        const { error: consultorioError } = await supabase
          .from('inscricao_consultorios')
          .insert(consultoriosExemplo);

        if (consultorioError) {
          console.error('[SEED-INSCRICOES] Erro ao criar consultórios:', consultorioError);
        }
      }

      created++;
    }

    return { success: errors.length === 0, phase: 'inscricoes', created, errors, duration: 0 };
  } catch (error: any) {
    throw new Error(`Falha na fase de inscrições: ${error?.message || 'Erro desconhecido'}`);
  }
}
