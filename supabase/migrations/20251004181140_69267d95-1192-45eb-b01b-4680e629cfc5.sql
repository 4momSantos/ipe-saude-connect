-- Adicionar campo inscricao_id à tabela credenciados
ALTER TABLE public.credenciados 
ADD COLUMN IF NOT EXISTS inscricao_id UUID REFERENCES public.inscricoes_edital(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_credenciados_inscricao_id ON public.credenciados(inscricao_id);

-- Função para sincronizar inscrição aprovada para credenciado
CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dados jsonb;
  v_credenciado_id uuid;
  v_crm_record jsonb;
  v_horario_record jsonb;
  v_credenciado_crm_id uuid;
BEGIN
  -- Só processa se status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    v_dados := NEW.dados_inscricao;
    
    -- Verificar se já existe credenciado para esta inscrição
    SELECT id INTO v_credenciado_id
    FROM public.credenciados
    WHERE inscricao_id = NEW.id;
    
    -- Se não existe, criar novo credenciado
    IF v_credenciado_id IS NULL THEN
      INSERT INTO public.credenciados (
        inscricao_id,
        nome,
        cpf,
        cnpj,
        rg,
        data_nascimento,
        email,
        telefone,
        celular,
        endereco,
        cidade,
        estado,
        cep,
        porte,
        status,
        observacoes
      )
      VALUES (
        NEW.id,
        COALESCE(v_dados->'pessoaJuridica'->>'razaoSocial', v_dados->'dadosPessoais'->>'nome'),
        v_dados->'dadosPessoais'->>'cpf',
        v_dados->'pessoaJuridica'->>'cnpj',
        v_dados->'dadosPessoais'->>'rg',
        (v_dados->'dadosPessoais'->>'dataNascimento')::date,
        v_dados->'dadosPessoais'->>'email',
        v_dados->'dadosPessoais'->>'telefone',
        v_dados->'dadosPessoais'->>'celular',
        v_dados->'endereco'->>'logradouro' || ', ' || COALESCE(v_dados->'endereco'->>'numero', 'S/N'),
        v_dados->'endereco'->>'cidade',
        v_dados->'endereco'->>'estado',
        v_dados->'endereco'->>'cep',
        v_dados->'pessoaJuridica'->>'porte',
        'Ativo',
        'Credenciado automaticamente via workflow de inscrição'
      )
      RETURNING id INTO v_credenciado_id;
      
      -- Processar CRMs e especialidades
      IF v_dados->'consultorio'->'crms' IS NOT NULL THEN
        FOR v_crm_record IN SELECT * FROM jsonb_array_elements(v_dados->'consultorio'->'crms')
        LOOP
          INSERT INTO public.credenciado_crms (
            credenciado_id,
            crm,
            uf_crm,
            especialidade
          )
          VALUES (
            v_credenciado_id,
            v_crm_record->>'crm',
            v_crm_record->>'uf',
            v_crm_record->>'especialidade'
          )
          RETURNING id INTO v_credenciado_crm_id;
          
          -- Processar horários de atendimento para este CRM
          IF v_crm_record->'horarios' IS NOT NULL THEN
            FOR v_horario_record IN SELECT * FROM jsonb_array_elements(v_crm_record->'horarios')
            LOOP
              INSERT INTO public.horarios_atendimento (
                credenciado_crm_id,
                dia_semana,
                horario_inicio,
                horario_fim
              )
              VALUES (
                v_credenciado_crm_id,
                v_horario_record->>'diaSemana',
                (v_horario_record->>'horarioInicio')::time,
                (v_horario_record->>'horarioFim')::time
              );
            END LOOP;
          END IF;
        END LOOP;
      END IF;
      
      -- Criar registro no histórico
      INSERT INTO public.credenciado_historico (
        credenciado_id,
        tipo,
        descricao,
        usuario_responsavel
      )
      VALUES (
        v_credenciado_id,
        'credenciamento',
        'Credenciamento realizado após aprovação da inscrição no edital',
        (SELECT email FROM auth.users WHERE id = NEW.analisado_por)
      );
      
      RAISE NOTICE 'Credenciado % criado automaticamente a partir da inscrição %', v_credenciado_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_approved_to_credenciado ON public.inscricoes_edital;

CREATE TRIGGER trigger_sync_approved_to_credenciado
AFTER INSERT OR UPDATE ON public.inscricoes_edital
FOR EACH ROW
EXECUTE FUNCTION public.sync_approved_inscricao_to_credenciado();

-- Migrar dados históricos de inscrições já aprovadas
DO $$
DECLARE
  v_inscricao RECORD;
BEGIN
  FOR v_inscricao IN 
    SELECT * FROM public.inscricoes_edital 
    WHERE status = 'aprovado' 
    AND id NOT IN (SELECT inscricao_id FROM public.credenciados WHERE inscricao_id IS NOT NULL)
  LOOP
    -- Trigger vai processar automaticamente
    UPDATE public.inscricoes_edital 
    SET updated_at = NOW() 
    WHERE id = v_inscricao.id;
  END LOOP;
END;
$$;