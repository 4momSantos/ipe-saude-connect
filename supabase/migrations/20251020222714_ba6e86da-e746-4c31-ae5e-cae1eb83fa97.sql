-- Corrigir função sync_approved_inscricao_to_credenciado para usar nomes corretos de colunas
-- Substitui tipo_manifestacao por tipo e metadata por manifestacao_metadata

CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credenciado_id UUID;
  v_dados JSONB;
  v_nome TEXT;
  v_cpf TEXT;
  v_email TEXT;
  v_telefone TEXT;
  v_crm TEXT;
  v_crm_uf TEXT;
  v_cep TEXT;
  v_endereco TEXT;
  v_numero TEXT;
  v_complemento TEXT;
  v_bairro TEXT;
  v_cidade TEXT;
  v_estado TEXT;
  v_tipo_pessoa TEXT;
  v_cnpj TEXT;
  v_razao_social TEXT;
  v_nome_fantasia TEXT;
  v_especialidade_ids UUID[];
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    BEGIN
      v_dados := NEW.dados_inscricao;
      
      -- Validação 1: Dados NULL
      IF v_dados IS NULL THEN
        RAISE WARNING '[CREDENCIADO_SYNC] Inscrição % aprovada mas dados_inscricao é NULL', NEW.id;
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, 
          tipo, 
          visivel_para, 
          manifestacao_metadata
        ) VALUES (
          NEW.id, 'sistema',
          '⚠️ **ERRO**: Dados de inscrição ausentes. Não foi possível criar credenciado automaticamente.',
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', 'dados_inscricao is NULL')
        );
        
        RETURN NEW;
      END IF;
      
      -- Validação 2: Sem dadosPessoais ou dadosPJ
      IF v_dados->'dadosPessoais' IS NULL AND v_dados->'dadosPJ' IS NULL THEN
        RAISE WARNING '[CREDENCIADO_SYNC] Inscrição % sem dadosPessoais ou dadosPJ', NEW.id;
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, 
          tipo, 
          visivel_para, 
          manifestacao_metadata
        ) VALUES (
          NEW.id, 'sistema',
          '⚠️ **ERRO**: Dados pessoais/PJ ausentes. Verifique o cadastro da inscrição.',
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', 'missing dadosPessoais and dadosPJ')
        );
        
        RETURN NEW;
      END IF;
      
      -- Extrair dados baseado no tipo
      IF v_dados->'dadosPessoais' IS NOT NULL THEN
        v_tipo_pessoa := 'PF';
        v_nome := v_dados->'dadosPessoais'->>'nomeCompleto';
        v_cpf := v_dados->'dadosPessoais'->>'cpf';
        v_email := v_dados->'dadosPessoais'->>'email';
        v_telefone := v_dados->'dadosPessoais'->>'telefone';
        v_crm := v_dados->'dadosProfissionais'->>'numeroCRM';
        v_crm_uf := v_dados->'dadosProfissionais'->>'ufCRM';
        
        IF v_dados->'especialidades' IS NOT NULL THEN
          SELECT ARRAY_AGG(elem::UUID)
          INTO v_especialidade_ids
          FROM jsonb_array_elements_text(v_dados->'especialidades') elem
          WHERE elem ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        END IF;
      ELSE
        v_tipo_pessoa := 'PJ';
        v_razao_social := v_dados->'dadosPJ'->>'razaoSocial';
        v_nome_fantasia := v_dados->'dadosPJ'->>'nomeFantasia';
        v_cnpj := v_dados->'dadosPJ'->>'cnpj';
        v_email := v_dados->'dadosPJ'->>'email';
        v_telefone := v_dados->'dadosPJ'->>'telefone';
        v_nome := COALESCE(v_nome_fantasia, v_razao_social);
        v_cpf := v_cnpj;
      END IF;
      
      IF v_dados->'endereco' IS NOT NULL THEN
        v_cep := v_dados->'endereco'->>'cep';
        v_endereco := v_dados->'endereco'->>'logradouro';
        v_numero := v_dados->'endereco'->>'numero';
        v_complemento := v_dados->'endereco'->>'complemento';
        v_bairro := v_dados->'endereco'->>'bairro';
        v_cidade := v_dados->'endereco'->>'cidade';
        v_estado := v_dados->'endereco'->>'estado';
      END IF;
      
      -- Validação 3: Dados mínimos
      IF v_nome IS NULL OR v_cpf IS NULL THEN
        RAISE WARNING '[CREDENCIADO_SYNC] Dados mínimos ausentes (nome ou CPF)';
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, 
          tipo, 
          visivel_para, 
          manifestacao_metadata
        ) VALUES (
          NEW.id, 'sistema',
          '⚠️ **ERRO**: Nome ou CPF ausente. Não foi possível criar credenciado.',
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', 'missing nome or cpf')
        );
        
        RETURN NEW;
      END IF;
      
      -- Verificar se credenciado já existe
      SELECT id INTO v_credenciado_id
      FROM public.credenciados
      WHERE inscricao_id = NEW.id;
      
      IF v_credenciado_id IS NOT NULL THEN
        RAISE NOTICE '[CREDENCIADO_SYNC] Credenciado % já existe para inscrição %', v_credenciado_id, NEW.id;
        
        UPDATE public.credenciados
        SET
          nome = v_nome,
          cpf = v_cpf,
          email = v_email,
          telefone = v_telefone,
          crm = v_crm,
          crm_uf = v_crm_uf,
          cep = v_cep,
          endereco = v_endereco,
          numero = v_numero,
          complemento = v_complemento,
          bairro = v_bairro,
          cidade = v_cidade,
          estado = v_estado,
          tipo_pessoa = v_tipo_pessoa,
          cnpj = v_cnpj,
          razao_social = v_razao_social,
          nome_fantasia = v_nome_fantasia,
          especialidade_ids = v_especialidade_ids,
          status = 'Ativo',
          updated_at = NOW()
        WHERE id = v_credenciado_id;
        
        RETURN NEW;
      END IF;
      
      -- Criar credenciado
      INSERT INTO public.credenciados (
        inscricao_id,
        nome,
        cpf,
        email,
        telefone,
        crm,
        crm_uf,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        tipo_pessoa,
        cnpj,
        razao_social,
        nome_fantasia,
        especialidade_ids,
        status,
        data_credenciamento
      ) VALUES (
        NEW.id,
        v_nome,
        v_cpf,
        v_email,
        v_telefone,
        v_crm,
        v_crm_uf,
        v_cep,
        v_endereco,
        v_numero,
        v_complemento,
        v_bairro,
        v_cidade,
        v_estado,
        v_tipo_pessoa,
        v_cnpj,
        v_razao_social,
        v_nome_fantasia,
        v_especialidade_ids,
        'Ativo',
        NOW()
      )
      RETURNING id INTO v_credenciado_id;
      
      RAISE NOTICE '[CREDENCIADO_SYNC] ✅ Credenciado % criado para inscrição %', v_credenciado_id, NEW.id;
      
      -- Mensagem de sucesso
      INSERT INTO public.workflow_messages (
        inscricao_id, sender_type, content, 
        tipo, 
        visivel_para, 
        manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '✅ Credenciado criado com sucesso. Os documentos serão migrados automaticamente em breve.',
        'info', ARRAY['analista', 'gestor'],
        jsonb_build_object('credenciado_id', v_credenciado_id, 'action', 'pending_document_migration')
      );
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[CREDENCIADO_SYNC] ❌ Erro ao criar credenciado: % - %', SQLERRM, SQLSTATE;
        
        -- Exception handler
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, 
          tipo, 
          visivel_para, 
          manifestacao_metadata
        ) VALUES (
          NEW.id, 'sistema',
          format('⚠️ **ERRO CRÍTICO**: Falha ao criar credenciado automaticamente. Erro técnico: %s', SQLERRM),
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE, 'timestamp', NOW())
        );
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;