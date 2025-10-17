import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseAutoRefreshContratosProps {
  contratos: any[];
  enabled?: boolean;
  interval?: number;
}

export function useAutoRefreshContratos({ 
  contratos, 
  enabled = true,
  interval = 15000 // 15 segundos
}: UseAutoRefreshContratosProps) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled) return;
    
    // Verificar se há contratos pendentes de assinatura
    const hasPendingContracts = contratos.some(
      c => c.status === 'pendente_assinatura'
    );
    
    if (!hasPendingContracts) {
      console.log('[AUTO_REFRESH] Nenhum contrato pendente. Auto-refresh desativado.');
      return;
    }
    
    console.log('[AUTO_REFRESH] Ativando polling a cada 15 segundos...');
    
    const intervalId = setInterval(() => {
      console.log('[AUTO_REFRESH] Atualizando status dos contratos...');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    }, interval);
    
    return () => {
      console.log('[AUTO_REFRESH] Limpando intervalo...');
      clearInterval(intervalId);
    };
  }, [contratos, enabled, interval, queryClient]);
}
