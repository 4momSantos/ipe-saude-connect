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

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Defer role fetching with setTimeout to avoid Supabase deadlock
        if (newSession?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            const userRoles = await fetchRoles(newSession.user.id);
            if (mounted) {
              setRoles(userRoles);
              setLoading(false);
            }
          }, 0);
        } else {
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        const userRoles = await fetchRoles(existingSession.user.id);
        if (mounted) {
          setRoles(userRoles);
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
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
