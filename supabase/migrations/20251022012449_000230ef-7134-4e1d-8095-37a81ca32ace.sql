-- Habilitar realtime para tabela credenciados
ALTER TABLE credenciados REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE credenciados;

-- Habilitar realtime para tabela documentos_credenciados  
ALTER TABLE documentos_credenciados REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE documentos_credenciados;