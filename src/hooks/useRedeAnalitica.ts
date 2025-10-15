import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PerfilProfissional {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  principal: boolean;
  credenciado: {
    id: string;
    nome: string;
    cidade: string;
    estado: string;
    latitude: number;
    longitude: number;
  };
  credenciado_crms: Array<{
    crm: string;
    uf_crm: string;
    especialidade: string;
    horarios_atendimento: Array<any>;
  }>;
  avaliacoes: Array<{
    nota_qualidade: number;
    nota_tempo_resposta: number;
    nota_experiencia: number;
    nota_comunicacao: number;
    comentario: string;
    data_avaliacao: string;
  }>;
  indicadores: Array<{
    periodo: string;
    score_geral: number;
    avaliacao_media: number;
    atendimentos: number;
  }>;
}

export interface ProfissionalRede {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  credenciado: {
    nome: string;
    cidade: string;
    estado: string;
    latitude: number;
    longitude: number;
  };
  credenciado_crms: Array<{
    crm: string;
    especialidade: string;
  }>;
  indicadores: Array<{
    score_geral: number;
    avaliacao_media: number;
    atendimentos: number;
  }>;
}

export interface EstatisticasRede {
  total_profissionais: number;
  total_credenciados: number;
  especialidades: string[];
  media_avaliacao_geral: number;
  top_especialidades: Array<{
    especialidade: string;
    media: number;
    profissionais: number;
  }>;
  distribuicao_geografica: Array<{
    estado: string;
    total: number;
  }>;
}

export function usePerfilProfissional(profissionalId: string) {
  return useQuery({
    queryKey: ["perfil-profissional", profissionalId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `rede-analitica/perfil/${profissionalId}`,
        { method: 'GET' }
      );
      
      if (error) throw error;
      return data as PerfilProfissional;
    },
    enabled: !!profissionalId,
  });
}

export function useRedeProfissionais(filtros?: {
  especialidade?: string;
  cidade?: string;
  uf?: string;
  score_minimo?: number;
}) {
  return useQuery({
    queryKey: ["rede-profissionais", filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros?.especialidade) params.append('especialidade', filtros.especialidade);
      if (filtros?.cidade) params.append('cidade', filtros.cidade);
      if (filtros?.uf) params.append('uf', filtros.uf);
      if (filtros?.score_minimo) params.append('score_minimo', filtros.score_minimo.toString());
      
      const { data, error } = await supabase.functions.invoke(
        `rede-analitica/rede?${params.toString()}`,
        { method: 'GET' }
      );
      
      if (error) throw error;
      return data as ProfissionalRede[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useEstatisticasRede() {
  return useQuery({
    queryKey: ["estatisticas-rede"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('rede-analitica/estatisticas', {
        method: 'GET'
      });
      if (error) throw error;
      return data as EstatisticasRede;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useRecalcularIndicadores() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { profissional_id: string; periodo?: string }) => {
      const { data, error } = await supabase.functions.invoke('rede-analitica/calcular-indicadores', {
        body: params,
        method: 'POST',
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rede-profissionais"] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-rede"] });
      toast.success("Indicadores recalculados com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao recalcular indicadores: ${error.message}`);
    },
  });
}
