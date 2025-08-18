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
    // Check if user is already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get user data from our custom users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        setAuthState({
          user: userData,
          loading: false,
          error: null,
        });
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Error de autenticación',
      });
    }
  };

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Find user by username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('active', true)
        .single();

      if (userError || !userData) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, userData.pass_hash);
      if (!isValidPassword) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Create a Supabase auth session using the user ID
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${username}@paganos.local`, // Use a dummy email format
        password: userData.id, // Use user ID as password for Supabase auth
      });

      if (signInError) {
        // If user doesn't exist in auth.users, create them
        const { error: signUpError } = await supabase.auth.signUp({
          email: `${username}@paganos.local`,
          password: userData.id,
          options: {
            data: {
              username: userData.username,
              role: userData.role,
            }
          }
        });

        if (signUpError) throw signUpError;

        // Sign in after creating
        await supabase.auth.signInWithPassword({
          email: `${username}@paganos.local`,
          password: userData.id,
        });
      }

      setAuthState({
        user: userData,
        loading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
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
      await supabase.auth.signOut();
      setAuthState({
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
}