import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se é gestor ou admin
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) throw rolesError;

    const isAuthorized = roles?.some(r => 
      r.role === 'gestor' || r.role === 'admin'
    );

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Apenas gestores e admins podem executar esta operação.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CLEANUP] Iniciando limpeza de dados de teste');

    // 1. Buscar inscrições de teste
    const { data: testInscricoes, error: inscricoesError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        candidato_id,
        candidato:profiles (email)
      `)
      .ilike('candidato.email', '%@teste.com');

    if (inscricoesError) {
      console.error('[CLEANUP] Erro ao buscar inscrições:', inscricoesError);
      throw inscricoesError;
    }

    const inscricaoIds = testInscricoes?.map(i => i.id) || [];
    console.log(`[CLEANUP] Encontradas ${inscricaoIds.length} inscrições de teste`);

    if (inscricaoIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhuma inscrição de teste encontrada',
          credenciados_deletados: 0,
          inscricoes_deletadas: 0,
          documentos_deletados: 0,
          contratos_deletados: 0,
          assinaturas_deletadas: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Estatísticas
    let stats = {
      credenciados_deletados: 0,
      inscricoes_deletadas: 0,
      documentos_deletados: 0,
      contratos_deletados: 0,
      assinaturas_deletadas: 0
    };

    // 2. Deletar credenciados relacionados
    const { data: deletedCredenciados, error: credenciadosError } = await supabase
      .from('credenciados')
      .delete()
      .in('inscricao_id', inscricaoIds)
      .select('id');

    if (credenciadosError) {
      console.error('[CLEANUP] Erro ao deletar credenciados:', credenciadosError);
    } else {
      stats.credenciados_deletados = deletedCredenciados?.length || 0;
      console.log(`[CLEANUP] Deletados ${stats.credenciados_deletados} credenciados`);
    }

    // 3. Deletar contratos relacionados
    const { data: deletedContratos, error: contratosError } = await supabase
      .from('contratos')
      .delete()
      .in('inscricao_id', inscricaoIds)
      .select('id');

    if (contratosError) {
      console.error('[CLEANUP] Erro ao deletar contratos:', contratosError);
    } else {
      stats.contratos_deletados = deletedContratos?.length || 0;
      console.log(`[CLEANUP] Deletados ${stats.contratos_deletados} contratos`);
    }

    // 4. Deletar signature requests relacionadas
    const { data: deletedSignatures, error: signaturesError } = await supabase
      .from('signature_requests')
      .delete()
      .in('inscricao_id', inscricaoIds)
      .select('id');

    if (signaturesError) {
      console.error('[CLEANUP] Erro ao deletar assinaturas:', signaturesError);
    } else {
      stats.assinaturas_deletadas = deletedSignatures?.length || 0;
      console.log(`[CLEANUP] Deletadas ${stats.assinaturas_deletadas} solicitações de assinatura`);
    }

    // 5. Deletar documentos relacionados
    const { data: deletedDocumentos, error: documentosError } = await supabase
      .from('inscricao_documentos')
      .delete()
      .in('inscricao_id', inscricaoIds)
      .select('id');

    if (documentosError) {
      console.error('[CLEANUP] Erro ao deletar documentos:', documentosError);
    } else {
      stats.documentos_deletados = deletedDocumentos?.length || 0;
      console.log(`[CLEANUP] Deletados ${stats.documentos_deletados} documentos`);
    }

    // 6. Deletar inscrições
    const { data: deletedInscricoes, error: deleteInscricoesError } = await supabase
      .from('inscricoes_edital')
      .delete()
      .in('id', inscricaoIds)
      .select('id');

    if (deleteInscricoesError) {
      console.error('[CLEANUP] Erro ao deletar inscrições:', deleteInscricoesError);
      throw deleteInscricoesError;
    }

    stats.inscricoes_deletadas = deletedInscricoes?.length || 0;
    console.log(`[CLEANUP] Deletadas ${stats.inscricoes_deletadas} inscrições`);

    console.log('[CLEANUP] Limpeza concluída com sucesso:', stats);

    return new Response(
      JSON.stringify({
        message: 'Limpeza concluída com sucesso',
        ...stats
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CLEANUP] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
