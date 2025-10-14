import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Buscar geometria do município do IBGE
    const url = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${codigoIBGE}?formato=application/vnd.geo+json&intrarregiao=distrito`;
    
    console.log(`[IBGE] Consultando: ${url}`);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.geo+json' }
    });

    if (!response.ok) {
      throw new Error(`Erro na API do IBGE: ${response.statusText}`);
    }

    const geojson = await response.json();
    console.log(`[IBGE] Encontrados ${geojson.features?.length || 0} distritos`);

    // Classificar distritos em zonas
    const zonas: Record<string, any[]> = {
      'Norte': [],
      'Sul': [],
      'Leste': [],
      'Oeste': [],
      'Centro': []
    };

    const centroMunicipio = CENTROS_CIDADES[cidade_nome as keyof typeof CENTROS_CIDADES];

    for (const feature of geojson.features || []) {
      const centroide = calcularCentroide(feature.geometry);
      const zona = classificarZona(centroide, centroMunicipio);
      
      zonas[zona].push({
        nome: feature.properties.name || feature.properties.nome,
        geometry: feature.geometry
      });
    }

    // Processar cada zona
    const resultados = [];
    
    for (const [zonaName, distritos] of Object.entries(zonas)) {
      if (distritos.length === 0) continue;

      console.log(`[IBGE] Processando zona ${zonaName} com ${distritos.length} distritos`);

      // Unir geometrias dos distritos
      const geometriaUnida = unirGeometrias(distritos.map(d => d.geometry));
      const geometriaSimplificada = simplificarGeometria(geometriaUnida, 0.001);

      // Atualizar zona no banco
      const { data: zona, error } = await supabase
        .from('zonas_geograficas')
        .update({
          geometry: geometriaUnida,
          geometry_simplified: geometriaSimplificada,
          geometria_fonte: 'IBGE',
          geometria_atualizada_em: new Date().toISOString(),
          distritos_inclusos: distritos.map(d => d.nome),
          ibge_codigo: codigoIBGE
        })
        .eq('cidade_id', cidade.id)
        .ilike('zona', `%${zonaName}%`)
        .select()
        .single();

      if (error) {
        console.error(`[IBGE] Erro ao atualizar ${zonaName}:`, error);
        resultados.push({ zona: zonaName, status: 'erro', erro: error.message });
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
