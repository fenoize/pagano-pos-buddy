import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import { HREmployee, HREmployeeFormData } from '@/types/hr';
import { toast } from 'sonner';

interface UseHREmployeesOptions {
  userId?: string;
}

export function useHREmployees(options?: UseHREmployeesOptions) {
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [loading, setLoading] = useState(true);

  // Obtener userId: primero del parámetro, luego de localStorage
  const getUserId = useCallback((): string => {
    if (options?.userId) {
      return options.userId;
    }
    return getStaffUserId();
  }, [options?.userId]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }
      
      await withStaffContext(userId, async () => {
        const { data, error } = await supabase
          .from('hr_employees')
          .select(`*, user:users(id, username, full_name)`)
          .order('full_name');
        
        if (error) throw error;
        setEmployees(data as HREmployee[]);
      });
    } catch (error: any) {
      console.error('Error fetching HR employees:', error);
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }, [getUserId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = async (formData: HREmployeeFormData) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_employees').insert({
          full_name: formData.full_name,
          email: formData.email || null,
          phone: formData.phone || null,
          rut: formData.rut || null,
          user_id: formData.user_id || null,
          notes: formData.notes || null,
        });
        if (error) throw error;
      });
      toast.success('Empleado creado exitosamente');
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast.error('Error al crear empleado');
      throw error;
    }
  };

  const updateEmployee = async (id: string, formData: Partial<HREmployeeFormData>) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_employees')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      });
      toast.success('Empleado actualizado exitosamente');
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error('Error al actualizar empleado');
      throw error;
    }
  };

  const toggleEmployeeStatus = async (id: string, isActive: boolean) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_employees')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      });
      toast.success(isActive ? 'Empleado activado' : 'Empleado desactivado');
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error toggling employee status:', error);
      toast.error('Error al cambiar estado del empleado');
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_employees').delete().eq('id', id);
        if (error) throw error;
      });
      toast.success('Empleado eliminado');
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error('Error al eliminar empleado');
      throw error;
    }
  };

  return {
    employees,
    activeEmployees: employees.filter(e => e.is_active),
    loading,
    refetch: fetchEmployees,
    createEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    deleteEmployee,
  };
}
