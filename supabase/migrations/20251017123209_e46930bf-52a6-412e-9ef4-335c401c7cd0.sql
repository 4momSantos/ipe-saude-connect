-- Migration: Trigger para copiar consultórios ao aprovar inscrição

CREATE OR REPLACE FUNCTION public.copiar_consultorios_ao_aprovar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credenciado_id UUID;
  v_consultorio RECORD;
  v_count INTEGER;
BEGIN
  -- Só executa se status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    RAISE NOTICE '[COPIAR_CONSULTORIOS] Inscrição % aprovada', NEW.id;
    
    -- Buscar o credenciado criado
    SELECT id INTO v_credenciado_id
    FROM public.credenciados
    WHERE inscricao_id = NEW.id;

    IF v_credenciado_id IS NULL THEN
      RAISE WARNING '[COPIAR_CONSULTORIOS] Credenciado não encontrado para inscrição %', NEW.id;
      RETURN NEW;
    END IF;

    -- Contar consultórios cadastrados
    SELECT COUNT(*) INTO v_count
    FROM public.inscricao_consultorios
    WHERE inscricao_id = NEW.id AND ativo = true;

    RAISE NOTICE '[COPIAR_CONSULTORIOS] % consultórios encontrados', v_count;

    -- Copiar consultórios da inscrição para o credenciado
    FOR v_consultorio IN 
      SELECT * FROM public.inscricao_consultorios
      WHERE inscricao_id = NEW.id AND ativo = true
    LOOP
      INSERT INTO public.credenciado_consultorios (
        credenciado_id,
        inscricao_consultorio_id,
        nome_consultorio,
        cnes,
        telefone,
        ramal,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        responsavel_tecnico_nome,
        responsavel_tecnico_crm,
        responsavel_tecnico_uf,
        especialidades_ids,
        horarios,
        is_principal,
        ativo
      ) VALUES (
        v_credenciado_id,
        v_consultorio.id,
        v_consultorio.nome_consultorio,
        v_consultorio.cnes,
        v_consultorio.telefone,
        v_consultorio.ramal,
        v_consultorio.cep,
        v_consultorio.logradouro,
        v_consultorio.numero,
        v_consultorio.complemento,
        v_consultorio.bairro,
        v_consultorio.cidade,
        v_consultorio.estado,
        v_consultorio.responsavel_tecnico_nome,
        v_consultorio.responsavel_tecnico_crm,
        v_consultorio.responsavel_tecnico_uf,
        v_consultorio.especialidades_ids,
        v_consultorio.horarios,
        v_consultorio.is_principal,
        v_consultorio.ativo
      )
      ON CONFLICT (credenciado_id, cnes) DO NOTHING;
      
      RAISE NOTICE '[COPIAR_CONSULTORIOS] Consultório % copiado (CNES: %)', 
        v_consultorio.nome_consultorio, v_consultorio.cnes;
    END LOOP;

    RAISE NOTICE '[COPIAR_CONSULTORIOS] ✅ % consultórios copiados para credenciado %', 
      v_count, v_credenciado_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_copiar_consultorios_ao_aprovar ON public.inscricoes_edital;

CREATE TRIGGER trigger_copiar_consultorios_ao_aprovar
  AFTER UPDATE ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.copiar_consultorios_ao_aprovar();

COMMENT ON FUNCTION public.copiar_consultorios_ao_aprovar() IS 
'Copia consultórios da inscrição para o credenciado ao aprovar';