import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCredenciadoAtual() {
  return useQuery({
    queryKey: ['credenciado-atual'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('credenciados')
        .select(`
          id,
          nome,
          cpf,
          cnpj,
          status,
          inscricao_id,
          inscricoes_edital!inner(candidato_id)
        `)
        .eq('inscricoes_edital.candidato_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}
