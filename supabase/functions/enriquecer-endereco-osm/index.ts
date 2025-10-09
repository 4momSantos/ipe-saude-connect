import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnriquecerRequest {
  credenciado_id?: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
}

interface NominatimResponse {
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  display_name: string;
  lat: string;
  lon: string;
}

interface EnrichmentResult {
  success: boolean;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  pais?: string;
  endereco_completo?: string;
  latitude?: number;
  longitude?: number;
  cached?: boolean;
  provider: string;
  error?: string;
}

// Configurações
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'CredenciamentoSystem/1.0 (contact@example.com)'; // IMPORTANTE: Personalizar com email real
const RATE_LIMIT_DELAY = 1000; // 1 request/segundo (política OSM)
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/**
 * Delay entre requisições para respeitar rate limit
 */
let lastRequestTime = 0;
async function respectRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    console.log(`[RATE_LIMIT] Aguardando ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Reverse geocoding usando Nominatim
 */
async function reverseGeocode(lat: number, lon: number): Promise<NominatimResponse> {
  await respectRateLimit();
  
  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18'); // Máximo detalhe
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[REVERSE_GEO] Tentativa ${attempt}/${MAX_RETRIES} para (${lat}, ${lon})`);
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[REVERSE_GEO] Rate limit atingido, aguardando...');
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.address) {
        throw new Error('Resposta sem dados de endereço');
      }
      
      console.log('[REVERSE_GEO] Sucesso:', data.display_name);
      return data as NominatimResponse;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`[REVERSE_GEO] Erro na tentativa ${attempt}:`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }
  
  throw lastError || new Error('Falha desconhecida no reverse geocoding');
}

/**
 * Forward geocoding usando Nominatim
 */
async function forwardGeocode(address: string): Promise<NominatimResponse> {
  await respectRateLimit();
  
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[FORWARD_GEO] Tentativa ${attempt}/${MAX_RETRIES} para "${address}"`);
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[FORWARD_GEO] Rate limit atingido, aguardando...');
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('Nenhum resultado encontrado');
      }
      
      console.log('[FORWARD_GEO] Sucesso:', data[0].display_name);
      return data[0] as NominatimResponse;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`[FORWARD_GEO] Erro na tentativa ${attempt}:`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }
  
  throw lastError || new Error('Falha desconhecida no forward geocoding');
}

/**
 * Extrai informações regionais do resultado Nominatim
 */
function extractRegionalData(osmData: NominatimResponse): Partial<EnrichmentResult> {
  const addr = osmData.address;
  
  return {
    bairro: addr.suburb || addr.neighbourhood || undefined,
    cidade: addr.city || addr.town || addr.municipality || undefined,
    estado: addr.state || undefined,
    cep: addr.postcode || undefined,
    pais: addr.country || undefined,
    endereco_completo: osmData.display_name,
    latitude: parseFloat(osmData.lat),
    longitude: parseFloat(osmData.lon),
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: EnriquecerRequest = await req.json();
    console.log('[ENRICH_OSM] Request:', JSON.stringify(body));

    let latitude: number | undefined;
    let longitude: number | undefined;
    let credenciadoId: string | undefined = body.credenciado_id;
    let endereco: string | undefined = body.endereco;

    // Se credenciado_id fornecido, buscar dados do DB
    if (credenciadoId) {
      const { data: credenciado, error } = await supabase
        .from('credenciados')
        .select('latitude, longitude, endereco, cidade, estado, cep')
        .eq('id', credenciadoId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar credenciado: ${error.message}`);
      }

      latitude = credenciado.latitude;
      longitude = credenciado.longitude;
      endereco = endereco || [
        credenciado.endereco,
        credenciado.cidade,
        credenciado.estado,
        credenciado.cep,
      ].filter(Boolean).join(', ');
    } else {
      latitude = body.latitude;
      longitude = body.longitude;
    }

    // Verificar cache primeiro (usando geocode_cache)
    if (latitude && longitude) {
      const cacheKey = `reverse_${latitude.toFixed(6)}_${longitude.toFixed(6)}`;
      
      const { data: cached } = await supabase
        .from('geocode_cache')
        .select('*')
        .eq('address_hash', cacheKey)
        .maybeSingle();

      if (cached && cached.metadata) {
        console.log('[ENRICH_OSM] Cache hit para reverse geocoding');
        
        // Atualizar hit_count
        await supabase
          .from('geocode_cache')
          .update({ 
            hit_count: cached.hit_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', cached.id);

        const enrichedData: EnrichmentResult = {
          success: true,
          ...cached.metadata as Partial<EnrichmentResult>,
          cached: true,
          provider: 'nominatim',
        };

        // Atualizar credenciado se fornecido
        if (credenciadoId && enrichedData.bairro) {
          await supabase
            .from('credenciados')
            .update({
              cidade: enrichedData.cidade,
              estado: enrichedData.estado,
              cep: enrichedData.cep,
              updated_at: new Date().toISOString(),
            })
            .eq('id', credenciadoId);
        }

        return new Response(
          JSON.stringify(enrichedData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Se tem lat/lon, fazer reverse geocoding
    let osmData: NominatimResponse;
    
    if (latitude && longitude) {
      console.log(`[ENRICH_OSM] Reverse geocoding: (${latitude}, ${longitude})`);
      osmData = await reverseGeocode(latitude, longitude);
    } 
    // Se tem apenas endereço, fazer forward geocoding
    else if (endereco) {
      console.log(`[ENRICH_OSM] Forward geocoding: "${endereco}"`);
      osmData = await forwardGeocode(endereco);
    } 
    else {
      throw new Error('Forneça credenciado_id, lat/lon ou endereço');
    }

    // Extrair dados regionais
    const enrichedData = extractRegionalData(osmData);

    // Salvar no cache
    const cacheKey = latitude && longitude 
      ? `reverse_${latitude.toFixed(6)}_${longitude.toFixed(6)}`
      : `forward_${endereco}`;

    await supabase
      .from('geocode_cache')
      .upsert({
        address_hash: cacheKey,
        address_text: endereco || osmData.display_name,
        latitude: enrichedData.latitude!,
        longitude: enrichedData.longitude!,
        provider: 'nominatim',
        metadata: enrichedData,
      });

    // Atualizar credenciado se fornecido
    if (credenciadoId) {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (enrichedData.bairro) updateData.endereco = enrichedData.bairro;
      if (enrichedData.cidade) updateData.cidade = enrichedData.cidade;
      if (enrichedData.estado) updateData.estado = enrichedData.estado;
      if (enrichedData.cep) updateData.cep = enrichedData.cep;
      if (enrichedData.latitude) updateData.latitude = enrichedData.latitude;
      if (enrichedData.longitude) updateData.longitude = enrichedData.longitude;

      const { error: updateError } = await supabase
        .from('credenciados')
        .update(updateData)
        .eq('id', credenciadoId);

      if (updateError) {
        console.error('[ENRICH_OSM] Erro ao atualizar credenciado:', updateError);
        throw updateError;
      }

      console.log(`[ENRICH_OSM] Credenciado ${credenciadoId} atualizado com sucesso`);
    }

    const result: EnrichmentResult = {
      success: true,
      ...enrichedData,
      cached: false,
      provider: 'nominatim',
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[ENRICH_OSM] Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        provider: 'nominatim',
      }),
      { 
        status: 200, // Retorna 200 para não causar retry
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
