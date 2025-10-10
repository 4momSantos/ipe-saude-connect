import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuditFilters {
  resource_type?: string;
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export function useAuditTrail(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ['audit-trail', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, resource_type')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        total: data.length,
        byAction: {} as Record<string, number>,
        byResource: {} as Record<string, number>,
      };

      data.forEach((log) => {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        stats.byResource[log.resource_type] = (stats.byResource[log.resource_type] || 0) + 1;
      });

      return stats;
    },
  });
}
