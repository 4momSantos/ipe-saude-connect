import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RelatorioProfissional {
  profissional_id: string;
  nome_profissional: string;
  crm: string;
  uf_crm: string;
  especialidade: string;
  credenciado_id: string;
  nome_credenciado: string;
  cidade: string;
  estado: string;
  tipo_vinculo: string;
  media_avaliacao: number;
  mediana_avaliacao: number;
  total_avaliacoes: number;
  media_produtividade: number;
  mediana_produtividade: number;
  media_horas: number;
  score_composto: number;
}

export interface RelatorioCredenciado {
  credenciado_id: string;
  nome_credenciado: string;
  cnpj: string;
  cidade: string;
  estado: string;
  total_profissionais: number;
  media_avaliacao_rede: number;
  mediana_avaliacao_rede: number;
  media_produtividade_rede: number;
  mediana_produtividade_rede: number;
  score_rede: number;
}

interface UseRelatorioRedeParams {
  tipo: "profissionais" | "rede";
  mesReferencia?: string | null;
  especialidade?: string | null;
  estado?: string | null;
  cidade?: string | null;
  credenciadoId?: string | null;
  enabled?: boolean;
}

export function useRelatorioRede(params: UseRelatorioRedeParams) {
  return useQuery({
    queryKey: ["relatorio-rede", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        tipo: params.tipo,
      });

      if (params.mesReferencia) searchParams.append("mes_referencia", params.mesReferencia);
      if (params.especialidade) searchParams.append("especialidade", params.especialidade);
      if (params.estado) searchParams.append("estado", params.estado);
      if (params.cidade) searchParams.append("cidade", params.cidade);
      if (params.credenciadoId) searchParams.append("credenciado_id", params.credenciadoId);

      const { data, error } = await supabase.functions.invoke("relatorio-rede", {
        body: {},
        method: "GET",
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar relatório");

      return data.data as RelatorioProfissional[] | RelatorioCredenciado[];
    },
    enabled: params.enabled !== false,
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos
  });
}
