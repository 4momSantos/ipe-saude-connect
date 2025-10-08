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

      // Chamar edge function analisar-inscricao
      const { data, error } = await supabase.functions.invoke("analisar-inscricao", {
        body: {
          inscricao_id: inscricaoId,
          analista_id: user.id,
          decisao: "aprovado",
          comentarios: observacoes
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao aprovar inscrição");

      return data;
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

      // Chamar edge function analisar-inscricao
      const { data, error } = await supabase.functions.invoke("analisar-inscricao", {
        body: {
          inscricao_id: inscricaoId,
          analista_id: user.id,
          decisao: "rejeitado",
          comentarios: motivo
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao rejeitar inscrição");

      return data;
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
