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
      
      // Find user by username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('active', true)
        .maybeSingle();

      console.log('User query result:', { userData, userError });

      if (userError) {
        console.error('Database error:', userError);
        throw new Error('Error al consultar la base de datos');
      }

      if (!userData) {
        console.log('User not found');
        throw new Error('Usuario o contraseña incorrectos');
      }

      console.log('User found, verifying password...');
      
      // Check if password is hashed or plain text
      let isValidPassword = false;
      
      // First, try direct comparison (for plain text passwords)
      if (userData.pass_hash === password) {
        isValidPassword = true;
      } else {
        // If direct comparison fails, try bcrypt (for hashed passwords)
        try {
          isValidPassword = await bcrypt.compare(password, userData.pass_hash);
        } catch (bcryptError) {
          console.log('bcrypt comparison failed, password might be plain text');
          isValidPassword = false;
        }
      }

      console.log('Password validation result:', isValidPassword);

      if (!isValidPassword) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Map database role to app role and store user in localStorage
      const mappedUser = {
        ...userData,
        role: mapDatabaseRoleToApp(userData.role)
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