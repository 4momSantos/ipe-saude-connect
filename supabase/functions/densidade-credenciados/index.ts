// Edge Function: densidade-credenciados
// Calcula densidade de credenciados por zona geográfica

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DensidadeZona {
  zona_id: string;
  zona: string;
  cidade: string;
  estado: string;
  populacao: number;
  area_km2: number;
  credenciados: number;
  densidade: number; // credenciados por 10.000 habitantes
  cor: string;
  geometry: any;
}

interface DensidadeResponse {
  cidade: string;
  estado: string;
  total_credenciados: number;
  total_populacao: number;
  densidade_geral: number;
  zonas: DensidadeZona[];
}

function getCorDensidade(densidade: number): string {
  // Escala de cores baseada em densidade (credenciados por 10k habitantes)
  if (densidade >= 3) return '#10b981';   // Verde escuro (excelente cobertura)
  if (densidade >= 2) return '#84cc16';   // Verde claro (boa cobertura)
  if (densidade >= 1) return '#eab308';   // Amarelo (razoável)
  if (densidade >= 0.5) return '#f97316'; // Laranja (baixa cobertura)
  return '#ef4444';                       // Vermelho (crítica)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Parse request (cidade e estado opcionais)
    const url = new URL(req.url);
    const cidade = url.searchParams.get('cidade') || 'Recife';
    const estado = url.searchParams.get('estado') || 'PE';

    console.log(`[DENSIDADE] Calculando densidade para ${cidade}/${estado}`);

    // Buscar zonas da cidade/estado
    const { data: zonas, error: zonasError } = await supabase
      .from('zonas_geograficas')
      .select('*')
      .eq('cidade', cidade)
      .eq('estado', estado);

    if (zonasError) {
      throw new Error(`Erro ao buscar zonas: ${zonasError.message}`);
    }

    if (!zonas || zonas.length === 0) {
      console.log(`[DENSIDADE] Nenhuma zona encontrada para ${cidade}/${estado}`);
      return new Response(
        JSON.stringify({
          cidade,
          estado,
          total_credenciados: 0,
          total_populacao: 0,
          densidade_geral: 0,
          zonas: [],
          message: `Nenhuma zona cadastrada para ${cidade}/${estado}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DENSIDADE] ${zonas.length} zonas encontradas`);

    // Calcular densidade para cada zona
    const densidades: DensidadeZona[] = await Promise.all(
      zonas.map(async (zona) => {
        // Contar credenciados ativos na zona
        const { count, error: countError } = await supabase
          .from('credenciados')
          .select('*', { count: 'exact', head: true })
          .eq('zona_id', zona.id)
          .eq('status', 'Ativo');

        if (countError) {
          console.error(`[DENSIDADE] Erro ao contar credenciados da zona ${zona.zona}:`, countError);
        }

        const credenciados = count || 0;
        
        // Calcular densidade (credenciados por 10.000 habitantes)
        const densidade = zona.populacao > 0 
          ? (credenciados / zona.populacao) * 10000 
          : 0;

        const densidadeArredondada = Math.round(densidade * 100) / 100;

        console.log(`[DENSIDADE] Zona ${zona.zona}: ${credenciados} credenciados, densidade ${densidadeArredondada}`);

        return {
          zona_id: zona.id,
          zona: zona.zona,
          cidade: zona.cidade,
          estado: zona.estado,
          populacao: zona.populacao,
          area_km2: zona.area_km2,
          credenciados,
          densidade: densidadeArredondada,
          cor: getCorDensidade(densidadeArredondada),
          geometry: zona.geometry,
        };
      })
    );

    // Calcular totais
    const total_credenciados = densidades.reduce((sum, z) => sum + z.credenciados, 0);
    const total_populacao = densidades.reduce((sum, z) => sum + z.populacao, 0);
    const densidade_geral = total_populacao > 0 
      ? Math.round((total_credenciados / total_populacao) * 10000 * 100) / 100
      : 0;

    const result: DensidadeResponse = {
      cidade,
      estado,
      total_credenciados,
      total_populacao,
      densidade_geral,
      zonas: densidades,
    };

    console.log(`[DENSIDADE] Total: ${total_credenciados} credenciados, densidade geral ${densidade_geral}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    console.error('[DENSIDADE] Erro:', errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        cidade: 'Recife',
        estado: 'PE',
        total_credenciados: 0,
        total_populacao: 0,
        densidade_geral: 0,
        zonas: [],
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
