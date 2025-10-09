-- Tabela para armazenar consentimentos LGPD
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_type ON public.user_consents(consent_type);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios consentimentos
CREATE POLICY "Usuários podem ver seus próprios consentimentos"
ON public.user_consents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Sistema pode inserir consentimentos
CREATE POLICY "Sistema pode inserir consentimentos"
ON public.user_consents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins podem ver todos consentimentos
CREATE POLICY "Admins podem ver todos consentimentos"
ON public.user_consents
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.user_consents IS 'Armazena consentimentos LGPD dos usuários com rastreabilidade completa';