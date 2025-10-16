import { z } from 'zod';

export const avaliacaoPublicaSchema = z.object({
  credenciado_id: z.string().uuid('ID do credenciado inválido'),
  
  // AVALIAÇÃO DO ESTABELECIMENTO
  nota_estrelas: z
    .number()
    .int('Nota deve ser um número inteiro')
    .min(1, 'Nota mínima é 1 estrela')
    .max(5, 'Nota máxima é 5 estrelas'),
  
  comentario: z
    .string()
    .trim()
    .min(10, 'Comentário deve ter pelo menos 10 caracteres')
    .max(500, 'Comentário não pode exceder 500 caracteres'),
  
  // AVALIAÇÃO DO PROFISSIONAL (opcional)
  profissional_id: z
    .string()
    .uuid('ID do profissional inválido')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  nota_profissional: z
    .number()
    .int('Nota deve ser um número inteiro')
    .min(1, 'Nota mínima é 1 estrela')
    .max(5, 'Nota máxima é 5 estrelas')
    .optional()
    .nullable(),
  
  comentario_profissional: z
    .string()
    .trim()
    .max(500, 'Comentário não pode exceder 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  data_atendimento: z
    .date()
    .max(new Date(), 'Data do atendimento não pode ser no futuro')
    .optional()
    .nullable(),
  
  tipo_servico: z
    .string()
    .trim()
    .max(100, 'Tipo de serviço muito longo')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  avaliador_nome: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal('')),
  
  avaliador_email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal('')),
  
  avaliador_anonimo: z.boolean().default(false),
  
  comprovante_url: z
    .string()
    .url('URL do comprovante inválida')
    .optional()
    .nullable()
    .or(z.literal('')),
})
.refine(
  (data) => {
    if (data.profissional_id && data.profissional_id !== '') {
      return !!data.nota_profissional;
    }
    return true;
  },
  {
    message: 'Ao selecionar um profissional, a avaliação dele é obrigatória',
    path: ['nota_profissional'],
  }
)
.refine(
  (data) => {
    if (data.profissional_id && data.profissional_id !== '' && data.comentario_profissional && data.comentario_profissional !== '') {
      return data.comentario_profissional.trim().length >= 10;
    }
    return true;
  },
  {
    message: 'Comentário do profissional deve ter pelo menos 10 caracteres',
    path: ['comentario_profissional'],
  }
)
.refine(
  (data) => {
    if (!data.avaliador_anonimo) {
      return data.avaliador_nome && data.avaliador_nome.trim().length >= 2;
    }
    return true;
  },
  {
    message: 'Nome é obrigatório para avaliações não anônimas (mínimo 2 caracteres)',
    path: ['avaliador_nome'],
  }
)
.refine(
  (data) => {
    if (!data.avaliador_anonimo) {
      return data.avaliador_email && z.string().email().safeParse(data.avaliador_email).success;
    }
    return true;
  },
  {
    message: 'Email válido é obrigatório para avaliações não anônimas',
    path: ['avaliador_email'],
  }
);

export type AvaliacaoPublicaForm = z.infer<typeof avaliacaoPublicaSchema>;

export const respostaAvaliacaoSchema = z.object({
  avaliacao_id: z.string().uuid('ID da avaliação inválido'),
  
  resposta: z
    .string()
    .trim()
    .min(10, 'Resposta deve ter pelo menos 10 caracteres')
    .max(500, 'Resposta não pode exceder 500 caracteres'),
});

export type RespostaAvaliacaoForm = z.infer<typeof respostaAvaliacaoSchema>;
