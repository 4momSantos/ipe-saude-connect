import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AprovarParams {
  inscricaoId: string;
  observacoes?: string;
}

interface RejeitarParams {
  inscricaoId: string;
  motivo: string;
}

export function useAnalisarInscricao() {
  const queryClient = useQueryClient();

  const aprovarMutation = useMutation({
    mutationFn: async ({ inscricaoId, observacoes }: AprovarParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Criar análise aprovada
      const { data: analise, error: analiseError } = await supabase
        .from("analises")
        .update({
          status: "aprovado",
          analisado_em: new Date().toISOString(),
          analista_id: user.id,
          parecer: observacoes || "Aprovado"
        })
        .eq("inscricao_id", inscricaoId)
        .select()
        .single();

      if (analiseError) throw analiseError;

      // 2. Atualizar status da inscrição
      const { error: inscricaoError } = await supabase
        .from("inscricoes_edital")
        .update({
          status: "aprovado",
          analisado_por: user.id,
          analisado_em: new Date().toISOString()
        })
        .eq("id", inscricaoId);

      if (inscricaoError) throw inscricaoError;

      return { analise, inscricaoId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["analises"] });
      toast.success("Inscrição aprovada com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Erro ao aprovar inscrição:", error);
      toast.error("Erro ao aprovar inscrição: " + error.message);
    }
  });

  const rejeitarMutation = useMutation({
    mutationFn: async ({ inscricaoId, motivo }: RejeitarParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Criar análise rejeitada
      const { data: analise, error: analiseError } = await supabase
        .from("analises")
        .update({
          status: "reprovado",
          analisado_em: new Date().toISOString(),
          analista_id: user.id,
          motivo_reprovacao: motivo,
          parecer: motivo
        })
        .eq("inscricao_id", inscricaoId)
        .select()
        .single();

      if (analiseError) throw analiseError;

      // 2. Atualizar status da inscrição
      const { error: inscricaoError } = await supabase
        .from("inscricoes_edital")
        .update({
          status: "inabilitado",
          analisado_por: user.id,
          analisado_em: new Date().toISOString(),
          motivo_rejeicao: motivo
        })
        .eq("id", inscricaoId);

      if (inscricaoError) throw inscricaoError;

      return { analise, inscricaoId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["analises"] });
      toast.success("Inscrição rejeitada");
    },
    onError: (error: Error) => {
      console.error("Erro ao rejeitar inscrição:", error);
      toast.error("Erro ao rejeitar inscrição: " + error.message);
    }
  });

  return {
    aprovar: aprovarMutation.mutateAsync,
    rejeitar: rejeitarMutation.mutateAsync,
    isAprovarLoading: aprovarMutation.isPending,
    isRejeitarLoading: rejeitarMutation.isPending,
    isLoading: aprovarMutation.isPending || rejeitarMutation.isPending
  };
}
