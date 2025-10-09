/**
 * Script para enriquecer credenciados em lote via OSM
 * 
 * Uso:
 *   npm install -g ts-node
 *   ts-node scripts/enriquecer-credenciados.ts
 * 
 * Ou via Deno:
 *   deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface EnrichmentStats {
  total: number;
  success: number;
  failed: number;
  cached: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Enriquecer credenciados sem bairro/CEP
 */
async function enrichCredenciados(limit = 50): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: 0,
    success: 0,
    failed: 0,
    cached: 0,
    errors: [],
  };

  console.log('🔍 Buscando credenciados para enriquecer...\n');

  // Buscar credenciados com lat/lon mas sem dados completos
  const { data: credenciados, error } = await supabase
    .from('credenciados')
    .select('id, nome, latitude, longitude, endereco, cidade, estado, cep')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('status', 'Ativo')
    .limit(limit);

  if (error) {
    console.error('❌ Erro ao buscar credenciados:', error);
    return stats;
  }

  if (!credenciados || credenciados.length === 0) {
    console.log('✅ Nenhum credenciado precisa de enriquecimento');
    return stats;
  }

  console.log(`📊 Encontrados ${credenciados.length} credenciados\n`);
  stats.total = credenciados.length;

  // Processar cada credenciado
  for (let i = 0; i < credenciados.length; i++) {
    const credenciado = credenciados[i];
    const progress = `[${i + 1}/${credenciados.length}]`;

    console.log(`${progress} Processando: ${credenciado.nome}`);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'enriquecer-endereco-osm',
        {
          body: { credenciado_id: credenciado.id },
        }
      );

      if (invokeError) throw invokeError;

      if (data.success) {
        stats.success++;
        if (data.cached) stats.cached++;
        
        console.log(`  ✅ Sucesso${data.cached ? ' (cache)' : ''}: ${data.cidade}, ${data.estado}`);
      } else {
        stats.failed++;
        stats.errors.push({ id: credenciado.id, error: data.error });
        console.log(`  ❌ Falha: ${data.error}`);
      }

    } catch (error) {
      stats.failed++;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      stats.errors.push({ id: credenciado.id, error: errorMsg });
      console.log(`  ❌ Erro: ${errorMsg}`);
    }

    // Rate limit: 1 req/s + margem de segurança
    if (i < credenciados.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  console.log('\n📈 Estatísticas finais:');
  console.log(`  Total processados: ${stats.total}`);
  console.log(`  ✅ Sucesso: ${stats.success} (${Math.round(100 * stats.success / stats.total)}%)`);
  console.log(`  💾 Cache hits: ${stats.cached} (${Math.round(100 * stats.cached / stats.total)}%)`);
  console.log(`  ❌ Falhas: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️ Erros detalhados:');
    stats.errors.forEach(({ id, error }) => {
      console.log(`  - ${id}: ${error}`);
    });
  }

  return stats;
}

/**
 * Validar CEPs via OSM
 */
async function validateCEPs(limit = 20) {
  console.log('🔍 Validando CEPs via OSM...\n');

  const { data: credenciados } = await supabase
    .from('credenciados')
    .select('id, nome, cep, latitude, longitude')
    .not('cep', 'is', null)
    .not('latitude', 'is', null)
    .eq('status', 'Ativo')
    .limit(limit);

  let divergencias = 0;

  for (const c of credenciados || []) {
    const { data } = await supabase.functions.invoke('enriquecer-endereco-osm', {
      body: { latitude: c.latitude, longitude: c.longitude },
    });

    if (data.success && data.cep && data.cep !== c.cep) {
      divergencias++;
      console.log(`⚠️ ${c.nome}:`);
      console.log(`   Informado: ${c.cep}`);
      console.log(`   OSM: ${data.cep}`);
    }

    await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\n📊 Total de divergências: ${divergencias}/${credenciados?.length || 0}`);
}

// Executar
if (import.meta.main) {
  const command = Deno.args[0] || 'enrich';
  const limit = parseInt(Deno.args[1] || '50');

  switch (command) {
    case 'enrich':
      await enrichCredenciados(limit);
      break;
    case 'validate':
      await validateCEPs(limit);
      break;
    default:
      console.log('Comandos disponíveis:');
      console.log('  enrich [limit]   - Enriquecer credenciados (default: 50)');
      console.log('  validate [limit] - Validar CEPs (default: 20)');
  }
}
