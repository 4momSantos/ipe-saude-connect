import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OSM_NOMINATIM = 'https://nominatim.openstreetmap.org';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zona_id, zona_nome, cidade_nome, uf } = await req.json();
    
    console.log(`[OSM] Buscando geometria para ${zona_nome}, ${cidade_nome}, ${uf}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Construir query de busca
    const query = `${zona_nome}, ${cidade_nome}, ${uf}, Brazil`;
    
    const url = `${OSM_NOMINATIM}/search?` + new URLSearchParams({
      q: query,
      format: 'json',
      polygon_geojson: '1',
      addressdetails: '1'
    });

    console.log(`[OSM] Consultando: ${url}`);
    
    // Respeitar rate limit do OSM (1 req/segundo)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CredenciamentoMedico/1.0 (contato@exemplo.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na API do OSM: ${response.statusText}`);
    }

    const results = await response.json();
    console.log(`[OSM] Encontrados ${results.length} resultados`);

    if (results.length === 0 || !results[0].geojson) {
      return new Response(
        JSON.stringify({ 
          error: 'Geometria não encontrada no OpenStreetMap',
          sugestao: 'Tente usar a API do IBGE ou ajustar o nome da zona'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geometry = results[0].geojson;
    const geometrySimplified = simplificarGeometria(geometry, 0.001);

    // Atualizar zona no banco
    const { data: zona, error } = await supabase
      .from('zonas_geograficas')
      .update({
        geometry: geometry,
        geometry_simplified: geometrySimplified,
        geometria_fonte: 'OpenStreetMap',
        geometria_atualizada_em: new Date().toISOString(),
        osm_id: results[0].osm_id,
      })
      .eq('id', zona_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`[OSM] ✓ Zona ${zona_nome} atualizada`);

    return new Response(
      JSON.stringify({
        success: true,
        zona: zona_nome,
        geometry_type: geometry.type,
        osm_id: results[0].osm_id,
        display_name: results[0].display_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[OSM] Erro:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function simplificarGeometria(geometry: any, tolerance: number): any {
  if (!geometry) return null;
  
  const fator = Math.max(1, Math.floor(1 / tolerance));
  
  function simplificarCoordenadas(coords: any[]): any[] {
    if (!Array.isArray(coords[0])) {
      return coords;
    }
    
    if (Array.isArray(coords[0][0])) {
      return coords.map(c => simplificarCoordenadas(c));
    }
    
    return coords.filter((_, i) => i % fator === 0 || i === coords.length - 1);
  }

  return {
    type: geometry.type,
    coordinates: simplificarCoordenadas(geometry.coordinates)
  };
}
