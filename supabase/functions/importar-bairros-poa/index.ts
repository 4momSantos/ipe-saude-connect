import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento detalhado de bairros por zona em Porto Alegre
const BAIRROS_PORTO_ALEGRE: Record<string, string[]> = {
  'Zona Norte': [
    'Sarandi', 'Rubem Berta', 'Anchieta', 'Farrapos', 
    'Humaitá', 'Navegantes', 'Higienópolis', 'São Geraldo',
    'Jardim Lindóia', 'Vila Ipiranga'
  ],
  'Zona Sul': [
    'Restinga', 'Belém Novo', 'Lami', 'Ipanema',
    'Hípica', 'Serraria', 'Tristeza', 'Vila Assunção', 
    'Cavalhada', 'Cristal', 'Camaquã'
  ],
  'Zona Leste': [
    'Lomba do Pinheiro', 'Partenon', 'Santo António', 
    'Glória', 'Cruzeiro', 'São José', 'Agronomia',
    'Jardim Carvalho', 'Vila Jardim'
  ],
  'Zona Oeste': [
    'Santa Tereza', 'Jardim Botânico', 'Passo das Pedras',
    'Bom Jesus', 'Cristo Redentor', 'Medianeira',
    'Santa Rosa de Lima'
  ],
  'Centro Histórico': [
    'Centro Histórico', 'Cidade Baixa', 'Bom Fim', 
    'Independência', 'Floresta', 'Azenha', 'Santana',
    'Praia de Belas', 'Menino Deus'
  ]
};

interface GeoJSON {
  type: string;
  coordinates: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🗺️  INICIANDO IMPORTAÇÃO DE BAIRROS DE PORTO ALEGRE');

  try {
    const { cidade_nome } = await req.json();
    
    if (cidade_nome !== 'Porto Alegre') {
      throw new Error('Esta função suporta apenas Porto Alegre');
    }

    console.log(`📍 Processando: ${cidade_nome}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar cidade no banco
    const { data: cidade, error: cidadeError } = await supabase
      .from('cidades')
      .select('id, nome, uf, latitude_centro, longitude_centro')
      .eq('nome', cidade_nome)
      .single();

    if (cidadeError || !cidade) {
      throw new Error('Cidade não encontrada no banco de dados');
    }

    console.log(`✓ Cidade ID: ${cidade.id}`);

    const resultados = [];
    let totalBairrosProcessados = 0;

    // Para cada zona de Porto Alegre
    for (const [zonaName, bairros] of Object.entries(BAIRROS_PORTO_ALEGRE)) {
      console.log(`\n--- Processando ${zonaName} (${bairros.length} bairros) ---`);

      const geometrias: GeoJSON[] = [];
      const bairrosProcessados: string[] = [];

      // Buscar geometria dos primeiros 5 bairros (limite por performance)
      const bairrosParaBuscar = bairros.slice(0, 5);

      for (const bairro of bairrosParaBuscar) {
        try {
          console.log(`  Buscando: ${bairro}...`);

          const query = `${bairro}, Porto Alegre, RS, Brazil`;
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1`;

          const response = await fetch(url, {
            headers: { 
              'User-Agent': 'CredenciamentoMedico/1.0',
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            console.log(`    ⚠️ Erro HTTP: ${response.status}`);
            continue;
          }

          const results = await response.json();

          if (results.length > 0 && results[0].geojson) {
            geometrias.push(results[0].geojson);
            bairrosProcessados.push(bairro);
            console.log(`    ✓ Geometria encontrada`);
          } else {
            console.log(`    ⚠️ Sem geometria para ${bairro}`);
          }

          // Rate limiting OSM: 1 request por segundo
          await new Promise(resolve => setTimeout(resolve, 1100));

        } catch (error) {
          console.error(`    ❌ Erro ao buscar ${bairro}: ${error.message}`);
        }
      }

      // Se não encontrou nenhuma geometria, criar fallback baseado no centro
      if (geometrias.length === 0) {
        console.log(`  ⚠️ Nenhuma geometria encontrada, usando fallback`);
        
        // Criar retângulo baseado no centro da cidade com offset por zona
        const offset = 0.04;
        let latOffset = 0;
        let lngOffset = 0;

        switch (zonaName) {
          case 'Zona Norte':
            latOffset = offset;
            break;
          case 'Zona Sul':
            latOffset = -offset;
            break;
          case 'Zona Leste':
            lngOffset = offset;
            break;
          case 'Zona Oeste':
            lngOffset = -offset;
            break;
          case 'Centro Histórico':
            // Centro sem offset
            break;
        }

        const baseLat = cidade.latitude_centro + latOffset;
        const baseLng = cidade.longitude_centro + lngOffset;
        const size = 0.025;

        geometrias.push({
          type: 'Polygon',
          coordinates: [[
            [baseLng - size, baseLat - size],
            [baseLng + size, baseLat - size],
            [baseLng + size, baseLat + size],
            [baseLng - size, baseLat + size],
            [baseLng - size, baseLat - size]
          ]]
        });

        console.log(`  ✓ Geometria de fallback criada`);
      }

      // Unir todas as geometrias da zona
      const geometriaUnida = unirGeometrias(geometrias);
      totalBairrosProcessados += bairrosProcessados.length;

      // Buscar zona no banco
      const { data: zona, error: zonaError } = await supabase
        .from('zonas_geograficas')
        .select('id')
        .eq('cidade_id', cidade.id)
        .eq('zona', zonaName)
        .single();

      if (zonaError || !zona) {
        console.log(`  ⚠️ Zona '${zonaName}' não encontrada no banco`);
        resultados.push({ 
          zona: zonaName, 
          status: 'erro',
          erro: 'Zona não encontrada no banco de dados'
        });
        continue;
      }

      // Atualizar zona com geometria real
      const { error: updateError } = await supabase
        .from('zonas_geograficas')
        .update({
          geometry: geometriaUnida,
          geometria_fonte: bairrosProcessados.length > 0 ? 'OpenStreetMap' : 'Fallback Manual',
          geometria_atualizada_em: new Date().toISOString()
        })
        .eq('id', zona.id);

      if (updateError) {
        console.error(`  ❌ Erro ao atualizar zona: ${updateError.message}`);
        resultados.push({ 
          zona: zonaName, 
          status: 'erro',
          erro: updateError.message
        });
      } else {
        console.log(`  ✅ ${zonaName} atualizada com sucesso`);
        resultados.push({ 
          zona: zonaName, 
          status: 'atualizado',
          bairros: bairrosProcessados.length,
          bairros_nomes: bairrosProcessados
        });
      }
    }

    console.log(`\n✅ IMPORTAÇÃO CONCLUÍDA`);
    console.log(`📊 Total de bairros processados: ${totalBairrosProcessados}`);

    return new Response(
      JSON.stringify({
        success: true,
        cidade: cidade_nome,
        total_bairros: totalBairrosProcessados,
        total_zonas: Object.keys(BAIRROS_PORTO_ALEGRE).length,
        resultados
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 ERRO NA IMPORTAÇÃO:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function unirGeometrias(geometrias: GeoJSON[]): GeoJSON | null {
  if (geometrias.length === 0) return null;
  if (geometrias.length === 1) return geometrias[0];

  // Converter tudo para MultiPolygon
  const coords: any[] = [];
  
  for (const geom of geometrias) {
    if (geom.type === 'Polygon') {
      coords.push(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      coords.push(...geom.coordinates);
    } else if (geom.type === 'LineString' || geom.type === 'Point') {
      // Ignorar geometrias não-poligonais
      console.log(`  ⚠️ Geometria ${geom.type} ignorada (não-poligonal)`);
      continue;
    }
  }

  if (coords.length === 0) return null;
  if (coords.length === 1) {
    return {
      type: 'Polygon',
      coordinates: coords[0]
    };
  }

  return {
    type: 'MultiPolygon',
    coordinates: coords
  };
}
