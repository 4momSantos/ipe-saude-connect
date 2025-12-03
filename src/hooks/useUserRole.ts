import { useAuth } from '@/contexts/AuthContext';

export type { UserRole } from '@/contexts/AuthContext';

// Hook que agora consome do AuthContext centralizado
// Não faz mais chamadas próprias - usa o cache do contexto
export function useUserRole() {
  const { roles, loading, hasRole, hasAnyRole, isAdmin, isGestor, isAnalista, isCandidato } = useAuth();

  return {
    roles,
    loading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isGestor,
    isAnalista,
    isCandidato,
  };
}
