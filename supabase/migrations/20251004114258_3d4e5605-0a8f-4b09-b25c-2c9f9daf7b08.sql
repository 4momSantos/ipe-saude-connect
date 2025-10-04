-- Adicionar coluna is_system para identificar templates padrão do sistema
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Inserir Template 1: Dados Pessoais e Validação de Documentos
INSERT INTO public.form_templates (name, description, category, fields, is_active, is_system, tags)
VALUES (
  'Dados Pessoais e Validação de Documentos',
  'Template completo para coleta de dados pessoais com validação automática de CPF e CRM via APIs oficiais',
  'Padrão',
  '[
    {
      "id": "cpf",
      "type": "cpf",
      "label": "CPF",
      "placeholder": "000.000.000-00",
      "required": true,
      "size": "half",
      "helpText": "Será validado automaticamente na Receita Federal",
      "apiConfig": {
        "validateOnBlur": true,
        "autoFillFields": ["nome_completo", "nit"]
      }
    },
    {
      "id": "data_nascimento",
      "type": "date",
      "label": "Data de Nascimento",
      "required": true,
      "size": "half",
      "validation": {
        "required": true
      }
    },
    {
      "id": "nome_completo",
      "type": "text",
      "label": "Nome Completo",
      "placeholder": "Nome será preenchido automaticamente",
      "required": true,
      "size": "full",
      "apiConfig": {
        "autoFilledFrom": "cpf"
      }
    },
    {
      "id": "rg",
      "type": "rg",
      "label": "RG",
      "placeholder": "00.000.000-0",
      "required": true,
      "size": "half"
    },
    {
      "id": "orgao_emissor",
      "type": "text",
      "label": "Órgão Emissor",
      "placeholder": "SSP/SP",
      "required": true,
      "size": "half"
    },
    {
      "id": "sexo",
      "type": "select",
      "label": "Sexo",
      "required": true,
      "size": "half",
      "options": [
        {"value": "M", "label": "Masculino"},
        {"value": "F", "label": "Feminino"}
      ]
    },
    {
      "id": "nit",
      "type": "nit",
      "label": "NIT/PIS/PASEP",
      "placeholder": "000.00000.00-0",
      "required": false,
      "size": "half",
      "helpText": "Preenchido automaticamente se disponível",
      "apiConfig": {
        "autoFilledFrom": "cpf"
      }
    },
    {
      "id": "crm",
      "type": "crm",
      "label": "CRM",
      "placeholder": "000000",
      "required": true,
      "size": "half",
      "helpText": "Será validado no Conselho Federal de Medicina",
      "apiConfig": {
        "validateOnBlur": true,
        "autoFillFields": ["especialidade_principal", "instituicao_graduacao", "ano_formatura"]
      }
    },
    {
      "id": "uf_crm",
      "type": "select",
      "label": "UF do CRM",
      "required": true,
      "size": "half",
      "options": [
        {"value": "AC", "label": "AC"}, {"value": "AL", "label": "AL"}, {"value": "AP", "label": "AP"},
        {"value": "AM", "label": "AM"}, {"value": "BA", "label": "BA"}, {"value": "CE", "label": "CE"},
        {"value": "DF", "label": "DF"}, {"value": "ES", "label": "ES"}, {"value": "GO", "label": "GO"},
        {"value": "MA", "label": "MA"}, {"value": "MT", "label": "MT"}, {"value": "MS", "label": "MS"},
        {"value": "MG", "label": "MG"}, {"value": "PA", "label": "PA"}, {"value": "PB", "label": "PB"},
        {"value": "PR", "label": "PR"}, {"value": "PE", "label": "PE"}, {"value": "PI", "label": "PI"},
        {"value": "RJ", "label": "RJ"}, {"value": "RN", "label": "RN"}, {"value": "RS", "label": "RS"},
        {"value": "RO", "label": "RO"}, {"value": "RR", "label": "RR"}, {"value": "SC", "label": "SC"},
        {"value": "SP", "label": "SP"}, {"value": "SE", "label": "SE"}, {"value": "TO", "label": "TO"}
      ]
    },
    {
      "id": "instituicao_graduacao",
      "type": "text",
      "label": "Instituição de Graduação",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "crm"
      }
    },
    {
      "id": "ano_formatura",
      "type": "number",
      "label": "Ano de Formatura",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "crm"
      }
    }
  ]'::jsonb,
  true,
  true,
  ARRAY['cpf', 'crm', 'api', 'validação', 'dados-pessoais']
);

-- Inserir Template 2: Dados de Pessoa Jurídica (CNPJ)
INSERT INTO public.form_templates (name, description, category, fields, is_active, is_system, tags)
VALUES (
  'Dados de Pessoa Jurídica (CNPJ)',
  'Formulário completo para pessoa jurídica com validação automática de CNPJ e preenchimento de dados cadastrais',
  'Padrão',
  '[
    {
      "id": "cnpj",
      "type": "cnpj",
      "label": "CNPJ",
      "placeholder": "00.000.000/0000-00",
      "required": true,
      "size": "full",
      "helpText": "Será validado automaticamente na Receita Federal",
      "apiConfig": {
        "validateOnBlur": true,
        "autoFillFields": ["razao_social", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "cep_pj", "telefone_pj", "email_pj"]
      }
    },
    {
      "id": "razao_social",
      "type": "text",
      "label": "Denominação Social",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "full",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "logradouro",
      "type": "text",
      "label": "Logradouro",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "numero",
      "type": "text",
      "label": "Número",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "complemento",
      "type": "text",
      "label": "Complemento",
      "placeholder": "Preenchido automaticamente",
      "required": false,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "bairro",
      "type": "text",
      "label": "Bairro",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "cidade",
      "type": "text",
      "label": "Cidade",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "uf",
      "type": "text",
      "label": "UF",
      "placeholder": "Preenchido automaticamente",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "cep_pj",
      "type": "cep",
      "label": "CEP",
      "placeholder": "00000-000",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "telefone_pj",
      "type": "phone",
      "label": "Telefone",
      "placeholder": "(00) 0000-0000",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "email_pj",
      "type": "email",
      "label": "Email",
      "placeholder": "empresa@exemplo.com",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "cnpj"
      }
    },
    {
      "id": "agencia",
      "type": "text",
      "label": "Agência Bancária",
      "placeholder": "0000",
      "required": true,
      "size": "half"
    },
    {
      "id": "conta",
      "type": "text",
      "label": "Conta Bancária",
      "placeholder": "00000-0",
      "required": true,
      "size": "half"
    },
    {
      "id": "simples_nacional",
      "type": "checkbox",
      "label": "Optante pelo Simples Nacional",
      "required": false,
      "size": "full"
    }
  ]'::jsonb,
  true,
  true,
  ARRAY['cnpj', 'empresa', 'api', 'pessoa-juridica']
);

-- Inserir Template 3: Endereços e Contatos (Consultório)
INSERT INTO public.form_templates (name, description, category, fields, is_active, is_system, tags)
VALUES (
  'Endereços e Contatos',
  'Formulário para coleta de endereços de correspondência e consultório com dados de contato',
  'Padrão',
  '[
    {
      "id": "endereco_correspondencia",
      "type": "text",
      "label": "Endereço de Correspondência",
      "placeholder": "Rua, Avenida, etc.",
      "required": true,
      "size": "full"
    },
    {
      "id": "telefone_correspondencia",
      "type": "phone",
      "label": "Telefone",
      "placeholder": "(00) 0000-0000",
      "required": false,
      "size": "third"
    },
    {
      "id": "celular_correspondencia",
      "type": "phone",
      "label": "Celular",
      "placeholder": "(00) 00000-0000",
      "required": true,
      "size": "third"
    },
    {
      "id": "email_correspondencia",
      "type": "email",
      "label": "Email",
      "placeholder": "seu@email.com",
      "required": true,
      "size": "third"
    },
    {
      "id": "endereco_consultorio",
      "type": "text",
      "label": "Endereço do Consultório",
      "placeholder": "Rua, Avenida, etc.",
      "required": true,
      "size": "full"
    },
    {
      "id": "telefone_consultorio",
      "type": "phone",
      "label": "Telefone do Consultório",
      "placeholder": "(00) 0000-0000",
      "required": true,
      "size": "half"
    },
    {
      "id": "ramal_consultorio",
      "type": "text",
      "label": "Ramal",
      "placeholder": "0000",
      "required": false,
      "size": "half"
    }
  ]'::jsonb,
  true,
  true,
  ARRAY['endereço', 'contato', 'consultório']
);

-- Inserir Template 4: Especialidades e Horários de Atendimento
INSERT INTO public.form_templates (name, description, category, fields, is_active, is_system, tags)
VALUES (
  'Especialidades e Horários de Atendimento',
  'Formulário para definição de especialidades médicas e horários de atendimento do consultório',
  'Padrão',
  '[
    {
      "id": "especialidade_principal",
      "type": "text",
      "label": "Especialidade Principal",
      "placeholder": "Preenchido automaticamente do CRM",
      "required": true,
      "size": "half",
      "apiConfig": {
        "autoFilledFrom": "crm"
      }
    },
    {
      "id": "especialidade_secundaria",
      "type": "text",
      "label": "Especialidade Secundária",
      "placeholder": "Opcional",
      "required": false,
      "size": "half"
    },
    {
      "id": "quantidade_minima_consultas",
      "type": "number",
      "label": "Quantidade Mínima de Consultas/Mês",
      "placeholder": "Ex: 80",
      "required": true,
      "size": "half",
      "validation": {
        "min": 1
      }
    },
    {
      "id": "hora_marcada",
      "type": "checkbox",
      "label": "Atendimento com Hora Marcada",
      "required": false,
      "size": "half"
    },
    {
      "id": "horarios",
      "type": "array",
      "label": "Horários de Atendimento",
      "required": true,
      "size": "full",
      "helpText": "Adicione os dias e horários de atendimento do consultório",
      "arrayFields": [
        {
          "id": "dia_semana",
          "type": "select",
          "label": "Dia da Semana",
          "required": true,
          "options": [
            {"value": "segunda", "label": "Segunda-feira"},
            {"value": "terca", "label": "Terça-feira"},
            {"value": "quarta", "label": "Quarta-feira"},
            {"value": "quinta", "label": "Quinta-feira"},
            {"value": "sexta", "label": "Sexta-feira"},
            {"value": "sabado", "label": "Sábado"},
            {"value": "domingo", "label": "Domingo"}
          ]
        },
        {
          "id": "horario_inicio",
          "type": "time",
          "label": "Horário de Início",
          "required": true
        },
        {
          "id": "horario_fim",
          "type": "time",
          "label": "Horário de Fim",
          "required": true
        }
      ]
    }
  ]'::jsonb,
  true,
  true,
  ARRAY['horários', 'especialidade', 'atendimento']
);

-- Inserir Template 5: Upload de Documentos com Validação OCR
INSERT INTO public.form_templates (name, description, category, fields, is_active, is_system, tags)
VALUES (
  'Upload de Documentos com Validação OCR',
  'Formulário para upload de documentos obrigatórios com validação automática via OCR',
  'Padrão',
  '[
    {
      "id": "doc_rg_cnh",
      "type": "file",
      "label": "RG ou CNH",
      "required": true,
      "size": "full",
      "helpText": "Envie cópia do RG ou CNH (frente e verso)",
      "validation": {
        "required": true,
        "maxSize": 5242880
      },
      "fileConfig": {
        "accept": "image/*,application/pdf",
        "maxSize": 5242880,
        "ocrValidation": true
      }
    },
    {
      "id": "doc_cpf",
      "type": "file",
      "label": "CPF",
      "required": true,
      "size": "full",
      "helpText": "Envie cópia do CPF",
      "validation": {
        "required": true,
        "maxSize": 5242880
      },
      "fileConfig": {
        "accept": "image/*,application/pdf",
        "maxSize": 5242880,
        "ocrValidation": true
      }
    },
    {
      "id": "doc_comprovante_residencia",
      "type": "file",
      "label": "Comprovante de Residência",
      "required": true,
      "size": "full",
      "helpText": "Conta de luz, água ou telefone (máximo 3 meses)",
      "validation": {
        "required": true,
        "maxSize": 5242880
      },
      "fileConfig": {
        "accept": "image/*,application/pdf",
        "maxSize": 5242880,
        "ocrValidation": true
      }
    },
    {
      "id": "doc_diploma",
      "type": "file",
      "label": "Diploma de Graduação",
      "required": true,
      "size": "full",
      "helpText": "Diploma de Medicina",
      "validation": {
        "required": true,
        "maxSize": 10485760
      },
      "fileConfig": {
        "accept": "image/*,application/pdf",
        "maxSize": 10485760,
        "ocrValidation": true
      }
    },
    {
      "id": "doc_crm",
      "type": "file",
      "label": "Certificado do CRM",
      "required": true,
      "size": "full",
      "helpText": "Certificado de inscrição no CRM",
      "validation": {
        "required": true,
        "maxSize": 5242880
      },
      "fileConfig": {
        "accept": "image/*,application/pdf",
        "maxSize": 5242880,
        "ocrValidation": true
      }
    },
    {
      "id": "doc_titulo_especialista",
      "type": "file",
      "label": "Título de Especialista",
      "required": false,
      "size": "full",
      "helpText": "Se aplicável",
      "validation": {
        "maxSize": 5242880
      },
      "fileConfig": {
        "accept": "image/*,application/pdf",
        "maxSize": 5242880,
        "ocrValidation": true
      }
    },
    {
      "id": "doc_comprovante_bancario",
      "type": "file",
      "label": "Comprovante Bancário",
      "required": true,
      "size": "full",
      "helpText": "Comprovante de dados bancários",
      "validation": {
        "required": true,
        "maxSize": 5242880
      },
      "fileConfig": {
        "accept": "image/*,application/pdf",
        "maxSize": 5242880,
        "ocrValidation": false
      }
    }
  ]'::jsonb,
  true,
  true,
  ARRAY['documentos', 'ocr', 'upload', 'validação']
);