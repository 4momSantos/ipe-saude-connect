import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FluxoMetrics {
  editaisAtivos: number;
  editaisProgramaticos: number;
  inscricoesProcessadas24h: number;
  taxaSucesso: number;
  latenciaMedia: number;
  taxaGeocoding: number;
  contratosAssinados24h: number;
  credenciadosAtivados24h: number;
  certificadosEmitidos24h: number;
}

export function useFluxoMetrics() {
  return useQuery({
    queryKey: ["fluxo-metrics"],
    queryFn: async (): Promise<FluxoMetrics> => {
      console.log("[FLUXO_METRICS] Buscando métricas consolidadas");

      // 1. Editais ativos e programáticos
      const { data: editais, error: editaisError } = await supabase
        .from("editais")
        .select("id, use_programmatic_flow")
        .eq("status", "aberto");

      if (editaisError) throw editaisError;

      const editaisAtivos = editais?.length || 0;
      const editaisProgramaticos =
        editais?.filter((e) => e.use_programmatic_flow).length || 0;

      // 2. Inscrições processadas nas últimas 24h
      const { data: inscricoes, error: inscricoesError } = await supabase
        .from("inscricoes_edital")
        .select("id, status, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in("status", ["aprovado", "inabilitado"]);

      if (inscricoesError) throw inscricoesError;

      const inscricoesProcessadas24h = inscricoes?.length || 0;
      const aprovadas = inscricoes?.filter((i) => i.status === "aprovado").length || 0;
      const taxaSucesso =
        inscricoesProcessadas24h > 0
          ? (aprovadas / inscricoesProcessadas24h) * 100
          : 0;

      // 3. Latência média (inscrição → credenciado)
      const { data: latenciaData, error: latenciaError } = await supabase
        .from("inscricoes_edital")
        .select("id, created_at, credenciados(created_at)")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not("credenciados", "is", null);

      if (latenciaError) throw latenciaError;

      let latenciaMedia = 0;
      if (latenciaData && latenciaData.length > 0) {
        const latencias = latenciaData
          .filter((item: any) => item.credenciados && item.credenciados.length > 0)
          .map((item: any) => {
            const inscricaoTime = new Date(item.created_at).getTime();
            const credenciadoTime = new Date(
              item.credenciados[0].created_at
            ).getTime();
            return (credenciadoTime - inscricaoTime) / 1000 / 60; // minutos
          });

        if (latencias.length > 0) {
          latenciaMedia =
            latencias.reduce((acc, val) => acc + val, 0) / latencias.length;
        }
      }

      // 4. Taxa de geocoding
      const { data: geoStats, error: geoError } = await supabase
        .from("view_credenciados_geo_stats")
        .select("success_rate_percent")
        .single();

      if (geoError && geoError.code !== "PGRST116") {
        console.error("[FLUXO_METRICS] Erro ao buscar geo stats:", geoError);
      }

      const taxaGeocoding = geoStats?.success_rate_percent || 0;

      // 5. Contratos assinados nas últimas 24h
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select("id")
        .eq("status", "assinado")
        .gte("assinado_em", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (contratosError) throw contratosError;

      const contratosAssinados24h = contratos?.length || 0;

      // 6. Credenciados ativados nas últimas 24h
      const { data: credenciados, error: credenciadosError } = await supabase
        .from("credenciados")
        .select("id")
        .eq("status", "Ativo")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (credenciadosError) throw credenciadosError;

      const credenciadosAtivados24h = credenciados?.length || 0;

      // 7. Certificados emitidos nas últimas 24h
      const { data: certificados, error: certificadosError } = await supabase
        .from("certificados")
        .select("id")
        .gte("emitido_em", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (certificadosError) throw certificadosError;

      const certificadosEmitidos24h = certificados?.length || 0;

      console.log("[FLUXO_METRICS] ✅ Métricas coletadas:", {
        editaisAtivos,
        editaisProgramaticos,
        inscricoesProcessadas24h,
        taxaSucesso,
        latenciaMedia,
      });

      return {
        editaisAtivos,
        editaisProgramaticos,
        inscricoesProcessadas24h,
        taxaSucesso,
        latenciaMedia,
        taxaGeocoding,
        contratosAssinados24h,
        credenciadosAtivados24h,
        certificadosEmitidos24h,
      };
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });
}
