import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Detectar se o ambiente está bloqueando Supabase
const isSupabaseBlocked = async (): Promise<boolean> => {
  try {
    const testUrl = import.meta.env.VITE_SUPABASE_URL;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    await fetch(`${testUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return false;
  } catch (error) {
    console.warn('[PROXY_CLIENT] Supabase direto bloqueado, usando proxy');
    return true;
  }
};

// Criar cliente com proxy fallback
const createProxyClient = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  // URL do proxy (função edge)
  const PROXY_URL = `${window.location.origin}/functions/v1/proxy-api`;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Configuração Supabase não encontrada');
  }

  // Verificar se deve usar proxy
  let useProxy = false;
  
  isSupabaseBlocked().then(blocked => {
    useProxy = blocked;
    if (useProxy) {
      console.info('[PROXY_CLIENT] ✅ Modo proxy ativado');
    }
  });

  // Cliente com proxy condicional
  return createClient<Database>(
    useProxy ? PROXY_URL : SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: useProxy ? {
          'X-Proxy-Mode': 'true',
        } : {},
      },
    }
  );
};

export const supabaseProxy = createProxyClient();
