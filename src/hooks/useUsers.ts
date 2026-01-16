import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';
import { usePermissions } from './usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { withStaffContext } from '@/lib/dbContext';

// Map old database role names to new app role names
const mapDatabaseRoleToApp = (dbRole: string): AppRole => {
  const mapping: Record<string, AppRole> = {
    'Caja': 'Cajero',
    'Cocina': 'Cocinero',
    'Reparto': 'Reparto'
  };
  return mapping[dbRole] as AppRole || dbRole as AppRole;
};

// Map new app role names to database role names
const mapAppRoleToDatabase = (appRole: AppRole): string => {
  const mapping: Record<AppRole, string> = {
    'Cajero': 'Caja',
    'Cocinero': 'Cocina',
    'Reparto': 'Reparto',
    'Administrador': 'Administrador',
    // No existe "Preparador" en el enum de la BD; lo mapeamos a Cocina por compatibilidad
    'Preparador': 'Cocina',
    'Viewer': 'Viewer',
    'TV': 'TV'
  };
  return mapping[appRole] || appRole;
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  // Usar hook de permisos centralizado
  const { canManageUsers } = usePermissions();

  const requireAdminContext = async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (!canManageUsers) {
      throw new Error('No tienes permisos para gestionar usuarios');
    }
    if (!user?.id) {
      throw new Error('No hay sesión de usuario activa');
    }
    return withStaffContext(user.id, operation);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setUsers([]);
        return;
      }

      // Setear contexto para que RLS permita el SELECT
      const result = await withStaffContext(user.id, async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, full_name, email, role, active, can_do_delivery, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      });

      const mappedUsers = result.map(u => ({
        ...u,
        role: mapDatabaseRoleToApp((u as any).role)
      })) as User[];

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    role: AppRole;
    can_do_delivery?: boolean;
  }) => {
    return requireAdminContext(async () => {
      const username = userData.username.trim();
      const full_name = userData.full_name.trim();
      const email = userData.email.trim();

      // First create the user with a temporary password
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          username,
          full_name: full_name || null,
          email: email || null,
          pass_hash: 'temp', // Temporary value
          role: mapAppRoleToDatabase(userData.role) as any,
          active: true,
          can_do_delivery: userData.can_do_delivery ?? (userData.role === 'Reparto')
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Now set the proper password using the database function
      const { error: passwordError } = await supabase.rpc('set_user_password', {
        user_uuid: data.id,
        new_password: userData.password
      });

      if (passwordError) {
        // If password setting failed, clean up the user
        await supabase.from('users').delete().eq('id', data.id);
        throw passwordError;
      }

      return data;
    });
  };

  const updateUser = async (userId: string, userData: {
    username?: string;
    full_name?: string;
    email?: string;
    role?: AppRole;
    can_do_delivery?: boolean;
  }) => {
    return requireAdminContext(async () => {
      const updateData: any = {};

      if (userData.username !== undefined) {
        const v = userData.username.trim();
        if (v) updateData.username = v;
      }
      if (userData.full_name !== undefined) {
        const v = userData.full_name.trim();
        updateData.full_name = v ? v : null;
      }
      if (userData.email !== undefined) {
        const v = userData.email.trim();
        updateData.email = v ? v : null;
      }
      if (userData.role) updateData.role = mapAppRoleToDatabase(userData.role);
      if (userData.can_do_delivery !== undefined) updateData.can_do_delivery = userData.can_do_delivery;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  };

  const deleteUser = async (userId: string) => {
    return requireAdminContext(async () => {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
    });
  };

  const toggleUserStatus = async (userId: string, active: boolean) => {
    return requireAdminContext(async () => {
      const { data, error } = await supabase
        .from('users')
        .update({ active })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  };

  const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    return requireAdminContext(async () => {
      const { data, error } = await supabase.rpc('set_user_password', {
        user_uuid: userId,
        new_password: newPassword
      });

      if (error) {
        console.error('Error updating password:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No se pudo actualizar la contraseña. Usuario no encontrado.');
      }
    });
  };

  const resetPassword = async (userId: string): Promise<string> => {
    return requireAdminContext(async () => {
      const newPassword = Math.random().toString(36).slice(-8);

      const { data, error } = await supabase.rpc('set_user_password', {
        user_uuid: userId,
        new_password: newPassword
      });

      if (error) throw error;
      if (!data) throw new Error('No se pudo resetear la contraseña. Usuario no encontrado.');

      return newPassword;
    });
  };

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetPassword,
    updateUserPassword
  };
}