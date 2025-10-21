-- Habilitar realtime para a tabela inscricao_eventos
ALTER PUBLICATION supabase_realtime ADD TABLE public.inscricao_eventos;

-- Garantir que a tabela tem REPLICA IDENTITY FULL para realtime completo
ALTER TABLE public.inscricao_eventos REPLICA IDENTITY FULL;
