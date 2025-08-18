import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

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
      
      // For the default admin user, check if password is plaintext (for initial setup)
      let isValidPassword = false;
      
      if (userData.username === 'administrador' && password === '12345678') {
        // For the default admin, allow direct password comparison or bcrypt
        try {
          isValidPassword = await bcrypt.compare(password, userData.pass_hash);
        } catch (bcryptError) {
          console.log('bcrypt failed, trying direct comparison');
          // If bcrypt fails, try direct comparison for initial setup
          isValidPassword = userData.pass_hash === password;
        }
      } else {
        // For other users, use bcrypt
        isValidPassword = await bcrypt.compare(password, userData.pass_hash);
      }

      console.log('Password validation result:', isValidPassword);

      if (!isValidPassword) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Store user in localStorage
      localStorage.setItem('paganos_user', JSON.stringify(userData));

      setAuthState({
        user: userData,
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