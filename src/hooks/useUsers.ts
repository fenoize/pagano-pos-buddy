import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';
import { usePermissions } from './usePermissions';
import { useAuthContext } from '@/contexts/AuthContext';
import { withStaffContext } from '@/lib/dbContext';

// Map old database role names to new app role names
const mapDatabaseRoleToApp = (dbRole: string): AppRole => {
  const mapping: Record<string, AppRole> = {
    'Cocina': 'Cocinero',
  };
  return mapping[dbRole] as AppRole || dbRole as AppRole;
};

// Map new app role names to database role names
const mapAppRoleToDatabase = (appRole: AppRole): string => {
  const mapping: Record<AppRole, string> = {
    'Cajero': 'Cajero',
    'Cocinero': 'Cocina',
    'Reparto': 'Reparto',
    'Administrador': 'Administrador',
    'Preparador': 'Cocina',
    'Viewer': 'Viewer',
    'TV': 'TV',
    'Leer QR': 'Leer QR'
  };
  return mapping[appRole] || appRole;
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuthContext();
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setUsers([]);
        return;
      }

      const result = await withStaffContext(user.id, async () => {
        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, full_name, email, role, active, can_do_delivery, can_use_lia, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;

        // Fetch all user_roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Group roles by user_id
        const rolesByUser: Record<string, AppRole[]> = {};
        for (const r of rolesData || []) {
          const mapped = mapDatabaseRoleToApp(r.role);
          if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
          if (!rolesByUser[r.user_id].includes(mapped)) {
            rolesByUser[r.user_id].push(mapped);
          }
        }

        return (usersData || []).map(u => ({
          ...u,
          role: mapDatabaseRoleToApp((u as any).role),
          roles: rolesByUser[u.id] || [mapDatabaseRoleToApp((u as any).role)],
        })) as User[];
      });

      setUsers(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const syncUserRoles = async (userId: string, roles: AppRole[], adminUserId: string) => {
    const dbRoles = roles.map(r => mapAppRoleToDatabase(r));
    const uniqueDbRoles = [...new Set(dbRoles)];

    const { error } = await supabase.rpc('sync_user_roles', {
      p_admin_user_id: adminUserId,
      p_target_user_id: userId,
      p_roles: uniqueDbRoles,
    } as any);

    if (error) throw error;
  };

  const createUser = async (userData: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    roles: AppRole[];
    can_do_delivery?: boolean;
  }) => {
    return requireAdminContext(async () => {
      const username = userData.username.trim();
      const full_name = userData.full_name.trim();
      const email = userData.email.trim();
      const primaryRole = mapAppRoleToDatabase(userData.roles[0] || 'Cajero');

      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          username,
          full_name: full_name || null,
          email: email || null,
          pass_hash: 'temp',
          role: primaryRole as any,
          active: true,
          can_do_delivery: userData.can_do_delivery ?? userData.roles.includes('Reparto')
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Set password
      const { error: passwordError } = await supabase.rpc('set_user_password', {
        user_uuid: data.id,
        new_password: userData.password
      });

      if (passwordError) {
        await supabase.from('users').delete().eq('id', data.id);
        throw passwordError;
      }

      // Sync roles to user_roles table
      await syncUserRoles(data.id, userData.roles, user!.id);

      return data;
    });
  };

  const updateUser = async (userId: string, userData: {
    username?: string;
    full_name?: string;
    email?: string;
    roles?: AppRole[];
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
      if (userData.can_do_delivery !== undefined) updateData.can_do_delivery = userData.can_do_delivery;

      // Update primary role if roles changed
      if (userData.roles && userData.roles.length > 0) {
        updateData.role = mapAppRoleToDatabase(userData.roles[0]);
        await syncUserRoles(userId, userData.roles, user!.id);
      }

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
      // user_roles has ON DELETE CASCADE, so it auto-cleans
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

      if (error) throw error;
      if (!data) throw new Error('No se pudo actualizar la contraseña. Usuario no encontrado.');
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
