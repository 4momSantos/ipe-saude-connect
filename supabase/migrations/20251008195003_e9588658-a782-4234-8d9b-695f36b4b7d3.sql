-- Corrigir search_path das funções de trigger
CREATE OR REPLACE FUNCTION public.generate_webhook_url(p_workflow_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_webhook_id TEXT;
  v_webhook_url TEXT;
BEGIN
  -- Gerar ID único
  v_webhook_id := encode(gen_random_bytes(16), 'hex');
  
  -- Inserir webhook config
  INSERT INTO public.workflow_webhooks (workflow_id, webhook_id, created_by)
  VALUES (p_workflow_id, v_webhook_id, auth.uid());
  
  -- Construir URL (assumindo ambiente Supabase)
  v_webhook_url := current_setting('app.supabase_url', true) || 
                   '/functions/v1/webhook-trigger/' || 
                   p_workflow_id::text || '/' || 
                   v_webhook_id;
  
  RETURN v_webhook_url;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_api_key(p_workflow_id uuid DEFAULT NULL::uuid, p_name text DEFAULT 'API Key'::text, p_description text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_api_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
BEGIN
  -- Gerar API key aleatória (32 bytes = 64 hex chars)
  v_api_key := 'wf_' || encode(gen_random_bytes(32), 'hex');
  
  -- Hash com SHA-256
  v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
  
  -- Primeiros 8 chars como prefix
  v_key_prefix := substring(v_api_key from 1 for 11); -- wf_ + 8 chars
  
  -- Inserir na tabela
  INSERT INTO public.workflow_api_keys (workflow_id, key_hash, key_prefix, name, description, created_by)
  VALUES (p_workflow_id, v_key_hash, v_key_prefix, p_name, p_description, auth.uid());
  
  -- Retornar key (só mostramos uma vez!)
  RETURN v_api_key;
END;
$function$;