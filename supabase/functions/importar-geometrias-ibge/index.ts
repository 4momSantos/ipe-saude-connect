import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Converter TopoJSON para GeoJSON
function topojsonToGeojson(topology: any): any {
  console.log('[TOPOJSON] Convertendo para GeoJSON...');
  
  if (!topology.objects || Object.keys(topology.objects).length === 0) {
    throw new Error('TopoJSON inválido: sem objects');
  }

  const firstKey = Object.keys(topology.objects)[0];
  const collection = topology.objects[firstKey];
  
  if (collection.geometries && collection.geometries.length > 0) {
    const geom = collection.geometries[0];
    
    // Decodificar arcs usando transform
    const coordinates = decodeArcs(topology.arcs, topology.transform);
    
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: geom.properties || { codarea: geom.properties?.codarea },
        geometry: {
          type: 'Polygon',
          coordinates: coordinates
        }
      }]
    };
  }

  throw new Error('TopoJSON sem geometrias válidas');
}

function decodeArcs(arcs: any[], transform: any): number[][][] {
  if (!arcs || arcs.length === 0) return [];
  
  const { scale, translate } = transform;
  const coords: number[][] = [];
  
  let x = 0, y = 0;
  
  // Processar primeiro arc
  for (const point of arcs[0]) {
    x += point[0];
    y += point[1];
    
    const lng = x * scale[0] + translate[0];
    const lat = y * scale[1] + translate[1];
    
    coords.push([lng, lat]);
  }
  
  return [coords];
}

// Função auxiliar para retry com backoff exponencial
async function fetchComRetry(url: string, tentativas = 3, delay = 1000) {
  for (let i = 0; i < tentativas; i++) {
    try {
      console.log(`[IBGE] Tentativa ${i + 1}/${tentativas}: ${url}`);
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000)
      });
      
      if (response.ok) return response;
      
      console.warn(`[IBGE] Status ${response.status}: ${response.statusText}`);
      
      if (i < tentativas - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    } catch (error) {
      console.error(`[IBGE] Erro na tentativa ${i + 1}:`, error);
      if (i === tentativas - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw new Error('Falha após todas as tentativas');
}

const CODIGOS_IBGE = {
  'Recife': '2611606',
  'Porto Alegre': '4314902',
  'São Paulo': '3550308'
};

const CENTROS_CIDADES = {
  'Recife': { lat: -8.0476, lng: -34.8770 },
  'Porto Alegre': { lat: -30.0346, lng: -51.2177 },
  'São Paulo': { lat: -23.5505, lng: -46.6333 }
};

interface Coordenada {
  lat: number;
  lng: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cidade_nome } = await req.json();
    
    console.log(`[IBGE] Importando geometrias para ${cidade_nome}`);
    
    const codigoIBGE = CODIGOS_IBGE[cidade_nome as keyof typeof CODIGOS_IBGE];
    if (!codigoIBGE) {
      return new Response(
        JSON.stringify({ error: 'Cidade não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar cidade no banco
    const { data: cidade } = await supabase
      .from('cidades')
      .select('id')
      .eq('nome', cidade_nome)
      .single();

    if (!cidade) {
      return new Response(
        JSON.stringify({ error: 'Cidade não encontrada no banco' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX 6: Verificar se cidade tem zonas cadastradas
    const { count: totalZonas } = await supabase
      .from('zonas_geograficas')
      .select('*', { count: 'exact', head: true })
      .eq('cidade_id', cidade.id);

    if (!totalZonas || totalZonas === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Cidade não tem zonas cadastradas',
          detalhes: `Crie as zonas (Norte, Sul, Leste, Oeste, Centro) para ${cidade_nome} antes de importar geometrias`,
          cidade_id: cidade.id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[IBGE] Cidade tem ${totalZonas} zonas cadastradas`);

    // CORRIGIDO: URL sem intrarregiao (causa erro 400)
    const url = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${codigoIBGE}?formato=application/json`;
    
    console.log(`[IBGE] Consultando: ${url}`);
    
    const response = await fetchComRetry(url);

    if (!response.ok) {
      throw new Error(`Erro na API do IBGE: ${response.statusText}`);
    }

    let data = await response.json();
    
    console.log(`[IBGE] Tipo de resposta: ${data.type}`);
    
    // Converter TopoJSON para GeoJSON se necessário
    let geojson;
    if (data.type === 'Topology') {
      console.log(`[IBGE] Detectado TopoJSON, convertendo...`);
      geojson = topojsonToGeojson(data);
      console.log(`[IBGE] Conversão concluída: ${geojson.features.length} features`);
    } else if (data.type === 'FeatureCollection') {
      geojson = data;
    } else {
      console.error(`[IBGE] Tipo desconhecido:`, data);
      return new Response(
        JSON.stringify({ 
          error: 'API do IBGE retornou formato desconhecido',
          tipo: data.type
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validar estrutura
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      console.error(`[IBGE] GeoJSON inválido:`, geojson);
      return new Response(
        JSON.stringify({ 
          error: 'Geometria não encontrada',
          detalhes: 'API retornou dados mas sem features válidos'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[IBGE] ✓ ${geojson.features.length} geometrias carregadas`);

    // Classificar distritos em zonas
    const zonas: Record<string, any[]> = {
      'Norte': [],
      'Sul': [],
      'Leste': [],
      'Oeste': [],
      'Centro': []
    };

    const centroMunicipio = CENTROS_CIDADES[cidade_nome as keyof typeof CENTROS_CIDADES];
    
    // FIX 2: Logging do centro do município
    console.log(`[IBGE] Centro do município ${cidade_nome}:`, centroMunicipio);

    for (const feature of geojson.features || []) {
      const centroide = calcularCentroide(feature.geometry);
      const zona = classificarZona(centroide, centroMunicipio);
      
      zonas[zona].push({
        nome: feature.properties.name || feature.properties.nome,
        geometry: feature.geometry
      });
    }
    
    // FIX 2: Logging da distribuição de distritos
    console.log(`[IBGE] Distribuição de distritos por zona:`, Object.entries(zonas).map(([z, d]) => `${z}: ${d.length}`).join(', '));

    // Processar cada zona
    const resultados = [];
    
    for (const [zonaName, distritos] of Object.entries(zonas)) {
      if (distritos.length === 0) continue;

      console.log(`[IBGE] Processando zona ${zonaName} com ${distritos.length} distritos`);

      // Unir geometrias dos distritos
      const geometriaUnida = unirGeometrias(distritos.map(d => d.geometry));
      const geometriaSimplificada = simplificarGeometria(geometriaUnida, 0.001);

      // Buscar zona no banco pela coluna 'zona' (não 'nome')
      const { data: zonasEncontradas, error: searchError } = await supabase
        .from('zonas_geograficas')
        .select('id, zona')
        .eq('cidade_id', cidade.id)
        .ilike('zona', `%${zonaName}%`)
        .limit(1);

      if (searchError) {
        console.error(`[IBGE] Erro ao buscar zona ${zonaName}:`, searchError);
        resultados.push({ zona: zonaName, status: 'erro', erro: searchError.message });
        continue;
      }

      if (!zonasEncontradas || zonasEncontradas.length === 0) {
        console.warn(`[IBGE] ⚠️ Zona ${zonaName} não encontrada no banco para ${cidade_nome}`);
        resultados.push({ 
          zona: zonaName, 
          status: 'não encontrado', 
          distritos: distritos.length,
          aviso: 'Zona não existe no banco. Criar manualmente ou ajustar nome.'
        });
        continue;
      }

      const zonaId = zonasEncontradas[0].id;

      // Atualizar zona
      const { error: updateError } = await supabase
        .from('zonas_geograficas')
        .update({
          geometry: geometriaUnida,
          geometry_simplified: geometriaSimplificada,
          geometria_fonte: 'IBGE',
          geometria_atualizada_em: new Date().toISOString(),
          distritos_inclusos: distritos.map(d => d.nome),
          ibge_codigo: codigoIBGE
        })
        .eq('id', zonaId);

      if (updateError) {
        console.error(`[IBGE] Erro ao atualizar ${zonaName}:`, updateError);
        resultados.push({ zona: zonaName, status: 'erro', erro: updateError.message });
      } else {
        console.log(`[IBGE] ✓ ${zonaName} atualizada`);
        resultados.push({ 
          zona: zonaName, 
          status: 'atualizado',
          distritos: distritos.length 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cidade: cidade_nome,
        total_distritos: geojson.features?.length || 0,
        resultados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[IBGE] Erro:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calcularCentroide(geometry: any): Coordenada {
  let totalLat = 0, totalLng = 0, totalPontos = 0;

  function processarCoordenadas(coords: any[]) {
    for (const coord of coords) {
      if (Array.isArray(coord[0])) {
        processarCoordenadas(coord);
      } else {
        totalLng += coord[0];
        totalLat += coord[1];
        totalPontos++;
      }
    }
  }

  processarCoordenadas(geometry.coordinates);

  return {
    lat: totalLat / totalPontos,
    lng: totalLng / totalPontos
  };
}

function classificarZona(centroide: Coordenada, centro: Coordenada): string {
  const deltaLat = centroide.lat - centro.lat;
  const deltaLng = centroide.lng - centro.lng;
  
  const threshold = 0.05;
  
  if (Math.abs(deltaLat) > Math.abs(deltaLng)) {
    return deltaLat > threshold ? 'Norte' : deltaLat < -threshold ? 'Sul' : 'Centro';
  } else {
    return deltaLng > threshold ? 'Leste' : deltaLng < -threshold ? 'Oeste' : 'Centro';
  }
}

function unirGeometrias(geometrias: any[]): any {
  if (geometrias.length === 0) return null;
  if (geometrias.length === 1) return geometrias[0];

  // Simplificação: usar primeiro polígono e adicionar outros como MultiPolygon
  const coords = [];
  for (const geom of geometrias) {
    if (geom.type === 'Polygon') {
      coords.push(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      coords.push(...geom.coordinates);
    }
  }

  return {
    type: 'MultiPolygon',
    coordinates: coords
  };
}

function simplificarGeometria(geometry: any, tolerance: number): any {
  if (!geometry) return null;
  
  // Simplificação básica: reduzir pontos mantendo apenas 1 a cada N
  const fator = Math.max(1, Math.floor(1 / tolerance));
  
  function simplificarCoordenadas(coords: any[]): any[] {
    if (!Array.isArray(coords[0])) {
      return coords; // É um ponto individual
    }
    
    if (Array.isArray(coords[0][0])) {
      return coords.map(c => simplificarCoordenadas(c));
    }
    
    // É um array de coordenadas [lng, lat]
    return coords.filter((_, i) => i % fator === 0 || i === coords.length - 1);
  }

  return {
    type: geometry.type,
    coordinates: simplificarCoordenadas(geometry.coordinates)
  };
}
