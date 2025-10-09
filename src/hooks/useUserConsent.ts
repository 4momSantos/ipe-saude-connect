/**
 * useUserConsent - Hook para gerenciar consentimento LGPD
 * 
 * Verifica se usuário tem consentimento válido e permite registrar novo consentimento
 * com captura automática de IP e User-Agent para rastreabilidade.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserConsentHook {
  hasConsent: boolean;
  isLoading: boolean;
  giveConsent: () => Promise<void>;
  checkConsent: () => Promise<void>;
}

export function useUserConsent(): UserConsentHook {
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  /**
   * Verifica se usuário tem consentimento válido
   */
  const checkConsent = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[USER_CONSENT] Usuário não autenticado');
        setHasConsent(false);
        setIsLoading(false);
        return;
      }

      console.log('[USER_CONSENT] Verificando consentimento para user_id:', user.id);

      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .eq('consent_type', 'terms_and_privacy')
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[USER_CONSENT] Erro ao buscar consentimento:', error);
        setHasConsent(false);
        return;
      }

      if (data) {
        console.log('[USER_CONSENT] ✅ Consentimento encontrado:', {
          id: data.id,
          version: data.consent_version,
          accepted_at: data.accepted_at
        });
        setHasConsent(true);
      } else {
        console.log('[USER_CONSENT] ⚠️ Nenhum consentimento encontrado');
        setHasConsent(false);
      }

    } catch (error) {
      console.error('[USER_CONSENT] Erro inesperado:', error);
      setHasConsent(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registra consentimento do usuário
   */
  const giveConsent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[USER_CONSENT] Registrando consentimento para user_id:', user.id);

      // Capturar IP do usuário (via serviço externo)
      let ipAddress = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
        console.log('[USER_CONSENT] IP capturado:', ipAddress);
      } catch (ipError) {
        console.warn('[USER_CONSENT] Não foi possível capturar IP:', ipError);
      }

      // Capturar User-Agent
      const userAgent = navigator.userAgent;

      // Inserir consentimento no banco
      const { error } = await supabase
        .from('user_consents')
        .insert({
          user_id: user.id,
          consent_type: 'terms_and_privacy',
          consent_version: '1.0',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: {
            timestamp: new Date().toISOString(),
            browser: navigator.platform,
            language: navigator.language
          }
        });

      if (error) {
        console.error('[USER_CONSENT] Erro ao salvar consentimento:', error);
        throw error;
      }

      console.log('[USER_CONSENT] ✅ Consentimento salvo com sucesso');

      // Registrar em audit_logs
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'consent_given',
        resource_type: 'user_consent',
        metadata: {
          consent_type: 'terms_and_privacy',
          consent_version: '1.0',
          ip_address: ipAddress
        }
      });

      setHasConsent(true);

      toast({
        title: 'Consentimento registrado',
        description: 'Seus termos foram aceitos com sucesso.',
      });

    } catch (error: any) {
      console.error('[USER_CONSENT] Erro fatal ao dar consentimento:', error);
      
      toast({
        title: 'Erro ao registrar consentimento',
        description: error.message || 'Por favor, tente novamente.',
        variant: 'destructive'
      });

      throw error;
    }
  };

  // Verificar consentimento ao montar componente
  useEffect(() => {
    checkConsent();
  }, []);

  return {
    hasConsent,
    isLoading,
    giveConsent,
    checkConsent
  };
}
