import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import { HRShift, HRShiftFormData, HRShiftFilters } from '@/types/hr';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export function useHRShifts(initialFilters?: HRShiftFilters) {
  const [shifts, setShifts] = useState<HRShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HRShiftFilters>(() => initialFilters || {
    dateFrom: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    dateTo: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  });

  // Sync filters when initialFilters change (for calendar navigation)
  const prevInitialFiltersRef = useState<HRShiftFilters | undefined>(undefined);
  if (initialFilters && (
    initialFilters.dateFrom !== prevInitialFiltersRef[0]?.dateFrom ||
    initialFilters.dateTo !== prevInitialFiltersRef[0]?.dateTo
  )) {
    prevInitialFiltersRef[0] = initialFilters;
    // Update date filters while preserving other filters
    setFilters(prev => ({
      ...prev,
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
    }));
  }

  const getUserId = () => getStaffUserId();

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) return;
      
      await withStaffContext(userId, async () => {
        let query = supabase
          .from('hr_shifts')
          .select(`
            *,
            employee:hr_employees(id, full_name, rut),
            shift_type:hr_shift_types(id, name, default_hours),
            role:hr_shift_roles(id, name)
          `)
          .order('shift_date', { ascending: false });
        
        if (filters.dateFrom) {
          query = query.gte('shift_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('shift_date', filters.dateTo);
        }
        if (filters.employeeId) {
          query = query.eq('employee_id', filters.employeeId);
        }
        if (filters.roleId) {
          query = query.eq('role_id', filters.roleId);
        }
        if (filters.shiftTypeId) {
          query = query.eq('shift_type_id', filters.shiftTypeId);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        setShifts(data as HRShift[]);
      });
    } catch (error: any) {
      console.error('Error fetching HR shifts:', error);
      toast.error('Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const createShift = async (formData: HRShiftFormData) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shifts').insert({
          employee_id: formData.employee_id,
          shift_date: formData.shift_date,
          shift_type_id: formData.shift_type_id,
          role_id: formData.role_id,
          hours_override: formData.hours_override || null,
          notes: formData.notes || null,
          status: 'draft',
          created_by: userId,
        });
        if (error) throw error;
      });
      toast.success('Turno creado');
      await fetchShifts();
    } catch (error: any) {
      console.error('Error creating shift:', error);
      toast.error('Error al crear turno');
      throw error;
    }
  };

  const updateShift = async (id: string, formData: Partial<HRShiftFormData>) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shifts')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      });
      toast.success('Turno actualizado');
      await fetchShifts();
    } catch (error: any) {
      console.error('Error updating shift:', error);
      toast.error('Error al actualizar turno');
      throw error;
    }
  };

  const confirmShift = async (id: string) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shifts').update({
          status: 'confirmed',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', id).eq('status', 'draft');
        if (error) throw error;
      });
      toast.success('Turno confirmado');
      await fetchShifts();
    } catch (error: any) {
      console.error('Error confirming shift:', error);
      toast.error('Error al confirmar turno');
      throw error;
    }
  };

  const approveShift = async (id: string) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shifts').update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', id).eq('status', 'confirmed');
        if (error) throw error;
      });
      toast.success('Turno aprobado');
      await fetchShifts();
    } catch (error: any) {
      console.error('Error approving shift:', error);
      toast.error('Error al aprobar turno');
      throw error;
    }
  };

  const deleteShift = async (id: string) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shifts').delete().eq('id', id).in('status', ['draft', 'confirmed']);
        if (error) throw error;
      });
      toast.success('Turno eliminado');
      await fetchShifts();
    } catch (error: any) {
      console.error('Error deleting shift:', error);
      toast.error('Error al eliminar turno');
      throw error;
    }
  };

  const bulkConfirm = async (ids: string[]) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shifts').update({
          status: 'confirmed',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).in('id', ids).eq('status', 'draft');
        if (error) throw error;
      });
      toast.success(`${ids.length} turnos confirmados`);
      await fetchShifts();
    } catch (error: any) {
      console.error('Error bulk confirming shifts:', error);
      toast.error('Error al confirmar turnos');
      throw error;
    }
  };

  const bulkApprove = async (ids: string[]) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_shifts').update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).in('id', ids).eq('status', 'confirmed');
        if (error) throw error;
      });
      toast.success(`${ids.length} turnos aprobados`);
      await fetchShifts();
    } catch (error: any) {
      console.error('Error bulk approving shifts:', error);
      toast.error('Error al aprobar turnos');
      throw error;
    }
  };

  return {
    shifts,
    loading,
    filters,
    setFilters,
    refetch: fetchShifts,
    createShift,
    updateShift,
    confirmShift,
    approveShift,
    deleteShift,
    bulkConfirm,
    bulkApprove,
  };
}
