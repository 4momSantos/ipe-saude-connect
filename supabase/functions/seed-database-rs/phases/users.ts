import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedUsers(
  supabase: SupabaseClient,
  count: number,
  dryRun: boolean
): Promise<SeedResult> {
  const errors: string[] = [];
  let created = 0;

  console.log(`[SEED-USERS] Criando ${count} usuários (dry run: ${dryRun})`);

  if (dryRun) {
    return {
      success: true,
      phase: 'users',
      created: count,
      errors: [],
      duration: 0
    };
  }

  try {
    for (let i = 0; i < count; i++) {
      const email = `candidato.seed.${Date.now()}.${i}@example.com`;
      const password = 'Seed@123456';

      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nome: `Candidato Seed ${i + 1}`
          }
        });

        if (authError) {
          errors.push(`Erro ao criar usuário ${email}: ${authError.message}`);
          continue;
        }

        // Garantir role candidato
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user!.id,
            role: 'candidato'
          });

        if (roleError && !roleError.message.includes('duplicate')) {
          errors.push(`Erro ao atribuir role para ${email}: ${roleError.message}`);
        }

        created++;
      } catch (error) {
        errors.push(`Exceção ao criar ${email}: ${error.message}`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: errors.length === 0,
      phase: 'users',
      created,
      errors,
      duration: 0
    };
  } catch (error) {
    throw new Error(`Falha na fase de usuários: ${error.message}`);
  }
}
