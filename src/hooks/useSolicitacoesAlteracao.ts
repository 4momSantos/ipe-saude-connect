import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SolicitacaoAlteracao {
  id: string;
  credenciado_id: string;
  tipo_alteracao: string;
  justificativa: string | null;
  dados_atuais: any;
  dados_propostos: any;
  status: string;
  solicitado_em: string;
  analisado_em: string | null;
  analisado_por: string | null;
  observacoes_analise: string | null;
}

export function useSolicitacoesAlteracao(credenciadoId: string) {
  return useQuery({
    queryKey: ["solicitacoes-alteracao", credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_alteracao")
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .order("solicitado_em", { ascending: false });

      if (error) throw error;
      return data as SolicitacaoAlteracao[];
    },
    enabled: !!credenciadoId,
  });
}

export function useAprovarSolicitacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, observacoes }: { id: string; observacoes?: string }) => {
      const { error } = await supabase
        .from("solicitacoes_alteracao")
        .update({
          status: "Aprovado",
          analisado_em: new Date().toISOString(),
          observacoes_analise: observacoes,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-alteracao"] });
      toast.success("Solicitação aprovada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao aprovar solicitação", {
        description: error.message,
      });
    },
  });
}

export function useRejeitarSolicitacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, observacoes }: { id: string; observacoes?: string }) => {
      const { error } = await supabase
        .from("solicitacoes_alteracao")
        .update({
          status: "Rejeitado",
          analisado_em: new Date().toISOString(),
          observacoes_analise: observacoes,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-alteracao"] });
      toast.success("Solicitação rejeitada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao rejeitar solicitação", {
        description: error.message,
      });
    },
  });
}

export function useCriarSolicitacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      credenciado_id: string;
      tipo_alteracao: string;
      justificativa: string;
      dados_atuais: any;
      dados_propostos: any;
    }) => {
      const { error } = await supabase
        .from("solicitacoes_alteracao")
        .insert({
          ...params,
          status: "Pendente",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-alteracao"] });
      toast.success("Solicitação enviada com sucesso", {
        description: "Aguarde análise do gestor",
      });
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar solicitação", {
        description: error.message,
      });
    },
  });
}
