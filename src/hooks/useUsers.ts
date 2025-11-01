import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';
import { usePermissions } from './usePermissions';

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
    'Viewer': 'Viewer'
  };
  return mapping[appRole] || appRole;
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Usar hook de permisos centralizado
  const { canManageUsers } = usePermissions();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Optimización: Solo select campos necesarios
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, email, role, active, can_do_delivery, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map old role names to new ones
      const mappedUsers = (data || []).map(user => ({
        ...user,
        role: mapDatabaseRoleToApp(user.role)
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
    try {
      // First create the user with a temporary password
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
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
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (userId: string, userData: {
    username?: string;
    full_name?: string;
    email?: string;
    role?: AppRole;
    can_do_delivery?: boolean;
  }) => {
    try {
      const updateData: any = {};
      if (userData.username) updateData.username = userData.username;
      if (userData.full_name !== undefined) updateData.full_name = userData.full_name;
      if (userData.email !== undefined) updateData.email = userData.email;
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
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const toggleUserStatus = async (userId: string, active: boolean) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ active })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  };

  const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    try {
      // Use the database function to set password
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
    } catch (error) {
      console.error('Error in updateUserPassword:', error);
      throw error;
    }
  };

  const resetPassword = async (userId: string): Promise<string> => {
    try {
      // Generate a random password
      const newPassword = Math.random().toString(36).slice(-8);
      
      // Use the database function to set password
      const { data, error } = await supabase.rpc('set_user_password', {
        user_uuid: userId,
        new_password: newPassword
      });

      if (error) throw error;
      if (!data) throw new Error('No se pudo resetear la contraseña. Usuario no encontrado.');
      
      return newPassword;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
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