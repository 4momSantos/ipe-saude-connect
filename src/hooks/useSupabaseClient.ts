import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseProxy } from '@/integrations/supabase/proxy-client';

/**
 * Hook que detecta automaticamente se deve usar proxy
 * para contornar bloqueios do navegador
 */
export function useSupabaseClient() {
  const [client, setClient] = useState(supabase);
  const [isProxyMode, setIsProxyMode] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Tentar conexão direta
        const { error } = await supabase.from('profiles').select('count').limit(0);
        
        if (error && error.message.includes('Failed to fetch')) {
          console.warn('[CLIENT] Conexão direta falhou, ativando proxy');
          setClient(supabaseProxy);
          setIsProxyMode(true);
        }
      } catch (err) {
        console.warn('[CLIENT] Erro na conexão, ativando proxy:', err);
        setClient(supabaseProxy);
        setIsProxyMode(true);
      }
    };

    checkConnection();
  }, []);

  return { client, isProxyMode };
}
