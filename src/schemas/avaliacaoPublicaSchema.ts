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
    .nullable(),
  
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
    .min(10, 'Comentário deve ter pelo menos 10 caracteres')
    .max(500, 'Comentário não pode exceder 500 caracteres')
    .optional()
    .nullable(),
  
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
    .nullable(),
  
  avaliador_nome: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .optional()
    .nullable(),
  
  avaliador_email: z
    .string()
    .email('Email inválido')
    .optional()
    .nullable(),
  
  avaliador_anonimo: z.boolean().default(false),
  
  comprovante_url: z
    .string()
    .url('URL do comprovante inválida')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.profissional_id) {
      return !!data.nota_profissional;
    }
    return true;
  },
  {
    message: 'Ao selecionar um profissional, a avaliação dele é obrigatória',
    path: ['nota_profissional'],
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
