-- Corrigir trigger aplicar_alteracao_aprovada para lidar com dados_propostos como string ou JSON
-- e aceitar status case-insensitive

CREATE OR REPLACE FUNCTION aplicar_alteracao_aprovada()
RETURNS TRIGGER AS $$
DECLARE
  v_dados JSONB;
  v_dados_text TEXT;
BEGIN
  -- Aceitar tanto "Aprovado" quanto "Aprovada" (case-insensitive)
  IF NEW.status ILIKE 'aprovad%' AND (OLD.status IS NULL OR OLD.status NOT ILIKE 'aprovad%') THEN
    
    -- Converter dados_propostos para JSONB, mesmo se vier como string
    IF jsonb_typeof(NEW.dados_propostos) = 'string' THEN
      -- Se for string, criar um objeto JSON genérico para compatibilidade
      v_dados_text := NEW.dados_propostos #>> '{}';
      v_dados := NEW.dados_propostos;
    ELSE
      v_dados := NEW.dados_propostos;
      v_dados_text := NULL;
    END IF;
    
    -- Aplicar alterações baseado no tipo
    IF NEW.tipo_alteracao ILIKE '%endereço%' OR NEW.tipo_alteracao ILIKE '%endereco%' THEN
      UPDATE public.credenciados 
      SET 
        endereco = COALESCE(
          CASE 
            WHEN v_dados_text IS NOT NULL THEN v_dados_text
            ELSE v_dados->>'endereco'
          END,
          endereco
        ),
        cidade = COALESCE(v_dados->>'cidade', cidade),
        estado = COALESCE(v_dados->>'estado', estado),
        cep = COALESCE(v_dados->>'cep', cep),
        updated_at = NOW()
      WHERE id = NEW.credenciado_id;
      
    ELSIF NEW.tipo_alteracao ILIKE '%telefone%' OR NEW.tipo_alteracao ILIKE '%contato%' THEN
      UPDATE public.credenciados 
      SET 
        telefone = COALESCE(
          CASE 
            WHEN v_dados_text IS NOT NULL THEN v_dados_text
            WHEN v_dados ? 'telefone' THEN v_dados->>'telefone'
            WHEN v_dados ? 'celular' THEN v_dados->>'celular'
            ELSE NULL
          END,
          telefone
        ),
        celular = COALESCE(v_dados->>'celular', celular),
        email = COALESCE(v_dados->>'email', email),
        updated_at = NOW()
      WHERE id = NEW.credenciado_id;
      
    ELSIF NEW.tipo_alteracao ILIKE '%email%' THEN
      UPDATE public.credenciados 
      SET 
        email = COALESCE(
          CASE 
            WHEN v_dados_text IS NOT NULL THEN v_dados_text
            ELSE v_dados->>'email'
          END,
          email
        ),
        updated_at = NOW()
      WHERE id = NEW.credenciado_id;
      
    ELSIF NEW.tipo_alteracao ILIKE '%dados%' THEN
      UPDATE public.credenciados 
      SET 
        nome = COALESCE(v_dados->>'nome', nome),
        cpf = COALESCE(v_dados->>'cpf', cpf),
        cnpj = COALESCE(v_dados->>'cnpj', cnpj),
        updated_at = NOW()
      WHERE id = NEW.credenciado_id;
    END IF;
    
    -- Notificar credenciado
    INSERT INTO public.app_notifications (
      user_id,
      type,
      title,
      message,
      related_type,
      related_id
    )
    SELECT 
      ie.candidato_id,
      'success',
      'Solicitação Aprovada',
      'Sua solicitação de alteração foi aprovada e os dados foram atualizados.',
      'solicitacao',
      NEW.id
    FROM public.credenciados c
    JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = NEW.credenciado_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;