import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'candidato' | 'analista' | 'gestor' | 'admin';

export function useUserRole() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserRoles() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRoles([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        setRoles(data?.map(r => r.role as UserRole) || []);
      } catch (error) {
        console.error('Error loading user roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    }

    loadUserRoles();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRoles();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: UserRole) => roles.includes(role);
  
  const hasAnyRole = (checkRoles: UserRole[]) => 
    checkRoles.some(role => roles.includes(role));

  const isAdmin = hasRole('admin');
  const isGestor = hasRole('gestor') || isAdmin;
  const isAnalista = hasRole('analista') || isAdmin;
  const isCandidato = hasRole('candidato');

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
