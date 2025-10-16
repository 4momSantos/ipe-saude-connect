import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface FilterPreferences {
  searchQuery?: string;
  filtroStatus?: string | null;
  filtroTipoDoc?: string[];
  filtroAnalista?: string | null;
  filtroPeriodo?: { inicio?: Date; fim?: Date };
  filtroSituacaoPrazo?: string | null;
  incluirArquivados?: boolean;
}

export function useFilterPreferences(pageKey: string) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data: preferences } = useQuery({
    queryKey: ['filter-preferences', pageKey, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .eq('page_key', pageKey)
        .maybeSingle();

      if (error) throw error;
      return (data?.preferences as FilterPreferences) || null;
    },
    enabled: !!userId
  });

  const savePreferences = useMutation({
    mutationFn: async (newPreferences: FilterPreferences) => {
      if (!userId) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert([{
          user_id: userId,
          page_key: pageKey,
          preferences: newPreferences as any,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-preferences', pageKey, userId] });
    }
  });

  return {
    preferences,
    savePreferences: savePreferences.mutate,
    isLoading: savePreferences.isPending
  };
}
