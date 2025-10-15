import { useMemo } from "react";
import { useCredenciadosMap } from "./useCredenciados";
import { useRedeProfissionais } from "./useRedeAnalitica";
import type { MapMode, FiltrosMap } from "@/components/analytics/MapaUnificado";

export interface MapMarker {
  id: string;
  nome: string;
  tipo: 'credenciado' | 'profissional';
  latitude: number | null;
  longitude: number | null;
  especialidades?: string[];
  score?: number;
  endereco?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
}

export function useMapaUnificado(modo: MapMode, filtros: FiltrosMap) {
  const { data: credenciados, isLoading: loadingCred } = useCredenciadosMap({
    enabled: modo === 'credenciados' || modo === 'hibrido',
  });

  const { data: profissionais, isLoading: loadingProf } = useRedeProfissionais({
    especialidade: filtros.especialidades?.[0],
    cidade: filtros.cidades?.[0],
    uf: filtros.estados?.[0],
    score_minimo: filtros.scoreMinimo,
  });

  const markers = useMemo(() => {
    const result: MapMarker[] = [];

    // Adicionar credenciados
    if (modo === 'credenciados' || modo === 'hibrido') {
      credenciados?.forEach((cred) => {
        if (!cred.latitude || !cred.longitude) return;
        
        const matchesBusca = !filtros.busca || 
          cred.nome.toLowerCase().includes(filtros.busca.toLowerCase());
        
        const matchesEstado = !filtros.estados?.length || 
          filtros.estados.includes(cred.estado || '');
        
        const matchesCidade = !filtros.cidades?.length || 
          filtros.cidades.includes(cred.cidade || '');

        if (matchesBusca && matchesEstado && matchesCidade) {
          result.push({
            id: cred.id,
            nome: cred.nome,
            tipo: 'credenciado',
            latitude: cred.latitude,
            longitude: cred.longitude,
            especialidades: cred.especialidades,
            endereco: cred.endereco,
            cidade: cred.cidade,
            estado: cred.estado,
            telefone: cred.telefone,
            email: cred.email,
            score: undefined,
          });
        }
      });
    }

    // Adicionar profissionais
    if (modo === 'profissionais' || modo === 'hibrido') {
      profissionais?.forEach((prof) => {
        // Profissionais não têm coordenadas diretas, usar do credenciado
        const matchesBusca = !filtros.busca || 
          prof.nome.toLowerCase().includes(filtros.busca.toLowerCase());

        if (matchesBusca) {
          const especialidades = prof.credenciado_crms?.map(crm => crm.especialidade) || [];
          const scoreGeral = prof.indicadores?.[0]?.score_geral;
          
          result.push({
            id: prof.id,
            nome: prof.nome,
            tipo: 'profissional',
            latitude: prof.credenciado?.latitude || null,
            longitude: prof.credenciado?.longitude || null,
            especialidades,
            score: scoreGeral,
            telefone: prof.telefone,
            email: prof.email,
            cidade: prof.credenciado?.cidade,
            estado: prof.credenciado?.estado,
          });
        }
      });
    }

    return result;
  }, [modo, credenciados, profissionais, filtros]);

  const stats = useMemo(() => {
    const ativos = markers.length;
    const especialidadesSet = new Set<string>();
    let somaScores = 0;
    let countScores = 0;

    markers.forEach((m) => {
      m.especialidades?.forEach((e) => especialidadesSet.add(e));
      if (m.score !== undefined) {
        somaScores += m.score;
        countScores++;
      }
    });

    return {
      total: markers.length,
      ativos,
      especialidades: especialidadesSet.size,
      mediaScore: countScores > 0 ? somaScores / countScores : undefined,
    };
  }, [markers]);

  return {
    markers,
    stats,
    isLoading: loadingCred || loadingProf,
  };
}
