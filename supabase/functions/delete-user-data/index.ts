/**
 * Edge Function: Delete User Data (LGPD Compliance)
 * 
 * Anonimiza dados pessoais do usuário conforme Art. 18º da LGPD
 * Não deleta dados (preservação para auditoria), apenas anonimiza.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserDataRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { userId } = await req.json() as DeleteUserDataRequest;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[DELETE_USER_DATA] Iniciando anonimização para user_id: ${userId}`);

    // Anonimizar dados do perfil
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        nome: '[REMOVIDO]',
        email: `anonimizado_${userId}@sistema.gov`,
        telefone: null
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[DELETE_USER_DATA] Erro ao anonimizar perfil:', profileError);
      throw new Error(`Erro ao anonimizar perfil: ${profileError.message}`);
    }

    // Registrar solicitação em audit_logs
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'user_data_deletion_request',
        resource_type: 'user',
        resource_id: userId,
        metadata: {
          requested_at: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        }
      });

    if (auditError) {
      console.error('[DELETE_USER_DATA] Erro ao registrar auditoria:', auditError);
      // Não falhar por causa do log de auditoria
    }

    console.log(`[DELETE_USER_DATA] ✅ Dados anonimizados com sucesso para user_id: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dados pessoais anonimizados com sucesso',
        userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[DELETE_USER_DATA] ❌ Erro fatal:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao processar solicitação'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
