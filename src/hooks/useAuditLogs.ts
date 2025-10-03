import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  action: string;
  user_email: string | null;
  user_role: string | null;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export function useAuditLogs(userId?: string, actionFilter?: string) {
  return useQuery({
    queryKey: ['audit-logs', userId, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as AuditLog[];
    },
    enabled: true,
  });
}

export function useAuditLogsByResource(resourceType: string, resourceId: string) {
  return useQuery({
    queryKey: ['audit-logs', resourceType, resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data as AuditLog[];
    },
  });
}
