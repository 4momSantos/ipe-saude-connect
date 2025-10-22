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

// Normalizar endereço para melhorar taxa de sucesso
function normalizeAddress(address: string): string {
  return address
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .replace(/\bR\.\s/gi, 'Rua ')
    .replace(/\bAv\.\s/gi, 'Avenida ')
    .replace(/\bTv\.\s/gi, 'Travessa ')
    .replace(/\bPr\.\s/gi, 'Praca ')
    .replace(/Brasil$/i, '')
    .trim();
}

// Geocodificação por CEP usando ViaCEP (fallback)
async function geocodeByCEP(cep: string): Promise<{ lat: number; lon: number; display_name: string }> {
  const cleanCEP = cep.replace(/\D/g, '');
  
  log({
    timestamp: new Date().toISOString(),
    action: 'viacep_request',
    provider: 'viacep',
  } as any);

  const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
  
  if (!response.ok) {
    throw new Error(`ViaCEP error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  // Geocodificar usando cidade + estado do CEP
  const addressFromCEP = `${data.localidade}, ${data.uf}, Brasil`;
  
  log({
    timestamp: new Date().toISOString(),
    action: 'geocoding_from_cep',
    address: addressFromCEP,
  } as any);

  // Tentar Nominatim com a cidade do CEP
  return await geocodeWithNominatim(addressFromCEP);
}

// Geocoding via Nominatim com retry e backoff
async function geocodeWithNominatim(address: string): Promise<{ lat: number; lon: number; display_name: string }> {
  const startTime = Date.now();
  let lastError: Error | null = null;
  const normalizedAddress = normalizeAddress(address);

  log({
    timestamp: new Date().toISOString(),
    action: 'address_normalized',
    original: address.substring(0, 100),
    normalized: normalizedAddress.substring(0, 100),
  } as any);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      log({
        timestamp: new Date().toISOString(),
        action: 'nominatim_request',
        provider: 'nominatim',
        attempt: attempt + 1,
      } as any);

      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', normalizedAddress);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'br');
      url.searchParams.set('addressdetails', '1');

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

      log({
        timestamp: new Date().toISOString(),
        action: 'nominatim_results',
        results_count: results.length,
      } as any);

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
  const normalizedAddress = normalizeAddress(address);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      log({
        timestamp: new Date().toISOString(),
        action: 'mapbox_request',
        provider: 'mapbox',
        attempt: attempt + 1,
      } as any);

      const encodedAddress = encodeURIComponent(normalizedAddress + ', Brasil');
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
    let enderecoAlternativo: string | null = null;
    let cepFallback: string | null = null;
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
      
      cepFallback = consultorio.cep;
    }

    // Buscar dados do credenciado com todas as opções de endereço
    if (credenciadoId) {
      const { data: credenciado, error } = await supabase
        .from('credenciados')
        .select(`
          id,
          endereco,
          cidade,
          estado,
          cep,
          inscricao_id,
          inscricoes_edital!inner(dados_inscricao)
        `)
        .eq('id', credenciadoId)
        .single();

      if (error) {
        throw new Error(`Credenciado não encontrado: ${error.message}`);
      }

      // Extrair dados da inscrição
      const dadosInscricao = (credenciado as any).inscricoes_edital?.dados_inscricao;
      const enderecoCorresp = dadosInscricao?.endereco_correspondencia;
      const consultorioData = dadosInscricao?.consultorio;

      // PRIORIDADE 1: Endereço de correspondência estruturado
      if (enderecoCorresp && enderecoCorresp.cep) {
        endereco = [
          enderecoCorresp.logradouro,
          enderecoCorresp.numero,
          enderecoCorresp.complemento,
          enderecoCorresp.bairro,
          enderecoCorresp.cidade,
          enderecoCorresp.uf,
          'Brasil'
        ].filter(Boolean).join(', ');
        
        cepFallback = enderecoCorresp.cep;
        
        log({
          timestamp: new Date().toISOString(),
          action: 'endereco_principal',
          credenciado_id: credenciadoId,
          source: 'endereco_correspondencia',
        } as any);
      } else {
        // Fallback para campos legados
        endereco = [credenciado.endereco, credenciado.cidade, credenciado.estado, 'Brasil']
          .filter(Boolean)
          .join(', ');
        
        cepFallback = credenciado.cep;
        
        log({
          timestamp: new Date().toISOString(),
          action: 'endereco_principal',
          credenciado_id: credenciadoId,
          source: 'campos_legados',
        } as any);
      }
      
      // FALLBACK 2: Endereço de consultório
      if (consultorioData && (consultorioData.endereco || consultorioData.logradouro)) {
        enderecoAlternativo = [
          consultorioData.logradouro || consultorioData.endereco,
          consultorioData.numero,
          consultorioData.bairro,
          consultorioData.cidade,
          consultorioData.estado || consultorioData.uf,
          'Brasil'
        ].filter(Boolean).join(', ');
        
        log({
          timestamp: new Date().toISOString(),
          action: 'endereco_alternativo_disponivel',
          credenciado_id: credenciadoId,
          source: 'consultorio',
        } as any);
      }
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

    // Cache miss - tentar geocodificar com fallbacks inteligentes
    log({
      timestamp: new Date().toISOString(),
      action: 'cache_miss',
      request_id: requestId,
    } as any);

    let location: { lat: number; lon: number; display_name: string } | null = null;
    let usedSource = 'endereco_principal';
    let usedProvider = GEOCODING_PROVIDER;
    let lastError: Error | null = null;

    // ESTRATÉGIA 1: Tentar endereço principal
    if (endereco) {
      try {
        log({
          timestamp: new Date().toISOString(),
          action: 'trying_primary_address',
          provider: GEOCODING_PROVIDER,
        } as any);

        if (GEOCODING_PROVIDER === 'mapbox') {
          location = await geocodeWithMapbox(endereco);
        } else {
          location = await geocodeWithNominatim(endereco);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        log({
          timestamp: new Date().toISOString(),
          action: 'primary_address_failed',
          error: lastError.message,
        } as any);
      }
    }

    // ESTRATÉGIA 2: Tentar endereço alternativo (consultório)
    if (!location && enderecoAlternativo) {
      try {
        log({
          timestamp: new Date().toISOString(),
          action: 'trying_alternative_address',
        } as any);

        if (GEOCODING_PROVIDER === 'mapbox') {
          location = await geocodeWithMapbox(enderecoAlternativo);
        } else {
          location = await geocodeWithNominatim(enderecoAlternativo);
        }
        usedSource = 'endereco_consultorio';
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        log({
          timestamp: new Date().toISOString(),
          action: 'alternative_address_failed',
          error: lastError.message,
        } as any);
      }
    }

    // ESTRATÉGIA 3: Tentar geocodificar apenas pelo CEP
    if (!location && cepFallback) {
      try {
        log({
          timestamp: new Date().toISOString(),
          action: 'trying_cep_fallback',
        } as any);

        location = await geocodeByCEP(cepFallback);
        usedSource = 'cep_only';
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        log({
          timestamp: new Date().toISOString(),
          action: 'cep_fallback_failed',
          error: lastError.message,
        } as any);
      }
    }

    // ESTRATÉGIA 4: Tentar provider alternativo (se Nominatim falhou, tentar Mapbox)
    if (!location && GEOCODING_PROVIDER === 'nominatim' && MAPBOX_API_KEY) {
      try {
        log({
          timestamp: new Date().toISOString(),
          action: 'trying_alternative_provider',
          provider: 'mapbox',
        } as any);

        location = await geocodeWithMapbox(endereco);
        usedProvider = 'mapbox';
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        log({
          timestamp: new Date().toISOString(),
          action: 'alternative_provider_failed',
          error: lastError.message,
        } as any);
      }
    }

    // Se nenhuma estratégia funcionou, lançar erro
    if (!location) {
      throw lastError || new Error('Endereço não encontrado após todas as tentativas');
    }

    log({
      timestamp: new Date().toISOString(),
      action: 'geocoding_success',
      source: usedSource,
      provider: usedProvider,
    } as any);

    // Salvar no cache
    const { error: cacheInsertError } = await supabase
      .from('geocode_cache')
      .upsert({
        address_hash: addressHash,
        address_text: endereco,
        latitude: location.lat,
        longitude: location.lon,
        provider: usedProvider,
        metadata: {
          display_name: location.display_name,
          hit_count: 1,
          source: usedSource,
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
        error: cacheInsertError.message,
      } as any);
    }

    // Atualizar consultório se fornecido
    if (consultorioId) {
      await supabase
        .from('credenciado_consultorios')
        .update({
          latitude: location.lat,
          longitude: location.lon,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', consultorioId);
    }

    // Atualizar credenciado se fornecido
    if (credenciadoId) {
      await supabase
        .from('credenciados')
        .update({
          latitude: location.lat,
          longitude: location.lon,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', credenciadoId);
    }

    const responseTime = Date.now() - startTime;

    log({
      timestamp: new Date().toISOString(),
      action: 'request_completed',
      source: usedSource,
      provider: usedProvider,
      latency_ms: responseTime,
    } as any);

    return new Response(
      JSON.stringify({
        success: true,
        lat: location.lat,
        lon: location.lon,
        source: usedProvider as 'nominatim' | 'mapbox',
        cached: false,
        provider: usedProvider,
        message: `Geocodificado via ${usedProvider} (${usedSource})`,
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
