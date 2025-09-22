import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';

// Map old database role names to new app role names
const mapDatabaseRoleToApp = (dbRole: string): AppRole => {
  const mapping: Record<string, AppRole> = {
    'Caja': 'Cajero',
    'Cocina': 'Cocinero',
    'Reparto': 'Repartidor'
  };
  return mapping[dbRole] as AppRole || dbRole as AppRole;
};

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const validateStoredUser = async () => {
      const storedUser = localStorage.getItem('paganos_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          
          // Validate that the user still exists in the database
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id, active')
            .eq('id', user.id)
            .eq('active', true)
            .maybeSingle();
          
          if (error || !dbUser) {
            console.log('Stored user no longer valid, clearing localStorage');
            localStorage.removeItem('paganos_user');
            setAuthState({
              user: null,
              loading: false,
              error: null,
            });
          } else {
            setAuthState({
              user,
              loading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error('Error validating stored user:', error);
          localStorage.removeItem('paganos_user');
          setAuthState({
            user: null,
            loading: false,
            error: null,
          });
        }
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null,
        });
      }
    };

    validateStoredUser();
  }, []);

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('Attempting login for username:', username);
      
      // Use the secure authentication function
      const { data: userData, error: userError } = await supabase
        .rpc('authenticate_user', {
          _username: username,
          _password: password
        });

      console.log('Authentication result:', { userData, userError });

      if (userError) {
        console.error('Authentication error:', userError);
        throw new Error('Error al consultar la base de datos');
      }

      if (!userData || userData.length === 0) {
        console.log('Authentication failed - user not found or invalid credentials');
        throw new Error('Usuario o contraseña incorrectos');
      }

      const userRecord = userData[0];
      console.log('Authentication successful for user:', userRecord.username);

      // Generate JWT after successful authentication
      console.log('Generating JWT for user:', userRecord.user_id);
      const { data: jwtToken, error: jwtError } = await supabase
        .rpc('issue_app_jwt' as any, { p_user_id: userRecord.user_id });

      if (jwtError) {
        console.error('JWT generation error:', jwtError);
        throw new Error('Error generando token de sesión');
      }

      console.log('JWT generated successfully');

      // Map database role to app role and store user in localStorage
      const mappedUser = {
        id: userRecord.user_id,
        username: userRecord.username,
        full_name: userRecord.full_name,
        email: userRecord.email,
        role: mapDatabaseRoleToApp(userRecord.role),
        active: userRecord.active
      } as User;
      
      localStorage.setItem('paganos_user', JSON.stringify(mappedUser));
      localStorage.setItem('paganos_jwt', String(jwtToken));

      // Configure Supabase client headers for future requests
      if (jwtToken) {
        // Set authorization header for future requests
        const token = String(jwtToken);
        supabase.functions.setAuth(token);
      }

      setAuthState({
        user: mappedUser,
        loading: false,
        error: null,
      });

      console.log('Login successful with JWT');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Error de autenticación';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('paganos_user');
      localStorage.removeItem('paganos_jwt');
      setAuthState({
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const checkAuth = async () => {
    // This is now handled in useEffect
  };

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
}