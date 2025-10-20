-- Habilitar realtime para tabela horarios_atendimento
ALTER TABLE public.horarios_atendimento REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.horarios_atendimento;