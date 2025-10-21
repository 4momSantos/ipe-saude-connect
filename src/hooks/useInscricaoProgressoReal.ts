import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type StatusEtapa = 
  | "em_analise" 
  | "aprovado" 
  | "aguardando_assinatura" 
  | "assinado" 
  | "ativo"
  | "rejeitado";

interface ProgressoInscricao {
  etapaAtual: StatusEtapa;
  etapaIndex: number;
  eventos: any[];
  temDocumentosValidados: boolean;
  temAprovacao: boolean;
  temContratoGerado: boolean;
  temContratoAssinado: boolean;
  temCredenciamentoAtivo: boolean;
}

export function useInscricaoProgressoReal(inscricaoId: string) {
  const eventosQuery = useQuery({
    queryKey: ["inscricao-eventos", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricao_eventos")
        .select("*")
        .eq("inscricao_id", inscricaoId)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!inscricaoId,
  });

  const contratoQuery = useQuery({
    queryKey: ["contrato-status", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("status")
        .eq("inscricao_id", inscricaoId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!inscricaoId,
  });

  const credenciadoQuery = useQuery({
    queryKey: ["credenciado-status", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credenciados")
        .select("status")
        .eq("inscricao_id", inscricaoId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!inscricaoId,
  });

  // Setup Realtime para eventos
  useEffect(() => {
    if (!inscricaoId) return;

    const channel = supabase
      .channel(`inscricao-eventos-${inscricaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inscricao_eventos",
          filter: `inscricao_id=eq.${inscricaoId}`,
        },
        () => {
          eventosQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId, eventosQuery]);

  // Setup Realtime para contratos
  useEffect(() => {
    if (!inscricaoId) return;

    const channel = supabase
      .channel(`contratos-status-${inscricaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contratos",
          filter: `inscricao_id=eq.${inscricaoId}`,
        },
        () => {
          contratoQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId, contratoQuery]);

  // Setup Realtime para credenciados
  useEffect(() => {
    if (!inscricaoId) return;

    const channel = supabase
      .channel(`credenciados-status-${inscricaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "credenciados",
          filter: `inscricao_id=eq.${inscricaoId}`,
        },
        () => {
          credenciadoQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId, credenciadoQuery]);

  // Calcular progresso baseado nos eventos reais
  const calcularProgresso = (): ProgressoInscricao => {
    const eventos = eventosQuery.data || [];
    
    // Verificar marcos importantes nos eventos
    const temDocumentosValidados = eventos.some(
      (e) => e.tipo_evento === "documento_validado" && (e.dados as any)?.status === "aprovado"
    );
    
    const temAprovacao = eventos.some(
      (e) =>
        e.tipo_evento === "status_alterado" &&
        (e.dados as any)?.status_novo === "aprovado"
    );

    const statusContrato = contratoQuery.data?.status;
    const statusCredenciado = credenciadoQuery.data?.status;

    // Determinar etapa atual baseada nos marcos reais
    let etapaAtual: StatusEtapa = "em_analise";
    let etapaIndex = 0;

    // Lógica de progressão:
    // 1. Começa em "em_analise"
    if (temAprovacao) {
      // 2. Quando analista aprova → "aprovado"
      etapaAtual = "aprovado";
      etapaIndex = 1;
    }

    if (statusContrato === "aguardando_assinatura" || statusContrato === "enviado") {
      // 3. Quando contrato é gerado e enviado → "aguardando_assinatura"
      etapaAtual = "aguardando_assinatura";
      etapaIndex = 2;
    }

    if (statusContrato === "assinado") {
      // 4. Quando contrato é assinado → "assinado"
      etapaAtual = "assinado";
      etapaIndex = 3;
    }

    if (statusCredenciado === "ativo") {
      // 5. Quando vira credenciado → "ativo"
      etapaAtual = "ativo";
      etapaIndex = 4;
    }

    // Verificar rejeição
    const temRejeicao = eventos.some(
      (e) =>
        e.tipo_evento === "status_alterado" &&
        (e.dados as any)?.status_novo === "rejeitado"
    );

    if (temRejeicao) {
      etapaAtual = "rejeitado";
      etapaIndex = -1;
    }

    return {
      etapaAtual,
      etapaIndex,
      eventos,
      temDocumentosValidados,
      temAprovacao,
      temContratoGerado: !!statusContrato,
      temContratoAssinado: statusContrato === "assinado",
      temCredenciamentoAtivo: statusCredenciado === "ativo",
    };
  };

  const progresso = calcularProgresso();

  return {
    ...progresso,
    isLoading:
      eventosQuery.isLoading ||
      contratoQuery.isLoading ||
      credenciadoQuery.isLoading,
    isError:
      eventosQuery.isError || contratoQuery.isError || credenciadoQuery.isError,
    refetch: () => {
      eventosQuery.refetch();
      contratoQuery.refetch();
      credenciadoQuery.refetch();
    },
  };
}
