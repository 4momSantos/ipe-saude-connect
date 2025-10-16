// Tipos temporários para avaliações até os tipos do Supabase serem regenerados

export interface AvaliacaoPublica {
  id: string;
  credenciado_id: string;
  avaliador_nome: string | null;
  avaliador_email: string | null;
  avaliador_anonimo: boolean;
  avaliador_verificado: boolean;
  nota_estrelas: number;
  comentario: string;
  data_atendimento: string | null;
  tipo_servico: string | null;
  comprovante_url: string | null;
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'reportada';
  moderacao_ia_score: number | null;
  moderacao_ia_motivo: string | null;
  moderador_id: string | null;
  moderado_em: string | null;
  resposta_profissional: string | null;
  respondido_em: string | null;
  respondido_por: string | null;
  denunciada: boolean;
  motivo_denuncia: string | null;
  denunciada_em: string | null;
  denunciada_por: string | null;
  created_at: string;
  updated_at: string;
  credenciados?: {
    nome: string;
  };
}

export interface EstatisticasCredenciado {
  id: string;
  credenciado_id: string;
  nota_media_publica: number | null;
  total_avaliacoes_publicas: number;
  distribuicao_notas: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  nota_media_interna: number | null;
  total_avaliacoes_internas: number;
  performance_score: number;
  taxa_satisfacao: number | null;
  tempo_medio_atendimento: number | null;
  indice_resolucao: number | null;
  ranking_especialidade: number | null;
  ranking_regiao: number | null;
  badges: string[];
  atualizado_em: string | null;
  created_at: string;
}
