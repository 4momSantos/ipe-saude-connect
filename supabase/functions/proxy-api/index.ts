import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetPath = url.pathname.replace('/proxy-api', '');
    
    // Construir URL do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const targetUrl = `${supabaseUrl}${targetPath}${url.search}`;

    console.log('[PROXY] Redirecionando:', {
      original: url.pathname,
      target: targetUrl,
      method: req.method
    });

    // Copiar headers relevantes
    const proxyHeaders = new Headers();
    const relevantHeaders = [
      'authorization',
      'apikey',
      'content-type',
      'x-client-info',
      'prefer'
    ];

    relevantHeaders.forEach(header => {
      const value = req.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });

    // Adicionar apikey se não estiver presente
    if (!proxyHeaders.has('apikey')) {
      proxyHeaders.set('apikey', Deno.env.get('SUPABASE_ANON_KEY')!);
    }

    // Fazer requisição ao Supabase
    const proxyReq = new Request(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : null,
    });

    const response = await fetch(proxyReq);
    
    // Copiar response headers
    const responseHeaders = new Headers(corsHeaders);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const responseBody = await response.arrayBuffer();

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[PROXY] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
