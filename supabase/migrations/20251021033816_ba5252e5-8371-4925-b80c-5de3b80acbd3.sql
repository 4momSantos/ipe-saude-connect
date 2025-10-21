-- Garantir que a tabela tem REPLICA IDENTITY FULL para realtime completo
ALTER TABLE public.inscricao_eventos REPLICA IDENTITY FULL;