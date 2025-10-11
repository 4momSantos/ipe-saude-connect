import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documento_id } = await req.json();
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${authHeader}` }
      }
    });

    // Verificar se usuário é analista/gestor
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAuthorized = roles?.some(r => 
      ['analista', 'gestor', 'admin'].includes(r.role)
    );

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[REPROCESS_OCR] Reprocessando documento:', documento_id);

    // Chamar edge function de processamento automático
    const { data, error } = await supabase.functions.invoke('auto-process-ocr-document', {
      body: { documento_id }
    });

    if (error) throw error;

    // Registrar evento de reprocessamento
    const { data: documento } = await supabase
      .from('inscricao_documentos')
      .select('inscricao_id, tipo_documento')
      .eq('id', documento_id)
      .single();

    if (documento) {
      await supabase.from('inscricao_eventos').insert({
        inscricao_id: documento.inscricao_id,
        tipo_evento: 'ocr_reprocessado',
        descricao: `OCR reprocessado manualmente para ${documento.tipo_documento}`,
        usuario_id: user.id,
        dados: { documento_id }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'OCR reprocessado com sucesso',
      data 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[REPROCESS_OCR] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
