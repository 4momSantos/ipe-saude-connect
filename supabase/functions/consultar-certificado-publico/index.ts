import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting simples em memória
const rateLimiter = new Map<string, { count: number, resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60000 }); // 1 min
    return true;
  }
  
  if (record.count >= 10) {
    return false;
  }
  
  record.count++;
  return true;
}

interface ConsultaRequest {
  tipo: 'codigo' | 'numero';
  valor: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Muitas consultas. Aguarde 1 minuto.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tipo, valor }: ConsultaRequest = await req.json();

    if (!['codigo', 'numero'].includes(tipo)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de consulta inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CONSULTA_PUBLICA] Tipo: ${tipo}, Valor: ${valor}`);

    // Chamar função SQL (retorna array, pega primeiro elemento)
    const { data: resultArray, error } = await supabase
      .rpc('consultar_certificado_publico', {
        p_tipo: tipo,
        p_valor: valor.toUpperCase()
      });

    if (error) {
      console.error('[CONSULTA_PUBLICA] Erro:', error);
      throw error;
    }

    const data = resultArray?.[0] || null;

    // Registrar log
    const userAgent = req.headers.get('user-agent');
    
    await supabase
      .from('certificados_consultas_publicas')
      .insert({
        certificado_id: data.encontrado ? null : null, // Será atualizado pelo trigger
        tipo_consulta: tipo,
        parametro_busca: valor.substring(0, 4) + '***', // Ofuscado
        resultado: data.encontrado ? 'encontrado' : 'nao_encontrado',
        ip_origem: ip,
        user_agent: userAgent
      });

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CONSULTA_PUBLICA] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
