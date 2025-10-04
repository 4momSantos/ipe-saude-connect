-- Atualizar usuários de teste existentes para corrigir campos NULL problemáticos

UPDATE auth.users
SET 
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = '',
  email_change_confirm_status = 0,
  phone_change = '',
  phone_change_token = '',
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  updated_at = now()
WHERE email IN ('candidato@teste.com', 'analista@teste.com', 'gestor@teste.com');