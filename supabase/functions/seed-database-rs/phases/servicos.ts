import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedServicos(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  console.log(`[SEED-SERVICOS] Pulando fase (implementar futuramente)`);
  return { success: true, phase: 'servicos', created: 0, errors: [], duration: 0 };
}
