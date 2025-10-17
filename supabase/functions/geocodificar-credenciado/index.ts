// Edge Function: geocodificar-credenciado
// Geocodifica endereços usando Nominatim ou Mapbox com cache e retry inteligente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodingRequest {
  credenciado_id?: string;
  consultorio_id?: string;
  endereco?: string;
  endereco_completo?: string;
  cep?: string;
  force_refresh?: boolean;
}

interface GeocodingResponse {
  success: boolean;
  lat?: number;
  lon?: number;
  source?: 'cache' | 'nominatim' | 'mapbox';
  message?: string;
  cached?: boolean;
  provider?: string;
}

interface LogEntry {
  timestamp: string;
  credenciado_id?: string;
  address_hash?: string;
  action: string;
  provider?: string;
  status?: number;
  latency_ms?: number;
  error?: string;
}

// Configuração de ambiente
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GEOCODING_PROVIDER = Deno.env.get('GEOCODING_PROVIDER') || 'nominatim';
const GEOCODING_USER_AGENT = Deno.env.get('GEOCODING_USER_AGENT') || 'CredenciamentoApp/1.0';
const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// Logger estruturado
function log(entry: LogEntry) {
  console.log(JSON.stringify({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  }));
}

// Calcular hash SHA-256 do endereço
async function calculateAddressHash(address: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(address.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Sleep helper para retry
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Geocoding via Nominatim com retry e backoff
async function geocodeWithNominatim(address: string): Promise<{ lat: number; lon: number; display_name: string }> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      log({
        timestamp: new Date().toISOString(),
        action: 'nominatim_request',
        provider: 'nominatim',
        attempt: attempt + 1,
      } as any);

      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', address);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'br');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': GEOCODING_USER_AGENT,
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      log({
        timestamp: new Date().toISOString(),
        action: 'nominatim_response',
        provider: 'nominatim',
        status: response.status,
        latency_ms: latency,
      } as any);

      if (response.status === 429) {
        const retryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        log({
          timestamp: new Date().toISOString(),
          action: 'rate_limit_hit',
          provider: 'nominatim',
          retry_delay_ms: retryDelay,
        } as any);
        await sleep(retryDelay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        throw new Error('Endereço não encontrado');
      }

      const location = results[0];
      return {
        lat: parseFloat(location.lat),
        lon: parseFloat(location.lon),
        display_name: location.display_name,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      log({
        timestamp: new Date().toISOString(),
        action: 'nominatim_error',
        provider: 'nominatim',
        error: lastError.message,
        attempt: attempt + 1,
      } as any);

      if (attempt < MAX_RETRIES - 1) {
        const retryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await sleep(retryDelay);
      }
    }
  }

  throw lastError || new Error('Falha após todas as tentativas');
}

// Geocoding via Mapbox com retry e backoff
async function geocodeWithMapbox(address: string): Promise<{ lat: number; lon: number; display_name: string }> {
  if (!MAPBOX_API_KEY) {
    throw new Error('MAPBOX_API_KEY não configurado');
  }

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      log({
        timestamp: new Date().toISOString(),
        action: 'mapbox_request',
        provider: 'mapbox',
        attempt: attempt + 1,
      } as any);

      const encodedAddress = encodeURIComponent(address + ', Brasil');
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_API_KEY}&country=br&language=pt&limit=1`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          'User-Agent': GEOCODING_USER_AGENT,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      log({
        timestamp: new Date().toISOString(),
        action: 'mapbox_response',
        provider: 'mapbox',
        status: response.status,
        latency_ms: latency,
      } as any);

      if (response.status === 429) {
        const retryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        log({
          timestamp: new Date().toISOString(),
          action: 'rate_limit_hit',
          provider: 'mapbox',
          retry_delay_ms: retryDelay,
        } as any);
        await sleep(retryDelay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw new Error('Endereço não encontrado');
      }

      const location = data.features[0];
      return {
        lon: location.center[0],
        lat: location.center[1],
        display_name: location.place_name,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      log({
        timestamp: new Date().toISOString(),
        action: 'mapbox_error',
        provider: 'mapbox',
        error: lastError.message,
        attempt: attempt + 1,
      } as any);

      if (attempt < MAX_RETRIES - 1) {
        const retryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await sleep(retryDelay);
      }
    }
  }

  throw lastError || new Error('Falha após todas as tentativas');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    log({
      timestamp: new Date().toISOString(),
      action: 'request_received',
      request_id: requestId,
    } as any);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body: GeocodingRequest = await req.json();

    // Validação de entrada
    if (!body.credenciado_id && !body.consultorio_id && !body.endereco && !body.endereco_completo) {
      log({
        timestamp: new Date().toISOString(),
        action: 'validation_error',
        request_id: requestId,
        error: 'credenciado_id, consultorio_id ou endereco obrigatório',
      } as any);

      return new Response(
        JSON.stringify({
          success: false,
          message: 'credenciado_id, consultorio_id ou endereco é obrigatório',
        } as GeocodingResponse),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let endereco = body.endereco || body.endereco_completo;
    let credenciadoId = body.credenciado_id;
    let consultorioId = body.consultorio_id;

    // Buscar dados do consultório se fornecido ID
    if (consultorioId) {
      const { data: consultorio, error } = await supabase
        .from('credenciado_consultorios')
        .select('logradouro, numero, bairro, cidade, estado, cep')
        .eq('id', consultorioId)
        .single();

      if (error) {
        log({
          timestamp: new Date().toISOString(),
          action: 'consultorio_not_found',
          request_id: requestId,
          consultorio_id: consultorioId,
        } as any);

        throw new Error(`Consultório não encontrado: ${error.message}`);
      }

      endereco = [
        consultorio.logradouro,
        consultorio.numero,
        consultorio.bairro,
        consultorio.cidade,
        consultorio.estado,
        'Brasil'
      ].filter(Boolean).join(', ');
    }

    // Buscar dados do credenciado se fornecido ID
    if (credenciadoId) {
      const { data: credenciado, error } = await supabase
        .from('credenciados')
        .select('endereco, cidade, estado, cep')
        .eq('id', credenciadoId)
        .single();

      if (error) {
        log({
          timestamp: new Date().toISOString(),
          action: 'credenciado_not_found',
          request_id: requestId,
          credenciado_id: credenciadoId,
        } as any);

        throw new Error(`Credenciado não encontrado: ${error.message}`);
      }

      endereco = [credenciado.endereco, credenciado.cidade, credenciado.estado, 'Brasil']
        .filter(Boolean)
        .join(', ');
    }

    if (!endereco) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Endereço inválido ou vazio',
        } as GeocodingResponse),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calcular hash do endereço
    const addressHash = await calculateAddressHash(endereco);

    log({
      timestamp: new Date().toISOString(),
      action: 'address_hash_calculated',
      request_id: requestId,
      address_hash: addressHash,
      credenciado_id: credenciadoId,
    } as any);

    // Verificar cache (se não forçar refresh)
    if (!body.force_refresh) {
      const { data: cached, error: cacheError } = await supabase
        .from('geocode_cache')
        .select('latitude, longitude, provider, metadata')
        .eq('address_hash', addressHash)
        .maybeSingle();

      if (!cacheError && cached) {
        log({
          timestamp: new Date().toISOString(),
          action: 'cache_hit',
          request_id: requestId,
          address_hash: addressHash,
          provider: cached.provider,
        } as any);

        // Atualizar estatísticas do cache
        await supabase
          .from('geocode_cache')
          .update({
            last_used_at: new Date().toISOString(),
            hit_count: cached.metadata?.hit_count ? cached.metadata.hit_count + 1 : 1,
          })
          .eq('address_hash', addressHash);

        // Atualizar credenciado se fornecido
        if (credenciadoId) {
          await supabase
            .from('credenciados')
            .update({
              latitude: cached.latitude,
              longitude: cached.longitude,
              geocoded_at: new Date().toISOString(),
            })
            .eq('id', credenciadoId);
        }

        const responseTime = Date.now() - startTime;

        log({
          timestamp: new Date().toISOString(),
          action: 'request_completed',
          request_id: requestId,
          source: 'cache',
          latency_ms: responseTime,
        } as any);

        return new Response(
          JSON.stringify({
            success: true,
            lat: cached.latitude,
            lon: cached.longitude,
            source: 'cache',
            cached: true,
            provider: cached.provider,
          } as GeocodingResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Cache miss - chamar provider
    log({
      timestamp: new Date().toISOString(),
      action: 'cache_miss',
      request_id: requestId,
      provider: GEOCODING_PROVIDER,
    } as any);

    let location: { lat: number; lon: number; display_name: string };

    if (GEOCODING_PROVIDER === 'mapbox') {
      location = await geocodeWithMapbox(endereco);
    } else {
      location = await geocodeWithNominatim(endereco);
    }

    // Salvar no cache
    const { error: cacheInsertError } = await supabase
      .from('geocode_cache')
      .upsert({
        address_hash: addressHash,
        address_text: endereco,
        latitude: location.lat,
        longitude: location.lon,
        provider: GEOCODING_PROVIDER,
        metadata: {
          display_name: location.display_name,
          hit_count: 1,
        },
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        hit_count: 1,
      }, {
        onConflict: 'address_hash',
      });

    if (cacheInsertError) {
      log({
        timestamp: new Date().toISOString(),
        action: 'cache_save_error',
        request_id: requestId,
        error: cacheInsertError.message,
      } as any);
    }

    // Atualizar consultório se fornecido
    if (consultorioId) {
      const { error: updateError } = await supabase
        .from('credenciado_consultorios')
        .update({
          latitude: location.lat,
          longitude: location.lon,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', consultorioId);

      if (updateError) {
        log({
          timestamp: new Date().toISOString(),
          action: 'consultorio_update_error',
          request_id: requestId,
          consultorio_id: consultorioId,
          error: updateError.message,
        } as any);
      }
    }

    // Atualizar credenciado se fornecido
    if (credenciadoId) {
      const { error: updateError } = await supabase
        .from('credenciados')
        .update({
          latitude: location.lat,
          longitude: location.lon,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', credenciadoId);

      if (updateError) {
        log({
          timestamp: new Date().toISOString(),
          action: 'credenciado_update_error',
          request_id: requestId,
          credenciado_id: credenciadoId,
          error: updateError.message,
        } as any);
      }
    }

    const responseTime = Date.now() - startTime;

    log({
      timestamp: new Date().toISOString(),
      action: 'request_completed',
      request_id: requestId,
      source: GEOCODING_PROVIDER,
      latency_ms: responseTime,
    } as any);

    return new Response(
      JSON.stringify({
        success: true,
        lat: location.lat,
        lon: location.lon,
        source: GEOCODING_PROVIDER as 'nominatim' | 'mapbox',
        cached: false,
        provider: GEOCODING_PROVIDER,
        message: `Geocodificado com sucesso via ${GEOCODING_PROVIDER}`,
      } as GeocodingResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    log({
      timestamp: new Date().toISOString(),
      action: 'request_error',
      request_id: requestId,
      error: errorMessage,
      latency_ms: responseTime,
    } as any);

    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      } as GeocodingResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
