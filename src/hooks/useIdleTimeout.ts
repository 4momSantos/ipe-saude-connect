// FASE 7.3: Hook - Timeout de Sessão por Inatividade
import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useIdleTimeout(timeoutMinutes: number = 30) {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/login');
    toast.info('Sessão encerrada por inatividade');
  }, [navigate]);

  const resetTimer = useCallback(() => {
    setShowWarning(false);

    // Limpar timers existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Warning: 5 minutos antes do timeout
    const warningTime = Math.max((timeoutMinutes - 5) * 60 * 1000, 0);
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
      }, warningTime);
    }

    // Timeout principal
    const timeoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutTime);
  }, [timeoutMinutes, logout]);

  useEffect(() => {
    // Eventos que resetam o timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Iniciar timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [resetTimer]);

  return {
    showWarning,
    continueSession: resetTimer,
    logout
  };
}
