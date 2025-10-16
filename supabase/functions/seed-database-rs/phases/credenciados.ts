import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { enderecosPorZona, getNomesPorTipo } from '../data/enderecos-poa.ts';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedCredenciados(
  supabase: SupabaseClient,
  count: number,
  selectedZones?: string[],
  dryRun?: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-CREDENCIADOS] Criando ${count} credenciados (dry run: ${dryRun})`);

  if (dryRun) {
    return { success: true, phase: 'credenciados', created: count, errors: [], duration: 0 };
  }

  try {
    // Buscar Porto Alegre
    const { data: cidade } = await supabase
      .from('cidades')
      .select('id')
      .eq('nome', 'Porto Alegre')
      .eq('uf', 'RS')
      .single();

    if (!cidade) {
      throw new Error('Cidade Porto Alegre não encontrada');
    }

    // Buscar zonas
    const { data: zonas } = await supabase
      .from('zonas_geograficas')
      .select('id, zona')
      .eq('cidade_id', cidade.id);

    if (!zonas || zonas.length === 0) {
      throw new Error('Nenhuma zona encontrada para Porto Alegre');
    }

    // Filtrar zonas se selecionadas
    const zonasToUse = selectedZones && selectedZones.length > 0
      ? zonas.filter(z => selectedZones.includes(z.zona))
      : zonas;

    // Buscar inscrições aprovadas sem credenciado
    const { data: inscricoes } = await supabase
      .from('inscricoes_edital')
      .select('id, candidato_id, profiles(nome, email)')
      .eq('status', 'aprovado')
      .is('credenciados.id', null)
      .limit(count);

    if (!inscricoes || inscricoes.length === 0) {
      console.log('[SEED-CREDENCIADOS] Nenhuma inscrição aprovada sem credenciado encontrada');
      return { success: true, phase: 'credenciados', created: 0, errors: [], duration: 0 };
    }

    const nomesIndividuais = getNomesPorTipo('individual');
    const nomesJuridicos = getNomesPorTipo('juridico');

    for (let i = 0; i < inscricoes.length; i++) {
      const inscricao = inscricoes[i];
      const zona = zonasToUse[i % zonasToUse.length];
      const enderecos = enderecosPorZona[zona.zona as keyof typeof enderecosPorZona] || enderecosPorZona['Zona Norte'];
      const endereco = enderecos[i % enderecos.length];

      // 70% individual, 30% jurídico
      const tipo = i % 10 < 7 ? 'individual' : 'juridico';
      const nomes = tipo === 'individual' ? nomesIndividuais : nomesJuridicos;
      const nome = nomes[i % nomes.length];

      // Geocoding aproximado baseado na zona
      const geoOffset = {
        'Zona Norte': { lat: -30.000, lng: -51.180 },
        'Zona Sul': { lat: -30.060, lng: -51.220 },
        'Zona Leste': { lat: -30.030, lng: -51.180 },
        'Zona Oeste': { lat: -30.030, lng: -51.240 },
        'Centro Histórico': { lat: -30.030, lng: -51.230 }
      };

      const base = geoOffset[zona.zona as keyof typeof geoOffset] || { lat: -30.030, lng: -51.230 };
      const latitude = base.lat + (Math.random() * 0.02 - 0.01);
      const longitude = base.lng + (Math.random() * 0.02 - 0.01);

      const { error } = await supabase
        .from('credenciados')
        .insert({
          inscricao_id: inscricao.id,
          nome,
          cpf: tipo === 'individual' ? `${Math.floor(10000000000 + Math.random() * 90000000000)}` : null,
          cnpj: tipo === 'juridico' ? `${Math.floor(10000000000000 + Math.random() * 90000000000000)}` : null,
          email: inscricao.profiles?.email || `seed${i}@example.com`,
          telefone: `(51) ${Math.floor(3000 + Math.random() * 1000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          endereco: `${endereco.rua}, ${endereco.numero}`,
          bairro: endereco.bairro,
          cidade: 'Porto Alegre',
          estado: 'RS',
          cep: endereco.cep,
          latitude,
          longitude,
          zona_id: zona.id,
          cidade_id: cidade.id,
          status: 'Ativo',
          data_solicitacao: new Date(2024, 0, i % 30 + 1).toISOString(),
          data_habilitacao: new Date(2024, 1, i % 28 + 1).toISOString(),
          data_inicio_atendimento: new Date(2024, 2, 1).toISOString()
        });

      if (error) {
        errors.push(`Erro ao criar credenciado ${nome}: ${error.message}`);
        continue;
      }

      created++;

      // Rate limit
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { success: errors.length === 0, phase: 'credenciados', created, errors, duration: 0 };
  } catch (error) {
    throw new Error(`Falha na fase de credenciados: ${error.message}`);
  }
}
