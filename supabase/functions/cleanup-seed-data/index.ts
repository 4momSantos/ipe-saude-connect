import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  message: string;
  analises_deletadas: number;
  consultorios_deletados: number;
  documentos_deletados: number;
  correcoes_deletadas: number;
  signature_requests_deletadas: number;
  contratos_deletados: number;
  inscricoes_deletadas: number;
  user_roles_deletados: number;
  notifications_deletadas: number;
  profiles_deletados: number;
  auth_users_deletados: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é gestor ou admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'gestor' || r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas gestores podem limpar dados seed.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CLEANUP-SEED] Iniciando limpeza de dados seed...');

    const result: CleanupResult = {
      message: 'Limpeza concluída',
      analises_deletadas: 0,
      consultorios_deletados: 0,
      documentos_deletados: 0,
      correcoes_deletadas: 0,
      signature_requests_deletadas: 0,
      contratos_deletados: 0,
      inscricoes_deletadas: 0,
      user_roles_deletados: 0,
      notifications_deletadas: 0,
      profiles_deletados: 0,
      auth_users_deletados: 0,
      errors: [],
    };

    // 1. Buscar profiles seed (email contém 'seed' e termina com @example.com)
    const { data: seedProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .or('email.ilike.%seed%@example.com,email.ilike.candidato.seed.%');

    if (profilesError) {
      console.error('[CLEANUP-SEED] Erro ao buscar profiles:', profilesError);
      result.errors.push(`Erro ao buscar profiles: ${profilesError.message}`);
    }

    const seedUserIds = seedProfiles?.map(p => p.id) || [];
    console.log(`[CLEANUP-SEED] Encontrados ${seedUserIds.length} profiles seed`);

    if (seedUserIds.length === 0) {
      return new Response(
        JSON.stringify({ ...result, message: 'Nenhum dado seed encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar inscrições desses usuários
    const { data: inscricoes } = await supabaseAdmin
      .from('inscricoes_edital')
      .select('id')
      .in('candidato_id', seedUserIds);

    const inscricaoIds = inscricoes?.map(i => i.id) || [];
    console.log(`[CLEANUP-SEED] Encontradas ${inscricaoIds.length} inscrições seed`);

    // 3. Deletar analises (referencia inscricoes_edital)
    if (inscricaoIds.length > 0) {
      const { error: analisesError, count: analisesCount } = await supabaseAdmin
        .from('analises')
        .delete({ count: 'exact' })
        .in('inscricao_id', inscricaoIds);

      if (analisesError) {
        console.error('[CLEANUP-SEED] Erro ao deletar analises:', analisesError);
        result.errors.push(`Erro ao deletar analises: ${analisesError.message}`);
      } else {
        result.analises_deletadas = analisesCount || 0;
        console.log(`[CLEANUP-SEED] Deletadas ${analisesCount} analises`);
      }

      // 4. Deletar inscricao_consultorios
      const { error: consultoriosError, count: consultoriosCount } = await supabaseAdmin
        .from('inscricao_consultorios')
        .delete({ count: 'exact' })
        .in('inscricao_id', inscricaoIds);

      if (consultoriosError) {
        console.error('[CLEANUP-SEED] Erro ao deletar consultorios:', consultoriosError);
        result.errors.push(`Erro ao deletar consultorios: ${consultoriosError.message}`);
      } else {
        result.consultorios_deletados = consultoriosCount || 0;
        console.log(`[CLEANUP-SEED] Deletados ${consultoriosCount} consultorios`);
      }

      // 5. Deletar inscricao_documentos
      const { error: docsError, count: docsCount } = await supabaseAdmin
        .from('inscricao_documentos')
        .delete({ count: 'exact' })
        .in('inscricao_id', inscricaoIds);

      if (docsError) {
        console.error('[CLEANUP-SEED] Erro ao deletar documentos:', docsError);
        result.errors.push(`Erro ao deletar documentos: ${docsError.message}`);
      } else {
        result.documentos_deletados = docsCount || 0;
        console.log(`[CLEANUP-SEED] Deletados ${docsCount} documentos`);
      }

      // 6. Deletar correcoes_inscricao
      const { error: correcoesError, count: correcoesCount } = await supabaseAdmin
        .from('correcoes_inscricao')
        .delete({ count: 'exact' })
        .in('inscricao_id', inscricaoIds);

      if (correcoesError) {
        console.error('[CLEANUP-SEED] Erro ao deletar correções:', correcoesError);
        result.errors.push(`Erro ao deletar correções: ${correcoesError.message}`);
      } else {
        result.correcoes_deletadas = correcoesCount || 0;
        console.log(`[CLEANUP-SEED] Deletadas ${correcoesCount} correções`);
      }

      // 7. Deletar signature_requests
      const { error: sigError, count: sigCount } = await supabaseAdmin
        .from('signature_requests')
        .delete({ count: 'exact' })
        .in('inscricao_id', inscricaoIds);

      if (sigError) {
        console.error('[CLEANUP-SEED] Erro ao deletar signature_requests:', sigError);
        result.errors.push(`Erro ao deletar signature_requests: ${sigError.message}`);
      } else {
        result.signature_requests_deletadas = sigCount || 0;
        console.log(`[CLEANUP-SEED] Deletadas ${sigCount} signature_requests`);
      }

      // 8. Deletar contratos
      const { error: contratosError, count: contratosCount } = await supabaseAdmin
        .from('contratos')
        .delete({ count: 'exact' })
        .in('inscricao_id', inscricaoIds);

      if (contratosError) {
        console.error('[CLEANUP-SEED] Erro ao deletar contratos:', contratosError);
        result.errors.push(`Erro ao deletar contratos: ${contratosError.message}`);
      } else {
        result.contratos_deletados = contratosCount || 0;
        console.log(`[CLEANUP-SEED] Deletados ${contratosCount} contratos`);
      }

      // 9. Deletar inscrições
      const { error: inscError, count: inscCount } = await supabaseAdmin
        .from('inscricoes_edital')
        .delete({ count: 'exact' })
        .in('id', inscricaoIds);

      if (inscError) {
        console.error('[CLEANUP-SEED] Erro ao deletar inscrições:', inscError);
        result.errors.push(`Erro ao deletar inscrições: ${inscError.message}`);
      } else {
        result.inscricoes_deletadas = inscCount || 0;
        console.log(`[CLEANUP-SEED] Deletadas ${inscCount} inscrições`);
      }
    }

    // 10. Deletar user_roles
    const { error: rolesError, count: rolesCount } = await supabaseAdmin
      .from('user_roles')
      .delete({ count: 'exact' })
      .in('user_id', seedUserIds);

    if (rolesError) {
      console.error('[CLEANUP-SEED] Erro ao deletar user_roles:', rolesError);
      result.errors.push(`Erro ao deletar user_roles: ${rolesError.message}`);
    } else {
      result.user_roles_deletados = rolesCount || 0;
      console.log(`[CLEANUP-SEED] Deletados ${rolesCount} user_roles`);
    }

    // 11. Deletar app_notifications
    const { error: notifError, count: notifCount } = await supabaseAdmin
      .from('app_notifications')
      .delete({ count: 'exact' })
      .in('user_id', seedUserIds);

    if (notifError) {
      console.error('[CLEANUP-SEED] Erro ao deletar notifications:', notifError);
      result.errors.push(`Erro ao deletar notifications: ${notifError.message}`);
    } else {
      result.notifications_deletadas = notifCount || 0;
      console.log(`[CLEANUP-SEED] Deletadas ${notifCount} notifications`);
    }

    // 12. Deletar profiles
    const { error: delProfilesError, count: delProfilesCount } = await supabaseAdmin
      .from('profiles')
      .delete({ count: 'exact' })
      .in('id', seedUserIds);

    if (delProfilesError) {
      console.error('[CLEANUP-SEED] Erro ao deletar profiles:', delProfilesError);
      result.errors.push(`Erro ao deletar profiles: ${delProfilesError.message}`);
    } else {
      result.profiles_deletados = delProfilesCount || 0;
      console.log(`[CLEANUP-SEED] Deletados ${delProfilesCount} profiles`);
    }

    // 13. Deletar auth.users via Admin API
    let authDeleted = 0;
    for (const userId of seedUserIds) {
      const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDelError) {
        console.error(`[CLEANUP-SEED] Erro ao deletar auth user ${userId}:`, authDelError);
        result.errors.push(`Erro ao deletar auth user ${userId}: ${authDelError.message}`);
      } else {
        authDeleted++;
      }
    }
    result.auth_users_deletados = authDeleted;
    console.log(`[CLEANUP-SEED] Deletados ${authDeleted} auth users`);

    console.log('[CLEANUP-SEED] Limpeza concluída:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[CLEANUP-SEED] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
