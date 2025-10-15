import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DecisaoRegistrada } from "@/types/decisao";

export function useHistoricoDecisoes(inscricaoId: string) {
  return useQuery({
    queryKey: ['historico-decisoes', inscricaoId],
    queryFn: async () => {
      // Buscar análises da inscrição
      const { data: analises, error } = await supabase
        .from('analises')
        .select(`
          id,
          inscricao_id,
          analista_id,
          status,
          parecer,
          motivo_reprovacao,
          analisado_em,
          profiles:analista_id(nome, email)
        `)
        .eq('inscricao_id', inscricaoId)
        .not('analisado_em', 'is', null)
        .order('analisado_em', { ascending: false });

      if (error) throw error;

      // Transformar em DecisaoRegistrada
      const decisoes: DecisaoRegistrada[] = (analises || []).map(analise => {
        const status = analise.status === 'aprovada' ? 'aprovado' :
                       analise.status === 'rejeitada' ? 'reprovado' :
                       'pendente_correcao';
        
        return {
          id: analise.id,
          inscricao_id: analise.inscricao_id,
          analista_id: analise.analista_id,
          analista_nome: (analise.profiles as any)?.nome || (analise.profiles as any)?.email || 'Sistema',
          decisao: {
            status,
            justificativa: analise.parecer || analise.motivo_reprovacao || 'Sem justificativa registrada'
          },
          created_at: analise.analisado_em || new Date().toISOString()
        };
      });

      return decisoes;
    },
    enabled: !!inscricaoId
  });
}
