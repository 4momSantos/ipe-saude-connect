import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { edital_id } = await req.json();

    if (!edital_id) {
      throw new Error('edital_id é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[PUBLICAR_EDITAL] Iniciando publicação do edital:', edital_id);

    // Buscar dados do edital
    const { data: edital, error: editalError } = await supabase
      .from('editais')
      .select('id, titulo, numero_edital')
      .eq('id', edital_id)
      .single();

    if (editalError) throw editalError;
    if (!edital) throw new Error('Edital não encontrado');

    // Atualizar status para aberto
    const { error: updateError } = await supabase
      .from('editais')
      .update({ status: 'aberto' })
      .eq('id', edital_id);

    if (updateError) throw updateError;

    console.log('[PUBLICAR_EDITAL] Edital publicado com sucesso:', edital.titulo);

    // Notificar usuários sobre novo edital (opcional)
    const { data: analistas } = await supabase.rpc('get_gestores');
    
    if (analistas && analistas.length > 0) {
      const notifications = analistas.map((analista: any) => ({
        user_id: analista.id,
        type: 'info',
        title: 'Novo Edital Publicado',
        message: `O edital "${edital.titulo}" (${edital.numero_edital}) foi publicado e está disponível para inscrições.`,
        related_type: 'edital',
        related_id: edital_id
      }));

      await supabase.from('app_notifications').insert(notifications);
      console.log('[PUBLICAR_EDITAL] Notificações enviadas para', analistas.length, 'analistas');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        edital_id,
        titulo: edital.titulo 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('[PUBLICAR_EDITAL] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
