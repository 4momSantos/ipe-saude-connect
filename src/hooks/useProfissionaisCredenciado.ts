import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfissionalCredenciado {
  id: string;
  nome: string;
  cpf: string | null;
  crm: string;
  uf_crm: string;
  especialidade: string;
  email: string | null;
  telefone: string | null;
  principal: boolean;
}

export function useProfissionaisCredenciado(credenciadoId: string) {
  return useQuery({
    queryKey: ['profissionais-credenciado', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profissionais_credenciados')
        .select('id, nome, cpf, crm, uf_crm, especialidade, email, telefone, principal')
        .eq('credenciado_id', credenciadoId)
        .eq('ativo', true)
        .order('principal', { ascending: false })
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as ProfissionalCredenciado[];
    },
    enabled: !!credenciadoId,
  });
}
