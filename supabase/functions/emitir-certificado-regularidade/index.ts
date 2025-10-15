import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmitirRequest {
  credenciadoId: string;
  forcarEmissao?: boolean;
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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Não autenticado');
    }

    const { credenciadoId, forcarEmissao = false }: EmitirRequest = await req.json();
    console.log('[EMITIR_CERT] Iniciando para credenciado:', credenciadoId);

    // 1. Calcular status de regularidade
    const { data: statusData, error: statusError } = await supabase
      .rpc('calcular_status_regularidade', { p_credenciado_id: credenciadoId })
      .single();

    if (statusError) {
      console.error('[EMITIR_CERT] Erro ao calcular status:', statusError);
      throw statusError;
    }

    console.log('[EMITIR_CERT] Status calculado:', statusData.status);

    // 2. Validar se pode emitir
    if (statusData.status === 'inativo') {
      return new Response(
        JSON.stringify({ error: 'Cadastro inativo não pode emitir certificado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!forcarEmissao && statusData.status === 'irregular') {
      return new Response(
        JSON.stringify({
          error: 'Credenciado irregular',
          pendencias: statusData.pendencias,
          pode_forcar: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Buscar dados completos
    const { data: credenciado, error: credError } = await supabase
      .from('credenciados')
      .select('*')
      .eq('id', credenciadoId)
      .single();

    if (credError) throw credError;

    const { data: dadosCompletos } = await supabase
      .from('v_dados_regularidade')
      .select('*')
      .eq('credenciado_id', credenciadoId)
      .single();

    // 4. Gerar identificadores
    const { data: numeroCert } = await supabase.rpc('gerar_numero_certificado');
    const { data: codigoCert } = await supabase.rpc('gerar_codigo_verificacao');

    // 5. Calcular validade
    const validoDe = new Date();
    const validoAte = new Date();
    
    switch (statusData.status) {
      case 'regular':
        validoAte.setDate(validoAte.getDate() + 90);
        break;
      case 'regular_ressalvas':
        validoAte.setDate(validoAte.getDate() + 60);
        break;
      case 'irregular':
        validoAte.setDate(validoAte.getDate() + 30);
        break;
    }

    // 6. Criar snapshot de dados
    const dadosSnapshot = {
      credenciado: credenciado,
      documentos: dadosCompletos?.documentos || [],
      contratos: dadosCompletos?.contratos || [],
      timestamp: new Date().toISOString()
    };

    // 7. Gerar hash
    const { data: hashVerificacao } = await supabase.rpc('gerar_hash_certificado', {
      p_credenciado_id: credenciadoId,
      p_numero: numeroCert,
      p_status: statusData.status,
      p_timestamp: validoDe.toISOString()
    });

    // 8. Salvar certificado no banco
    const { data: certificado, error: certError } = await supabase
      .from('certificados_regularidade')
      .insert({
        credenciado_id: credenciadoId,
        numero_certificado: numeroCert,
        codigo_verificacao: codigoCert,
        hash_verificacao: hashVerificacao,
        status: statusData.status,
        pendencias: statusData.pendencias,
        detalhes: statusData.detalhes,
        dados_snapshot: dadosSnapshot,
        emitido_por: user.id,
        valido_de: validoDe.toISOString().split('T')[0],
        valido_ate: validoAte.toISOString().split('T')[0],
        ativo: true
      })
      .select()
      .single();

    if (certError) {
      console.error('[EMITIR_CERT] Erro ao salvar:', certError);
      throw certError;
    }

    console.log('[EMITIR_CERT] Certificado emitido:', certificado.id);

    return new Response(
      JSON.stringify({
        success: true,
        certificado: certificado
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[EMITIR_CERT] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
