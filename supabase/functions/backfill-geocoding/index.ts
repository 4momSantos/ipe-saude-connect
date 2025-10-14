// Edge Function: backfill-geocoding
// Processa em lote credenciados sem coordenadas geográficas

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  batch_size?: number;
  max_attempts?: number;
  force_reprocess?: boolean;
}

interface BackfillResult {
  processed: number;
  success: number;
  failed: Array<{ id: string; nome: string; error: string }>;
  skipped: number;
  duration_ms: number;
}

interface LogEntry {
  timestamp: string;
  action: string;
  batch_size?: number;
  processed?: number;
  success?: number;
  failed?: number;
  skipped?: number;
  duration_ms?: number;
  error?: string;
}

// Configuração
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_BATCH_SIZE = 50;
const MAX_GEOCODE_ATTEMPTS = 5;
const RATE_LIMIT_DELAY_MS = 1100; // 1.1s entre chamadas (respeitando Nominatim)

// Logger estruturado
function log(entry: LogEntry) {
  console.log(JSON.stringify({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  }));
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    log({
      timestamp: new Date().toISOString(),
      action: 'backfill_started',
    });

    // Parse request body
    const body: BackfillRequest = req.method === 'POST' 
      ? await req.json().catch(() => ({}))
      : {};

    const batchSize = body.batch_size || DEFAULT_BATCH_SIZE;
    const maxAttempts = body.max_attempts || MAX_GEOCODE_ATTEMPTS;
    const forceReprocess = body.force_reprocess || false;

    log({
      timestamp: new Date().toISOString(),
      action: 'config_loaded',
      batch_size: batchSize,
    });

    // Buscar credenciados que precisam de geocodificação
    let query = supabase
      .from('credenciados')
      .select('id, nome, endereco, cidade, estado, cep, geocode_attempts, last_geocode_attempt')
      .is('latitude', null)
      .not('endereco', 'is', null)
      .limit(batchSize);

    if (!forceReprocess) {
      query = query.lt('geocode_attempts', maxAttempts);
    }

    const { data: credenciados, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Erro ao buscar credenciados: ${fetchError.message}`);
    }

    if (!credenciados || credenciados.length === 0) {
      log({
        timestamp: new Date().toISOString(),
        action: 'no_records_to_process',
      });

      return new Response(
        JSON.stringify({
          processed: 0,
          success: 0,
          failed: [],
          skipped: 0,
          duration_ms: Date.now() - startTime,
          message: 'Nenhum credenciado pendente de geocodificação',
        } as BackfillResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log({
      timestamp: new Date().toISOString(),
      action: 'records_found',
      processed: credenciados.length,
    });

    // Processar cada credenciado
    const result: BackfillResult = {
      processed: credenciados.length,
      success: 0,
      failed: [],
      skipped: 0,
      duration_ms: 0,
    };

    for (const credenciado of credenciados) {
      try {
        log({
          timestamp: new Date().toISOString(),
          action: 'processing_credenciado',
          credenciado_id: credenciado.id,
          attempts: credenciado.geocode_attempts,
        } as any);

        // Atualizar attempts antes de processar
        await supabase
          .from('credenciados')
          .update({
            geocode_attempts: (credenciado.geocode_attempts || 0) + 1,
            last_geocode_attempt: new Date().toISOString(),
          })
          .eq('id', credenciado.id);

        // Chamar função de geocodificação
        const { data: geoResult, error: geoError } = await supabase.functions.invoke(
          'geocodificar-credenciado',
          {
            body: {
              credenciado_id: credenciado.id,
            },
          }
        );

        if (geoError) {
          throw new Error(geoError.message);
        }

        if (geoResult?.success) {
          result.success++;
          log({
            timestamp: new Date().toISOString(),
            action: 'geocode_success',
            credenciado_id: credenciado.id,
            source: geoResult.source,
          } as any);

          // Detectar zona geográfica automaticamente
          if (geoResult.latitude && geoResult.longitude && credenciado.cidade && credenciado.estado) {
            try {
              const { data: zonaData, error: zonaError } = await supabase.rpc('detectar_zona', {
                lat: geoResult.latitude,
                lng: geoResult.longitude,
                cidade_input: credenciado.cidade,
                estado_input: credenciado.estado
              });

              if (!zonaError && zonaData) {
                await supabase
                  .from('credenciados')
                  .update({ zona_id: zonaData })
                  .eq('id', credenciado.id);

                log({
                  timestamp: new Date().toISOString(),
                  action: 'zona_detectada',
                  credenciado_id: credenciado.id,
                  zona_id: zonaData,
                } as any);
              }
            } catch (error) {
              console.error('Erro ao detectar zona:', error);
            }
          }
        } else {
          result.failed.push({
            id: credenciado.id,
            nome: credenciado.nome,
            error: geoResult?.message || 'Geocodificação falhou',
          });
          
          log({
            timestamp: new Date().toISOString(),
            action: 'geocode_failed',
            credenciado_id: credenciado.id,
            error: geoResult?.message,
          } as any);
        }

        // Respeitar rate limit
        await sleep(RATE_LIMIT_DELAY_MS);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        result.failed.push({
          id: credenciado.id,
          nome: credenciado.nome,
          error: errorMessage,
        });

        log({
          timestamp: new Date().toISOString(),
          action: 'processing_error',
          credenciado_id: credenciado.id,
          error: errorMessage,
        } as any);
      }
    }

    result.duration_ms = Date.now() - startTime;

    log({
      timestamp: new Date().toISOString(),
      action: 'backfill_completed',
      processed: result.processed,
      success: result.success,
      failed: result.failed.length,
      duration_ms: result.duration_ms,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const duration = Date.now() - startTime;

    log({
      timestamp: new Date().toISOString(),
      action: 'backfill_error',
      error: errorMessage,
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        processed: 0,
        success: 0,
        failed: [],
        skipped: 0,
        duration_ms: duration,
        error: errorMessage,
      } as BackfillResult),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
