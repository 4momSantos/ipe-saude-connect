import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeedConfig {
  volume: 'small' | 'medium' | 'full';
  selectedZones?: string[];
  dryRun?: boolean;
  phases?: string[];
}

interface SeedResult {
  success: boolean;
  phase: string;
  created: number;
  errors: string[];
  duration: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { config }: { config?: SeedConfig } = await req.json();
    const volume = config?.volume || 'medium';
    const dryRun = config?.dryRun || false;
    
    console.log(`[SEED-RS] Iniciando seed com volume: ${volume}, dry run: ${dryRun}`);

    const results: SeedResult[] = [];
    const totalStart = Date.now();

    // Importar fases
    const { seedUsers } = await import('./phases/users.ts');
    const { seedEspecialidades } = await import('./phases/especialidades.ts');
    const { seedEditais } = await import('./phases/editais.ts');
    const { seedInscricoes } = await import('./phases/inscricoes.ts');
    const { seedCredenciados } = await import('./phases/credenciados.ts');
    const { seedCRMs } = await import('./phases/crms.ts');
    const { seedServicos } = await import('./phases/servicos.ts');
    const { seedDocumentos } = await import('./phases/documentos.ts');
    const { seedContratos } = await import('./phases/contratos.ts');
    const { seedAvaliacoes } = await import('./phases/avaliacoes.ts');
    const { seedPrazos } = await import('./phases/prazos.ts');

    // Configurar volumes
    const volumes = {
      small: { users: 10, especialidades: 5, editais: 1, credenciados: 30 },
      medium: { users: 30, especialidades: 8, editais: 2, credenciados: 150 },
      full: { users: 50, especialidades: 12, editais: 3, credenciados: 200 }
    };

    const volumeConfig = volumes[volume];

    // Executar fases sequencialmente
    const phases = config?.phases || [
      'users', 'especialidades', 'editais', 'inscricoes', 
      'credenciados', 'crms', 'servicos', 'documentos', 
      'contratos', 'avaliacoes', 'prazos'
    ];

    for (const phase of phases) {
      const phaseStart = Date.now();
      let result: SeedResult;

      try {
        switch (phase) {
          case 'users':
            result = await seedUsers(supabase, volumeConfig.users, dryRun);
            break;
          case 'especialidades':
            result = await seedEspecialidades(supabase, volumeConfig.especialidades, dryRun);
            break;
          case 'editais':
            result = await seedEditais(supabase, volumeConfig.editais, dryRun);
            break;
          case 'inscricoes':
            result = await seedInscricoes(supabase, volumeConfig.credenciados, dryRun);
            break;
          case 'credenciados':
            result = await seedCredenciados(supabase, volumeConfig.credenciados, config?.selectedZones, dryRun);
            break;
          case 'crms':
            result = await seedCRMs(supabase, dryRun);
            break;
          case 'servicos':
            result = await seedServicos(supabase, dryRun);
            break;
          case 'documentos':
            result = await seedDocumentos(supabase, dryRun);
            break;
          case 'contratos':
            result = await seedContratos(supabase, dryRun);
            break;
          case 'avaliacoes':
            result = await seedAvaliacoes(supabase, dryRun);
            break;
          case 'prazos':
            result = await seedPrazos(supabase, dryRun);
            break;
          default:
            throw new Error(`Fase desconhecida: ${phase}`);
        }

        result.duration = Date.now() - phaseStart;
        results.push(result);
        
        console.log(`[SEED-RS] ✅ ${phase}: ${result.created} registros em ${result.duration}ms`);
      } catch (error) {
        const errorResult: SeedResult = {
          success: false,
          phase,
          created: 0,
          errors: [error.message],
          duration: Date.now() - phaseStart
        };
        results.push(errorResult);
        console.error(`[SEED-RS] ❌ ${phase}:`, error);
        
        // Em caso de erro, para a execução
        break;
      }
    }

    const totalDuration = Date.now() - totalStart;
    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const hasErrors = results.some(r => !r.success);

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        dryRun,
        volume,
        totalCreated,
        totalDuration,
        results,
        summary: {
          phases: results.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: hasErrors ? 500 : 200
      }
    );

  } catch (error) {
    console.error('[SEED-RS] Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
