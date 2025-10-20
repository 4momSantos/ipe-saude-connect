-- Remover trigger antiga se existir
DROP TRIGGER IF EXISTS trigger_sync_approved_inscricao_to_credenciado ON public.inscricoes_edital;

-- Criar função trigger simplificada e robusta (sem pg_net)
CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dados jsonb;
  v_credenciado_id uuid;
  v_cpf text;
  v_nome text;
  v_email text;
  v_telefone text;
  v_tipo_credenciamento text;
  v_especialidades_ids text[];
  v_crm_numero text;
  v_crm_uf text;
  v_cnpj text;
  v_denominacao_social text;
  v_cep text;
  v_logradouro text;
  v_numero text;
  v_complemento text;
  v_bairro text;
  v_cidade text;
  v_estado text;
BEGIN
  -- Só processa se status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    BEGIN
      v_dados := NEW.dados_inscricao;
      
      -- Validação robusta dos dados
      IF v_dados IS NULL THEN
        RAISE WARNING '[CREDENCIADO_SYNC] Inscrição % aprovada mas dados_inscricao é NULL', NEW.id;
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, tipo_manifestacao, visivel_para, metadata
        ) VALUES (
          NEW.id, 'sistema',
          '⚠️ **ERRO**: Dados de inscrição ausentes. Não foi possível criar credenciado automaticamente.',
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', 'dados_inscricao is NULL')
        );
        
        RETURN NEW;
      END IF;
      
      IF v_dados->'dadosPessoais' IS NULL AND v_dados->'dadosPJ' IS NULL THEN
        RAISE WARNING '[CREDENCIADO_SYNC] Inscrição % sem dadosPessoais ou dadosPJ', NEW.id;
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, tipo_manifestacao, visivel_para, metadata
        ) VALUES (
          NEW.id, 'sistema',
          '⚠️ **ERRO**: Dados pessoais/PJ ausentes. Verifique o cadastro da inscrição.',
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', 'missing dadosPessoais and dadosPJ')
        );
        
        RETURN NEW;
      END IF;
      
      -- Verificar se já existe credenciado
      SELECT id INTO v_credenciado_id
      FROM public.credenciados
      WHERE inscricao_id = NEW.id;
      
      IF v_credenciado_id IS NOT NULL THEN
        RAISE NOTICE '[CREDENCIADO_SYNC] Credenciado já existe: %', v_credenciado_id;
        RETURN NEW;
      END IF;
      
      -- Determinar tipo de credenciamento
      v_tipo_credenciamento := COALESCE(v_dados->>'tipoCredenciamento', 'PF');
      
      -- Extrair dados conforme tipo
      IF v_tipo_credenciamento = 'PJ' THEN
        v_cnpj := v_dados->'dadosPJ'->>'cnpj';
        v_denominacao_social := v_dados->'dadosPJ'->>'denominacaoSocial';
        v_nome := COALESCE(v_denominacao_social, v_dados->'dadosPessoais'->>'nomeCompleto');
        v_cpf := v_dados->'dadosPessoais'->>'cpf';
        v_email := COALESCE(v_dados->'dadosPJ'->>'email', v_dados->'dadosPessoais'->>'email');
        v_telefone := COALESCE(v_dados->'dadosPJ'->>'telefone', v_dados->'dadosPessoais'->>'telefone');
      ELSE
        v_cpf := v_dados->'dadosPessoais'->>'cpf';
        v_nome := v_dados->'dadosPessoais'->>'nomeCompleto';
        v_email := v_dados->'dadosPessoais'->>'email';
        v_telefone := v_dados->'dadosPessoais'->>'telefone';
      END IF;
      
      -- Extrair CRM (se PF)
      IF v_tipo_credenciamento = 'PF' THEN
        v_crm_numero := v_dados->'dadosProfissionais'->>'numeroRegistro';
        v_crm_uf := v_dados->'dadosProfissionais'->>'ufRegistro';
        
        IF v_dados->'dadosProfissionais'->'especialidades' IS NOT NULL THEN
          SELECT ARRAY_AGG(value::text)
          INTO v_especialidades_ids
          FROM jsonb_array_elements_text(v_dados->'dadosProfissionais'->'especialidades');
        END IF;
      END IF;
      
      -- Extrair endereço
      v_cep := v_dados->'endereco'->>'cep';
      v_logradouro := v_dados->'endereco'->>'logradouro';
      v_numero := v_dados->'endereco'->>'numero';
      v_complemento := v_dados->'endereco'->>'complemento';
      v_bairro := v_dados->'endereco'->>'bairro';
      v_cidade := v_dados->'endereco'->>'cidade';
      v_estado := v_dados->'endereco'->>'estado';
      
      -- Validar dados mínimos
      IF v_nome IS NULL OR v_cpf IS NULL THEN
        RAISE WARNING '[CREDENCIADO_SYNC] Dados mínimos ausentes (nome ou CPF)';
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, tipo_manifestacao, visivel_para, metadata
        ) VALUES (
          NEW.id, 'sistema',
          '⚠️ **ERRO**: Nome ou CPF ausente. Não foi possível criar credenciado.',
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', 'missing nome or cpf')
        );
        
        RETURN NEW;
      END IF;
      
      -- Criar credenciado
      INSERT INTO public.credenciados (
        inscricao_id,
        cpf,
        nome,
        email,
        telefone,
        cnpj,
        denominacao_social,
        cep,
        endereco,
        numero_endereco,
        complemento,
        bairro,
        cidade,
        estado,
        tipo_credenciamento,
        status,
        data_credenciamento,
        especialidades_ids
      )
      VALUES (
        NEW.id,
        v_cpf,
        v_nome,
        v_email,
        v_telefone,
        v_cnpj,
        v_denominacao_social,
        v_cep,
        v_logradouro,
        v_numero,
        v_complemento,
        v_bairro,
        v_cidade,
        v_estado,
        v_tipo_credenciamento,
        'Ativo',
        NOW(),
        v_especialidades_ids
      )
      RETURNING id INTO v_credenciado_id;
      
      RAISE NOTICE '[CREDENCIADO_SYNC] ✅ Credenciado % criado para inscrição %', v_credenciado_id, NEW.id;
      
      -- Processar CRMs (se PF)
      IF v_tipo_credenciamento = 'PF' AND v_crm_numero IS NOT NULL THEN
        INSERT INTO public.credenciado_crms (
          credenciado_id,
          numero_crm,
          uf_crm,
          tipo_inscricao,
          situacao,
          is_principal
        )
        VALUES (
          v_credenciado_id,
          v_crm_numero,
          v_crm_uf,
          'Principal',
          'Ativo',
          true
        )
        ON CONFLICT (credenciado_id, numero_crm, uf_crm) DO NOTHING;
      END IF;
      
      -- Criar histórico
      INSERT INTO public.credenciado_historico (
        credenciado_id,
        tipo_evento,
        descricao,
        dados_evento,
        usuario_id
      )
      VALUES (
        v_credenciado_id,
        'criacao',
        'Credenciado criado automaticamente após aprovação de inscrição',
        jsonb_build_object(
          'inscricao_id', NEW.id,
          'origem', 'aprovacao_automatica',
          'tipo_credenciamento', v_tipo_credenciamento
        ),
        NEW.analisado_por
      );
      
      -- Criar mensagem informando que documentos devem ser migrados
      INSERT INTO public.workflow_messages (
        inscricao_id, sender_type, content, tipo_manifestacao, visivel_para, metadata
      ) VALUES (
        NEW.id, 'sistema',
        '✅ Credenciado criado com sucesso. Os documentos serão migrados automaticamente em breve.',
        'info', ARRAY['analista', 'gestor'],
        jsonb_build_object('credenciado_id', v_credenciado_id, 'action', 'pending_document_migration')
      );
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[CREDENCIADO_SYNC] ❌ Erro ao criar credenciado: % - %', SQLERRM, SQLSTATE;
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, tipo_manifestacao, visivel_para, metadata
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
$$;

-- Recriar trigger usando a função corrigida
CREATE TRIGGER trigger_sync_approved_inscricao_to_credenciado
  AFTER INSERT OR UPDATE ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_approved_inscricao_to_credenciado();

COMMENT ON FUNCTION public.sync_approved_inscricao_to_credenciado() IS 
'Trigger function que cria automaticamente um credenciado quando uma inscrição é aprovada. Inclui validação robusta e tratamento de erros. A migração de documentos deve ser feita via edge function corrigir-credenciados-sem-documentos.';