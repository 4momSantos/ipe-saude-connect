import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

export async function seedDocumentos(
  supabase: SupabaseClient,
  dryRun: boolean
): Promise<SeedResult> {
  console.log(`[SEED-DOCUMENTOS] Pulando fase (implementar futuramente)`);
  return { success: true, phase: 'documentos', created: 0, errors: [], duration: 0 };
}
