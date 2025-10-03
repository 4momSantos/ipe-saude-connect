import { ReactNode } from 'react';
import { useUserRole, UserRole } from '@/hooks/useUserRole';

interface RoleGuardProps {
  children: ReactNode;
  requiredRoles: UserRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, requiredRoles, fallback = null }: RoleGuardProps) {
  const { hasAnyRole, loading } = useUserRole();

  if (loading) {
    return null;
  }

  if (!hasAnyRole(requiredRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
