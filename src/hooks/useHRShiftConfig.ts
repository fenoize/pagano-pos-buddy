import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import { HRShiftRole, HRShiftType, HRPayRule } from '@/types/hr';
import { toast } from 'sonner';

interface UseHRShiftConfigOptions {
  userId?: string;
}

export function useHRShiftConfig(options?: UseHRShiftConfigOptions) {
  const [roles, setRoles] = useState<HRShiftRole[]>([]);
  const [shiftTypes, setShiftTypes] = useState<HRShiftType[]>([]);
  const [payRules, setPayRules] = useState<HRPayRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Obtener userId: primero del parámetro, luego de localStorage
  const getUserId = useCallback((): string => {
    if (options?.userId) {
      return options.userId;
    }
    return getStaffUserId();
  }, [options?.userId]);

  const requireUserId = (): string => {
    const userId = getUserId();
    if (!userId) {
      console.error('useHRShiftConfig: No user logged in. localStorage:', localStorage.getItem('paganos_staff_user'));
      toast.error('Debes iniciar sesión para realizar esta acción');
      throw new Error('No user logged in');
    }
    return userId;
  };

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }
      
      await withStaffContext(userId, async () => {
        const [rolesRes, typesRes, rulesRes] = await Promise.all([
          supabase.from('hr_shift_roles').select('*').order('name'),
          supabase.from('hr_shift_types').select('*').order('name'),
          supabase.from('hr_pay_rules').select(`*, shift_type:hr_shift_types(*)`).order('created_at'),
        ]);
        
        if (rolesRes.error) throw rolesRes.error;
        if (typesRes.error) throw typesRes.error;
        if (rulesRes.error) throw rulesRes.error;
        
        setRoles(rolesRes.data as HRShiftRole[]);
        setShiftTypes(typesRes.data as HRShiftType[]);
        setPayRules(rulesRes.data as HRPayRule[]);
      });
    } catch (error: any) {
      console.error('Error fetching HR config:', error);
      toast.error('Error al cargar configuración RRHH');
    } finally {
      setLoading(false);
    }
  }, [getUserId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Roles CRUD
  const createRole = async (name: string, description?: string) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shift_roles').insert({ name, description: description || null });
        if (error) throw error;
      });
      toast.success('Rol creado');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error('Error al crear rol');
      throw error;
    }
  };

  const updateRole = async (id: string, data: { name?: string; description?: string; is_active?: boolean }) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shift_roles').update(data).eq('id', id);
        if (error) throw error;
      });
      toast.success('Rol actualizado');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar rol');
      throw error;
    }
  };

  const deleteRole = async (id: string) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shift_roles').delete().eq('id', id);
        if (error) throw error;
      });
      toast.success('Rol eliminado');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error('Error al eliminar rol');
      throw error;
    }
  };

  // Shift Types CRUD
  const createShiftType = async (name: string, defaultHours: number) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shift_types').insert({ name, default_hours: defaultHours });
        if (error) throw error;
      });
      toast.success('Tipo de turno creado');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error creating shift type:', error);
      toast.error('Error al crear tipo de turno');
      throw error;
    }
  };

  const updateShiftType = async (id: string, data: { name?: string; default_hours?: number; is_active?: boolean }) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shift_types').update(data).eq('id', id);
        if (error) throw error;
      });
      toast.success('Tipo de turno actualizado');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error updating shift type:', error);
      toast.error('Error al actualizar tipo de turno');
      throw error;
    }
  };

  const deleteShiftType = async (id: string) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shift_types').delete().eq('id', id);
        if (error) throw error;
      });
      toast.success('Tipo de turno eliminado');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error deleting shift type:', error);
      toast.error('Error al eliminar tipo de turno');
      throw error;
    }
  };

  // Pay Rules CRUD
  const updatePayRule = async (id: string, data: { pay_per_shift?: number; tax_percent?: number | null; is_active?: boolean }) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_pay_rules').update(data).eq('id', id);
        if (error) throw error;
      });
      toast.success('Regla de pago actualizada');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error updating pay rule:', error);
      toast.error('Error al actualizar regla de pago');
      throw error;
    }
  };

  const createPayRule = async (shiftTypeId: string, payPerShift: number) => {
    const userId = requireUserId();
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_pay_rules').insert({ shift_type_id: shiftTypeId, pay_per_shift: payPerShift });
        if (error) throw error;
      });
      toast.success('Regla de pago creada');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error creating pay rule:', error);
      toast.error('Error al crear regla de pago');
      throw error;
    }
  };

  return {
    roles,
    activeRoles: roles.filter(r => r.is_active),
    shiftTypes,
    activeShiftTypes: shiftTypes.filter(t => t.is_active),
    payRules,
    activePayRules: payRules.filter(r => r.is_active),
    loading,
    refetch: fetchConfig,
    createRole,
    updateRole,
    deleteRole,
    createShiftType,
    updateShiftType,
    deleteShiftType,
    createPayRule,
    updatePayRule,
  };
}
