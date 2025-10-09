import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alert {
  alert_type: string;
  severity: string;
  message: string;
  count: number | null;
  details: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  function: string;
  entity_id?: string;
  lat_lon?: [number, number];
  provider?: string;
  message: string;
  metadata?: Record<string, any>;
}

function structuredLog(entry: LogEntry) {
  console.log(JSON.stringify({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'check_alerts';

    structuredLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      function: 'geocoding-monitor',
      message: `Action requested: ${action}`,
    });

    // Check Alerts
    if (action === 'check_alerts') {
      const { data: alerts, error } = await supabase.rpc('check_geocoding_alerts');

      if (error) {
        structuredLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          function: 'geocoding-monitor',
          message: 'Failed to check alerts',
          metadata: { error: error.message },
        });
        throw error;
      }

      structuredLog({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        function: 'geocoding-monitor',
        message: `Found ${alerts?.length || 0} active alerts`,
        metadata: { alert_count: alerts?.length },
      });

      return new Response(
        JSON.stringify({ alerts: alerts || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Stats
    if (action === 'stats') {
      const { data: stats, error } = await supabase
        .from('view_credenciados_geo_stats')
        .select('*')
        .single();

      if (error) {
        structuredLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          function: 'geocoding-monitor',
          message: 'Failed to fetch stats',
          metadata: { error: error.message },
        });
        throw error;
      }

      return new Response(
        JSON.stringify({ stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Cache Stats
    if (action === 'cache_stats') {
      const { data: cacheStats, error } = await supabase
        .from('view_geocode_cache_stats')
        .select('*')
        .single();

      if (error) {
        structuredLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          function: 'geocoding-monitor',
          message: 'Failed to fetch cache stats',
          metadata: { error: error.message },
        });
        throw error;
      }

      return new Response(
        JSON.stringify({ cache_stats: cacheStats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Recent Failures
    if (action === 'failures') {
      const { data: failures, error } = await supabase
        .from('view_geocode_failures_last_24h')
        .select('*')
        .limit(50);

      if (error) {
        structuredLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          function: 'geocoding-monitor',
          message: 'Failed to fetch failures',
          metadata: { error: error.message },
        });
        throw error;
      }

      return new Response(
        JSON.stringify({ failures: failures || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Distribution
    if (action === 'distribution') {
      const { data: distribution, error } = await supabase
        .from('view_geocode_distribution')
        .select('*');

      if (error) {
        structuredLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          function: 'geocoding-monitor',
          message: 'Failed to fetch distribution',
          metadata: { error: error.message },
        });
        throw error;
      }

      return new Response(
        JSON.stringify({ distribution: distribution || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Health Check
    if (action === 'health') {
      const { data: stats } = await supabase
        .from('view_credenciados_geo_stats')
        .select('success_rate_percent, total_missing_geo')
        .single();

      const isHealthy = (stats?.success_rate_percent || 0) >= 80 && 
                        (stats?.total_missing_geo || 0) < 100;

      structuredLog({
        timestamp: new Date().toISOString(),
        level: isHealthy ? 'INFO' : 'WARN',
        function: 'geocoding-monitor',
        message: `Health check: ${isHealthy ? 'HEALTHY' : 'DEGRADED'}`,
        metadata: {
          success_rate: stats?.success_rate_percent,
          missing: stats?.total_missing_geo,
        },
      });

      return new Response(
        JSON.stringify({
          status: isHealthy ? 'healthy' : 'degraded',
          success_rate: stats?.success_rate_percent,
          missing_geo: stats?.total_missing_geo,
        }),
        { 
          status: isHealthy ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    structuredLog({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      function: 'geocoding-monitor',
      message: 'Unhandled error',
      metadata: { error: errorMessage },
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
