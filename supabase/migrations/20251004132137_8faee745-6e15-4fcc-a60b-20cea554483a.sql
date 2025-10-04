-- Criar usuários de teste com os 3 papéis

-- IMPORTANTE: Esses usuários serão criados na tabela auth.users
-- As senhas serão definidas como "teste123" para facilitar os testes
-- Os emails seguem o padrão: [papel]@teste.com

-- Criar usuário Candidato
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Inserir na tabela auth.users (se ainda não existir)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  )
  SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'candidato@teste.com',
    crypt('teste123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"João Candidato"}'::jsonb,
    now(),
    now(),
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'candidato@teste.com'
  )
  RETURNING id INTO v_user_id;

  -- Buscar ID se já existir
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'candidato@teste.com';
  END IF;

  -- Criar perfil
  INSERT INTO public.profiles (id, email, nome)
  VALUES (v_user_id, 'candidato@teste.com', 'João Candidato')
  ON CONFLICT (id) DO UPDATE SET nome = 'João Candidato';

  -- Adicionar papel
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'candidato')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- Criar usuário Analista
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  )
  SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'analista@teste.com',
    crypt('teste123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Maria Analista"}'::jsonb,
    now(),
    now(),
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'analista@teste.com'
  )
  RETURNING id INTO v_user_id;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'analista@teste.com';
  END IF;

  INSERT INTO public.profiles (id, email, nome)
  VALUES (v_user_id, 'analista@teste.com', 'Maria Analista')
  ON CONFLICT (id) DO UPDATE SET nome = 'Maria Analista';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'analista')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- Criar usuário Gestor
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  )
  SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gestor@teste.com',
    crypt('teste123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Pedro Gestor"}'::jsonb,
    now(),
    now(),
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'gestor@teste.com'
  )
  RETURNING id INTO v_user_id;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'gestor@teste.com';
  END IF;

  INSERT INTO public.profiles (id, email, nome)
  VALUES (v_user_id, 'gestor@teste.com', 'Pedro Gestor')
  ON CONFLICT (id) DO UPDATE SET nome = 'Pedro Gestor';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'gestor')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;