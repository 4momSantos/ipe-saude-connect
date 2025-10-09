import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseMapboxTokenResult {
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = 'mapbox_token';
const CACHE_EXPIRY_KEY = 'mapbox_token_expiry';
const CACHE_DURATION_MS = 3600000; // 1 hora

export function useMapboxToken(): UseMapboxTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        // Verificar cache local
        const cachedToken = localStorage.getItem(CACHE_KEY);
        const cachedExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

        if (cachedToken && cachedExpiry) {
          const expiryTime = parseInt(cachedExpiry, 10);
          if (Date.now() < expiryTime) {
            console.log('[MAPBOX_TOKEN] Usando token do cache');
            setToken(cachedToken);
            setIsLoading(false);
            return;
          }
        }

        // Buscar token da Edge Function
        console.log('[MAPBOX_TOKEN] Buscando token da Edge Function...');
        const { data, error: fnError } = await supabase.functions.invoke('get-mapbox-token');

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (!data?.token) {
          throw new Error('Token não retornado pela API');
        }

        // Salvar no cache
        const expiryTime = Date.now() + CACHE_DURATION_MS;
        localStorage.setItem(CACHE_KEY, data.token);
        localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());

        console.log('[MAPBOX_TOKEN] Token obtido e cacheado com sucesso');
        setToken(data.token);
        setError(null);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('[MAPBOX_TOKEN] Erro ao buscar token:', errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }

    fetchToken();
  }, []);

  return { token, isLoading, error };
}
