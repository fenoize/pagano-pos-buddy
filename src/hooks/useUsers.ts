import { useState } from 'react';
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

// Map new app role names to database role names
const mapAppRoleToDatabase = (appRole: AppRole): string => {
  const mapping: Record<AppRole, string> = {
    'Cajero': 'Caja',
    'Cocinero': 'Cocina',
    'Repartidor': 'Reparto',
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
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
  }) => {
    try {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const { data, error } = await supabase
        .from('users')
        .insert({
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
          pass_hash: hashedPassword,
          role: mapAppRoleToDatabase(userData.role) as any,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
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
  }) => {
    try {
      const updateData: any = {};
      if (userData.username) updateData.username = userData.username;
      if (userData.full_name !== undefined) updateData.full_name = userData.full_name;
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.role) updateData.role = mapAppRoleToDatabase(userData.role);
      
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
    // Hash the password using the edge function
    const { data: hashData, error: hashError } = await supabase.functions.invoke('generate-password-hash', {
      body: { password: newPassword }
    });

    if (hashError) {
      console.error('Error hashing password:', hashError);
      throw new Error('Error al procesar la contraseña');
    }

    if (!hashData?.hash) {
      throw new Error('Error al generar hash de contraseña');
    }

    const { error } = await supabase
      .from('users')
      .update({ 
        pass_hash: hashData.hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user password:', error);
      throw new Error('Error al actualizar la contraseña del usuario');
    }
  };

  const resetPassword = async (userId: string): Promise<string> => {
    try {
      // Generate a random password
      const newPassword = Math.random().toString(36).slice(-8);
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const { data, error } = await supabase
        .from('users')
        .update({ pass_hash: hashedPassword })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
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