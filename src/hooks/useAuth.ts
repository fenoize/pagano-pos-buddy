import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';
import bcrypt from 'bcryptjs';

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
    // Check if user is already authenticated from localStorage
    const storedUser = localStorage.getItem('paganos_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
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

      setAuthState({
        user: mappedUser,
        loading: false,
        error: null,
      });

      console.log('Login successful');
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