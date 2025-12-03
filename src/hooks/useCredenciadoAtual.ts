import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useCredenciadoAtual() {
  const { user } = useAuth(); // ✅ Usar contexto

  return useQuery({
    queryKey: ['credenciado-atual', user?.id],
    queryFn: async () => {
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
    enabled: !!user, // ✅ Só executar se user existir
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}
