-- FASE 1: Estrutura de Banco de Dados

-- Tabela de templates de documentos
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento text NOT NULL CHECK (tipo_documento IN (
    'contrato',
    'distrato', 
    'aditivo',
    'termo_suspensao',
    'termo_reativacao',
    'termo_renovacao',
    'certificado'
  )),
  nome text NOT NULL,
  descricao text,
  template_html text NOT NULL,
  ativo boolean DEFAULT true,
  versao int DEFAULT 1,
  requer_assinatura boolean DEFAULT true,
  dias_validade int,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_tipo ON document_templates(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_document_templates_ativo ON document_templates(ativo);

-- Tabela de documentos gerados
CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id uuid REFERENCES credenciados(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  template_id uuid REFERENCES document_templates(id),
  status_anterior text,
  status_novo text,
  trigger_event text,
  motivo text,
  documento_html text,
  documento_pdf_url text,
  documento_pdf_path text,
  requer_assinatura boolean DEFAULT false,
  assinado boolean DEFAULT false,
  assinado_em timestamptz,
  signature_request_id uuid REFERENCES signature_requests(id),
  valido_de date,
  valido_ate date,
  generated_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_docs_credenciado ON generated_documents(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_tipo ON generated_documents(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_generated_docs_status ON generated_documents(status_novo);
CREATE INDEX IF NOT EXISTS idx_generated_docs_assinado ON generated_documents(assinado);

-- RLS Policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores gerenciam templates" ON document_templates;
CREATE POLICY "Gestores gerenciam templates" ON document_templates
  FOR ALL USING (
    has_role(auth.uid(), 'gestor') OR 
    has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Credenciados veem seus documentos" ON generated_documents;
CREATE POLICY "Credenciados veem seus documentos" ON generated_documents
  FOR SELECT USING (
    credenciado_id IN (
      SELECT c.id FROM credenciados c
      JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
      WHERE ie.candidato_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Gestores veem todos documentos" ON generated_documents;
CREATE POLICY "Gestores veem todos documentos" ON generated_documents
  FOR ALL USING (
    has_role(auth.uid(), 'gestor') OR 
    has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Sistema cria documentos" ON generated_documents;
CREATE POLICY "Sistema cria documentos" ON generated_documents
  FOR INSERT WITH CHECK (true);

-- Função para determinar tipo de documento
CREATE OR REPLACE FUNCTION get_document_type_for_status_change(
  old_status text,
  new_status text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF new_status = 'Ativo' AND old_status IN ('Pendente', 'Aprovado') THEN
    RETURN NULL;
  END IF;
  
  IF new_status = 'Suspenso' THEN
    RETURN 'termo_suspensao';
  END IF;
  
  IF new_status = 'Ativo' AND old_status = 'Suspenso' THEN
    RETURN 'termo_reativacao';
  END IF;
  
  IF new_status IN ('Descredenciado', 'Inativo') THEN
    RETURN 'distrato';
  END IF;
  
  IF new_status = 'Afastado' THEN
    RETURN 'termo_afastamento';
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger para gerar documentos automaticamente
CREATE OR REPLACE FUNCTION trigger_generate_document_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tipo_doc text;
  template_record record;
  requer_assinatura_flag boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    tipo_doc := get_document_type_for_status_change(OLD.status, NEW.status);
    
    IF tipo_doc IS NULL THEN
      RETURN NEW;
    END IF;
    
    RAISE NOTICE '[DOC_AUTO] Status mudou: % → %. Documento: %', 
      OLD.status, NEW.status, tipo_doc;
    
    SELECT * INTO template_record
    FROM document_templates
    WHERE tipo_documento = tipo_doc
      AND ativo = true
    ORDER BY versao DESC
    LIMIT 1;
    
    IF template_record.id IS NULL THEN
      RAISE WARNING '[DOC_AUTO] Template não encontrado para tipo: %', tipo_doc;
      RETURN NEW;
    END IF;
    
    requer_assinatura_flag := template_record.requer_assinatura;
    
    INSERT INTO generated_documents (
      credenciado_id,
      tipo_documento,
      template_id,
      status_anterior,
      status_novo,
      trigger_event,
      motivo,
      requer_assinatura,
      valido_de,
      valido_ate,
      metadata
    ) VALUES (
      NEW.id,
      tipo_doc,
      template_record.id,
      OLD.status,
      NEW.status,
      'status_change',
      COALESCE(NEW.motivo_suspensao, NEW.motivo_descredenciamento, NEW.observacoes),
      requer_assinatura_flag,
      CURRENT_DATE,
      CASE 
        WHEN template_record.dias_validade IS NOT NULL 
        THEN CURRENT_DATE + (template_record.dias_validade || ' days')::interval
        ELSE NULL
      END,
      jsonb_build_object(
        'triggered_by', 'status_change_trigger',
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW(),
        'template_id', template_record.id,
        'template_nome', template_record.nome,
        'auto_generated', true
      )
    );
    
    RAISE NOTICE '[DOC_AUTO] ✅ Documento % criado para credenciado %', 
      tipo_doc, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_documents ON credenciados;
CREATE TRIGGER trigger_auto_generate_documents
  AFTER UPDATE ON credenciados
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_document_on_status_change();

-- FASE 2: Templates Iniciais

-- Template: Distrato
INSERT INTO document_templates (tipo_documento, nome, descricao, template_html, requer_assinatura, dias_validade)
VALUES (
  'distrato',
  'Distrato de Credenciamento - Padrão',
  'Template padrão para rescisão de contrato de credenciamento',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Distrato</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
    h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .dados { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3498db; }
  </style>
</head>
<body>
  <h1>TERMO DE DISTRATO</h1>
  <p>Pelo presente instrumento, as partes resolvem rescindir o Contrato de Credenciamento.</p>
  <div class="dados">
    <p><strong>CREDENCIADO:</strong> {{credenciado_nome}}</p>
    <p><strong>CPF/CNPJ:</strong> {{credenciado_documento}}</p>
    <p><strong>Número:</strong> {{numero_credenciado}}</p>
  </div>
  <p><strong>Motivo:</strong> {{motivo_rescisao}}</p>
  <p><strong>Data:</strong> {{data_atual}}</p>
</body>
</html>',
  true,
  NULL
)
ON CONFLICT DO NOTHING;

-- Template: Termo de Suspensão
INSERT INTO document_templates (tipo_documento, nome, descricao, template_html, requer_assinatura, dias_validade)
VALUES (
  'termo_suspensao',
  'Termo de Suspensão - Padrão',
  'Template padrão para suspensão temporária',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Suspensão</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
    h1 { color: #e74c3c; text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; }
    .dados { margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <h1>⚠️ TERMO DE SUSPENSÃO</h1>
  <p>Fica SUSPENSA a participação de:</p>
  <div class="dados">
    <p><strong>CREDENCIADO:</strong> {{credenciado_nome}}</p>
    <p><strong>CPF/CNPJ:</strong> {{credenciado_documento}}</p>
    <p><strong>Número:</strong> {{numero_credenciado}}</p>
  </div>
  <p><strong>Motivo:</strong> {{motivo_suspensao}}</p>
  <p><strong>Período:</strong> {{data_suspensao_inicio}} até {{data_suspensao_fim}}</p>
</body>
</html>',
  false,
  180
)
ON CONFLICT DO NOTHING;

-- Template: Termo de Reativação
INSERT INTO document_templates (tipo_documento, nome, descricao, template_html, requer_assinatura, dias_validade)
VALUES (
  'termo_reativacao',
  'Termo de Reativação - Padrão',
  'Template padrão para reativação após suspensão',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Reativação</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
    h1 { color: #28a745; text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 10px; }
    .dados { margin: 20px 0; padding: 15px; background-color: #d4edda; border-left: 4px solid #28a745; }
  </style>
</head>
<body>
  <h1>✅ TERMO DE REATIVAÇÃO</h1>
  <p>Fica REATIVADO o credenciamento de:</p>
  <div class="dados">
    <p><strong>CREDENCIADO:</strong> {{credenciado_nome}}</p>
    <p><strong>CPF/CNPJ:</strong> {{credenciado_documento}}</p>
    <p><strong>Número:</strong> {{numero_credenciado}}</p>
  </div>
  <p><strong>Motivo da Reativação:</strong> {{motivo_reativacao}}</p>
  <p><strong>Data:</strong> {{data_atual}}</p>
</body>
</html>',
  false,
  NULL
)
ON CONFLICT DO NOTHING;