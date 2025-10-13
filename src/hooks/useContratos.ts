import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useContratos(inscricaoId: string) {
  const query = useQuery({
    queryKey: ["contratos", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select(`
          *,
          inscricao:inscricoes_edital(
            id,
            candidato_id,
            dados_inscricao
          )
        `)
        .eq("inscricao_id", inscricaoId)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!inscricaoId
  });

  // Setup Realtime subscription para atualizações automáticas
  useEffect(() => {
    if (!inscricaoId) return;

    const channel = supabase
      .channel(`contratos-${inscricaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contratos",
          filter: `inscricao_id=eq.${inscricaoId}`
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId, query]);

  return {
    contrato: query.data,
    status: query.data?.status,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}

export function useTodosContratos() {
  const query = useQuery({
    queryKey: ["contratos", "todos"],
    queryFn: async () => {
      console.log('[CONTRATOS] Iniciando fetch de contratos...');
      
      const { data, error } = await supabase
        .from("contratos")
        .select(`
          *,
          inscricao:inscricoes_edital(
            id,
            candidato_id,
            dados_inscricao,
            candidato:profiles(
              id,
              nome,
              email
            ),
            edital:editais(
              id,
              titulo,
              numero_edital
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('[CONTRATOS] Erro ao buscar contratos:', error);
        throw error;
      }
      
      console.log('[CONTRATOS] Contratos retornados:', data?.length);
      console.log('[CONTRATOS] Dados completos:', data);
      
      // Log de contratos sem HTML para debug
      const contratosSemHTML = data.filter(c => 
        c.status === 'pendente_assinatura' && 
        !(c.dados_contrato as any)?.html
      );
      
      if (contratosSemHTML.length > 0) {
        console.warn('[CONTRATOS] Encontrados contratos sem HTML:', contratosSemHTML.map(c => ({
          id: c.id,
          numero: c.numero_contrato,
          inscricao_id: c.inscricao_id
        })));
      }
      
      return data;
    }
  });

  const filtrar = (status?: string) => {
    if (!query.data) return [];
    if (!status) return query.data;
    return query.data.filter(c => c.status === status);
  };

  return {
    contratos: query.data || [],
    filtrar,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}
