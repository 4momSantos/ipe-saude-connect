import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditTrailEntry {
  id: number;
  tabela: string;
  operacao: string;
  registro_id: string | null;
  dados_antes: any;
  dados_depois: any;
  usuario_id: string | null;
  usuario_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

export interface AuditFilters {
  tabela?: string;
  operacao?: string;
  usuario_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export function useAuditTrail(filters?: AuditFilters) {
  return useQuery({
    queryKey: ['audit-trail', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_trail' as any)
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filters?.tabela) {
        query = query.eq('tabela', filters.tabela);
      }
      if (filters?.operacao) {
        query = query.eq('operacao', filters.operacao);
      }
      if (filters?.usuario_id) {
        query = query.eq('usuario_id', filters.usuario_id);
      }
      if (filters?.data_inicio) {
        query = query.gte('timestamp', filters.data_inicio);
      }
      if (filters?.data_fim) {
        query = query.lte('timestamp', filters.data_fim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as AuditTrailEntry[];
    }
  });
}
