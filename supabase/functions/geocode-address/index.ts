// Edge Function: geocode-address
// Geocodifica endereços usando Nominatim (OpenStreetMap) com cache

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  credenciado_id?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  force_refresh?: boolean;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  cached: boolean;
  provider: string;
  display_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body: GeocodeRequest = await req.json();
    console.log('[GEOCODE] Request:', body);

    let endereco = body.endereco;
    let cidade = body.cidade;
    let estado = body.estado;
    let cep = body.cep;

    // Se foi passado credenciado_id, buscar dados dele
    if (body.credenciado_id) {
      const { data: credenciado, error } = await supabase
        .from('credenciados')
        .select('endereco, cidade, estado, cep')
        .eq('id', body.credenciado_id)
        .single();

      if (error) throw new Error(`Credenciado não encontrado: ${error.message}`);

      endereco = credenciado.endereco;
      cidade = credenciado.cidade;
      estado = credenciado.estado;
      cep = credenciado.cep;
    }

    // Validar que temos endereço suficiente
    if (!endereco && !cidade) {
      throw new Error('Endereço ou cidade é obrigatório');
    }

    // Gerar hash do endereço para cache
    const { data: hashData, error: hashError } = await supabase.rpc(
      'generate_address_hash',
      {
        p_endereco: endereco || '',
        p_cidade: cidade || '',
        p_estado: estado || '',
        p_cep: cep || ''
      }
    );

    if (hashError) throw hashError;
    const addressHash = hashData as string;

    // Verificar cache primeiro (se não forçar refresh)
    if (!body.force_refresh) {
      const { data: cached } = await supabase
        .from('geocode_cache')
        .select('latitude, longitude, provider, metadata')
        .eq('address_hash', addressHash)
        .single();

      if (cached) {
        console.log('[GEOCODE] Cache hit:', addressHash);
        
        // Atualizar estatísticas do cache
        await supabase
          .from('geocode_cache')
          .update({
            last_used_at: new Date().toISOString(),
            hit_count: cached.metadata?.hit_count ? cached.metadata.hit_count + 1 : 1
          })
          .eq('address_hash', addressHash);

        // Se temos credenciado_id, atualizar ele também
        if (body.credenciado_id) {
          await supabase
            .from('credenciados')
            .update({
              latitude: cached.latitude,
              longitude: cached.longitude,
              geocoded_at: new Date().toISOString()
            })
            .eq('id', body.credenciado_id);
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              latitude: cached.latitude,
              longitude: cached.longitude,
              cached: true,
              provider: cached.provider,
              display_name: cached.metadata?.display_name
            } as GeocodeResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Cache miss - chamar API externa (Nominatim)
    console.log('[GEOCODE] Cache miss, chamando Nominatim');

    const fullAddress = [endereco, cidade, estado, 'Brasil']
      .filter(Boolean)
      .join(', ');

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', fullAddress);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '1');
    nominatimUrl.searchParams.set('countrycodes', 'br');

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'CredenciamentoApp/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      throw new Error('Endereço não encontrado');
    }

    const location = results[0];
    const latitude = parseFloat(location.lat);
    const longitude = parseFloat(location.lon);

    console.log('[GEOCODE] Nominatim result:', { latitude, longitude, display_name: location.display_name });

    // Salvar no cache
    const { error: cacheError } = await supabase
      .from('geocode_cache')
      .upsert({
        address_hash: addressHash,
        address_text: fullAddress,
        latitude,
        longitude,
        provider: 'nominatim',
        metadata: {
          display_name: location.display_name,
          osm_type: location.osm_type,
          osm_id: location.osm_id
        },
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        hit_count: 1
      }, {
        onConflict: 'address_hash'
      });

    if (cacheError) {
      console.error('[GEOCODE] Erro ao salvar cache:', cacheError);
    }

    // Atualizar credenciado se fornecido
    if (body.credenciado_id) {
      const { error: updateError } = await supabase
        .from('credenciados')
        .update({
          latitude,
          longitude,
          geocoded_at: new Date().toISOString()
        })
        .eq('id', body.credenciado_id);

      if (updateError) {
        console.error('[GEOCODE] Erro ao atualizar credenciado:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          latitude,
          longitude,
          cached: false,
          provider: 'nominatim',
          display_name: location.display_name
        } as GeocodeResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GEOCODE] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
