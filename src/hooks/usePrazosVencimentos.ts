// FASE 1: Hook para buscar prazos vencendo
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrazoVencimento {
  id: string;
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_email: string;
  tipo_prazo: string;
  data_vencimento: string;
  dias_restantes: number;
  status: string;
}

export interface TotalizadoresPrazos {
  vencidos: number;
  vencendo7dias: number;
  vencendo30dias: number;
  validos: number;
}

export const usePrazosVencimentos = () => {
  return useQuery({
    queryKey: ["prazos-vencimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prazos_credenciamento")
        .select(`
          id,
          credenciado_id,
          tipo_prazo,
          data_vencimento,
          status,
          credenciados(nome, email)
        `)
        .eq("status", "ativo")
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const prazos: PrazoVencimento[] = (data || []).map(prazo => {
        const dataVencimento = new Date(prazo.data_vencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        
        const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: prazo.id,
          credenciado_id: prazo.credenciado_id,
          credenciado_nome: prazo.credenciados?.nome || "N/A",
          credenciado_email: prazo.credenciados?.email || "N/A",
          tipo_prazo: prazo.tipo_prazo,
          data_vencimento: prazo.data_vencimento,
          dias_restantes: diasRestantes,
          status: prazo.status
        };
      });

      // Calcular totalizadores
      const totalizadores: TotalizadoresPrazos = {
        vencidos: prazos.filter(p => p.dias_restantes < 0).length,
        vencendo7dias: prazos.filter(p => p.dias_restantes >= 0 && p.dias_restantes <= 7).length,
        vencendo30dias: prazos.filter(p => p.dias_restantes > 7 && p.dias_restantes <= 30).length,
        validos: prazos.filter(p => p.dias_restantes > 30).length
      };

      return { prazos, totalizadores };
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });
};

export const usePrazosVencidos = () => {
  return useQuery({
    queryKey: ["prazos-vencidos-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prazos_credenciamento")
        .select("id, data_vencimento", { count: "exact", head: false })
        .eq("status", "ativo");

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const vencidos = (data || []).filter(p => {
        const dataVencimento = new Date(p.data_vencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        return dataVencimento < hoje;
      }).length;

      return vencidos;
    },
    refetchInterval: 60000,
  });
};