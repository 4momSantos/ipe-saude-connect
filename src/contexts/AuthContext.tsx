import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'candidato' | 'analista' | 'gestor' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (checkRoles: UserRole[]) => boolean;
  isAdmin: boolean;
  isGestor: boolean;
  isAnalista: boolean;
  isCandidato: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch roles for a user - deferred to avoid deadlock
  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return (data?.map(r => r.role as UserRole) || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  };

  useEffect(() => {
    let mounted = true;
    let rolesFetched = false; // Flag para evitar busca dupla

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Só buscar roles se ainda não foram buscadas neste ciclo
        if (newSession?.user && !rolesFetched) {
          rolesFetched = true;
          setTimeout(async () => {
            if (!mounted) return;
            const userRoles = await fetchRoles(newSession.user.id);
            if (mounted) {
              setRoles(userRoles);
              setLoading(false);
            }
          }, 0);
        } else if (!newSession) {
          rolesFetched = false;
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // getSession só atualiza estado, roles serão buscadas pelo onAuthStateChange
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      // Se não houver sessão, finalizar loading
      if (!existingSession) {
        setLoading(false);
      }
      // Roles serão buscadas pelo onAuthStateChange que será disparado
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: UserRole) => roles.includes(role);
  
  const hasAnyRole = (checkRoles: UserRole[]) => 
    checkRoles.some(role => roles.includes(role));

  const isAdmin = hasRole('admin');
  const isGestor = hasRole('gestor') || isAdmin;
  const isAnalista = hasRole('analista') || isAdmin;
  const isCandidato = hasRole('candidato');

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  const value: AuthContextType = {
    user,
    session,
    roles,
    loading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isGestor,
    isAnalista,
    isCandidato,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
