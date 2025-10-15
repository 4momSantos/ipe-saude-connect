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
        
        if (!matchesFiltros(cred, filtros, 'credenciado')) return;

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
      });
    }

    // Adicionar profissionais
    if (modo === 'profissionais' || modo === 'hibrido') {
      profissionais?.forEach((prof) => {
        if (!matchesFiltros(prof, filtros, 'profissional')) return;

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

// Helper function to match all filters
function matchesFiltros(
  item: any,
  filtros: FiltrosMap,
  tipo: 'credenciado' | 'profissional'
): boolean {
  // Busca textual
  if (filtros.busca && !item.nome.toLowerCase().includes(filtros.busca.toLowerCase())) {
    return false;
  }

  // Status
  if (filtros.status?.length && !filtros.status.includes(item.status)) {
    return false;
  }

  // Tipo profissional
  if (tipo === 'profissional' && filtros.tipoProfissional?.length) {
    const isPrincipal = item.principal;
    if (filtros.tipoProfissional.includes('principal') && !isPrincipal) return false;
    if (filtros.tipoProfissional.includes('secundario') && isPrincipal) return false;
  }

  // Especialidades
  if (filtros.especialidades?.length) {
    const itemEspecialidades = tipo === 'credenciado' 
      ? item.especialidades 
      : item.credenciado_crms?.map((crm: any) => crm.especialidade) || [];
    
    const hasEsp = itemEspecialidades?.some((e: string) => 
      filtros.especialidades!.includes(e)
    );
    if (!hasEsp) return false;
  }

  // UF CRM
  if (filtros.ufCrm?.length && tipo === 'profissional') {
    const itemUfCrm = item.credenciado_crms?.map((crm: any) => crm.uf_crm) || [];
    const hasUf = itemUfCrm.some((uf: string) => filtros.ufCrm!.includes(uf));
    if (!hasUf) return false;
  }

  // Estados
  const itemEstado = tipo === 'credenciado' ? item.estado : item.credenciado?.estado;
  if (filtros.estados?.length && !filtros.estados.includes(itemEstado)) {
    return false;
  }

  // Cidades
  const itemCidade = tipo === 'credenciado' ? item.cidade : item.credenciado?.cidade;
  if (filtros.cidades?.length && !filtros.cidades.includes(itemCidade)) {
    return false;
  }

  // Score range (apenas profissionais)
  if (tipo === 'profissional') {
    const score = item.indicadores?.[0]?.score_geral || 0;
    if (filtros.scoreMinimo !== undefined && score < filtros.scoreMinimo) {
      return false;
    }
    if (filtros.scoreMaximo !== undefined && score > filtros.scoreMaximo) {
      return false;
    }
  }

  // Atendimentos (apenas profissionais)
  if (tipo === 'profissional') {
    const atendimentos = item.indicadores?.[0]?.atendimentos || 0;
    if (filtros.atendimentosMinimo !== undefined && atendimentos < filtros.atendimentosMinimo) {
      return false;
    }
    if (filtros.atendimentosMaximo !== undefined && atendimentos > filtros.atendimentosMaximo) {
      return false;
    }
  }

  // Produtividade (apenas profissionais)
  if (tipo === 'profissional' && filtros.produtividade) {
    const produtividade = item.indicadores?.[0]?.produtividade || 0;
    if (filtros.produtividade === 'alta' && produtividade < 80) return false;
    if (filtros.produtividade === 'media' && (produtividade < 60 || produtividade >= 80)) return false;
    if (filtros.produtividade === 'baixa' && produtividade >= 60) return false;
  }

  // Avaliação mínima (apenas profissionais)
  if (tipo === 'profissional' && filtros.avaliacaoMinima !== undefined) {
    const media = item.indicadores?.[0]?.avaliacao_media || 0;
    if (media < filtros.avaliacaoMinima) return false;
  }

  // Nota qualidade mínima (apenas profissionais)
  if (tipo === 'profissional' && filtros.notaQualidadeMin !== undefined) {
    const notaQualidade = item.indicadores?.[0]?.nota_qualidade || 0;
    if (notaQualidade < filtros.notaQualidadeMin) return false;
  }

  // Nota experiência mínima (apenas profissionais)
  if (tipo === 'profissional' && filtros.notaExperienciaMin !== undefined) {
    const notaExperiencia = item.indicadores?.[0]?.nota_experiencia || 0;
    if (notaExperiencia < filtros.notaExperienciaMin) return false;
  }

  // Apenas avaliados (apenas profissionais)
  if (tipo === 'profissional' && filtros.apenasAvaliados) {
    const totalAvaliacoes = item.indicadores?.[0]?.total_avaliacoes || 0;
    if (totalAvaliacoes === 0) return false;
  }

  return true;
}
