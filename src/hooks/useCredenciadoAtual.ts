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
          *,
          inscricoes_edital!inner(candidato_id),
          credenciado_crms(
            id,
            crm,
            uf_crm,
            especialidade,
            especialidade_id
          ),
          credenciado_categorias(
            id,
            principal,
            categorias_estabelecimentos(
              id,
              nome,
              codigo,
              descricao
            )
          )
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
