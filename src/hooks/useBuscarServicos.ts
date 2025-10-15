import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ServicoRede {
  servico_id: string;
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_cnpj: string;
  credenciado_endereco: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
  especialidade: string;
  procedimento: string;
  procedimento_codigo: string;
  categoria: string;
  profissional_nome?: string;
  profissional_crm?: string;
  preco_base?: number;
  preco_particular?: number;
  aceita_sus: boolean;
  disponivel_online: boolean;
  tempo_espera_medio?: number;
  local_atendimento?: string;
  observacoes?: string;
}

export interface FiltrosBusca {
  especialidade?: string;
  procedimento?: string;
  categoria?: string;
  cidade?: string;
  estado?: string;
  aceitaSus?: boolean;
  disponivelOnline?: boolean;
  precoMaximo?: number;
}

export function useBuscarServicos(filtros: FiltrosBusca) {
  return useQuery({
    queryKey: ["buscar-servicos-rede", filtros],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filtros.especialidade) params.append("especialidade", filtros.especialidade);
      if (filtros.procedimento) params.append("procedimento", filtros.procedimento);
      if (filtros.categoria) params.append("categoria", filtros.categoria);
      if (filtros.cidade) params.append("cidade", filtros.cidade);
      if (filtros.estado) params.append("estado", filtros.estado);
      if (filtros.aceitaSus !== undefined) params.append("aceita_sus", String(filtros.aceitaSus));
      if (filtros.disponivelOnline !== undefined) params.append("disponivel_online", String(filtros.disponivelOnline));
      if (filtros.precoMaximo) params.append("preco_maximo", String(filtros.precoMaximo));

      const { data, error } = await supabase.functions.invoke("buscar-servicos-rede", {
        method: "GET",
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar serviços");

      return data.data as ServicoRede[];
    },
    enabled: Object.keys(filtros).some(key => filtros[key as keyof FiltrosBusca] !== undefined),
    staleTime: 5 * 60 * 1000,
  });
}
