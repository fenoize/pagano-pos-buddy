import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { setStaffContext, clearDBContext } from '@/lib/dbContext';

// Map old database role names to new app role names
const mapDatabaseRoleToApp = (dbRole: string): AppRole => {
  const mapping: Record<string, AppRole> = {
    'Caja': 'Cajero',
    'Cocina': 'Cocinero',
    'Reparto': 'Reparto'
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
      const storedUser = localStorage.getItem(STORAGE_KEYS.STAFF_USER);
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      
      if (storedUser && token) {
        try {
          const user = JSON.parse(storedUser);
          
          // Validar que el token sigue activo
          const { data: tokenData, error: tokenError } = await supabase
            .rpc('validate_staff_token', { _token: token });
          
          if (tokenError || !tokenData || tokenData.length === 0 || !tokenData[0].is_valid) {
            clearStaffStorage();
            setAuthState({
              user: null,
              loading: false,
              error: null,
            });
            return;
          }
          
          // Validate that the user still exists in the database
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id, active')
            .eq('id', user.id)
            .eq('active', true)
            .maybeSingle();
          
          if (error || !dbUser) {
            clearStaffStorage();
            setAuthState({
              user: null,
              loading: false,
              error: null,
            });
          } else {
            // Re-establecer contexto DB después de validar usuario almacenado
            try {
              await setStaffContext(user.id);
            } catch (contextError) {
              // Silent fail - context will be re-established on operations that need it
            }
            
            setAuthState({
              user,
              loading: false,
              error: null,
            });
          }
        } catch (error) {
          clearStaffStorage();
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
      // 1. Autenticar usuario
      const { data: userData, error: userError } = await supabase
        .rpc('authenticate_user', {
          _username: username,
          _password: password
        });

      if (userError) {
        throw new Error('Error al consultar la base de datos');
      }

      if (!userData || userData.length === 0) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      const userRecord = userData[0];

      // 2. Crear sesión de staff
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('create_staff_session', {
          _user_id: userRecord.user_id
        });

      if (sessionError || !sessionData || sessionData.length === 0) {
        throw new Error('Error al crear sesión');
      }

      const { token, expires_at } = sessionData[0];

      // 3. Guardar usuario y token en localStorage
      const mappedUser = {
        id: userRecord.user_id,
        username: userRecord.username,
        full_name: userRecord.full_name,
        email: userRecord.email,
        role: mapDatabaseRoleToApp(userRecord.role),
        active: userRecord.active
      } as User;
      
      localStorage.setItem(STORAGE_KEYS.STAFF_USER, JSON.stringify(mappedUser));
      localStorage.setItem(STORAGE_KEYS.STAFF_TOKEN, token);

      // 4. Establecer contexto DB (opcional, para otras operaciones)
      try {
        await setStaffContext(mappedUser.id);
      } catch (contextError) {
        // Silent fail - context will be re-established on operations that need it
      }

      setAuthState({
        user: mappedUser,
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
      // 1. Invalidar token en backend
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (token) {
        await supabase.rpc('invalidate_staff_session', { _token: token });
      }
      
      // 2. Limpiar contexto DB y localStorage
      await clearDBContext();
      clearStaffStorage();
      
      setAuthState({
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      // Forzar limpieza local incluso si falla backend
      clearStaffStorage();
      setAuthState({
        user: null,
        loading: false,
        error: null,
      });
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