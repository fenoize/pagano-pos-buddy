import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { HRPayAdjustment, HRPayAdjustmentFormData } from '@/types/hr';
import { toast } from 'sonner';

export function useHRPayAdjustments(employeeId?: string) {
  const [adjustments, setAdjustments] = useState<HRPayAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const getUserId = () => localStorage.getItem('pos_user_id') || '';

  const fetchAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) return;
      
      const data = await withStaffContext(userId, async () => {
        let query = supabase
          .from('hr_pay_adjustments')
          .select(`
            *,
            employee:hr_employees(id, full_name, rut)
          `)
          .order('created_at', { ascending: false });
        
        if (employeeId) {
          query = query.eq('employee_id', employeeId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
      });
      
      setAdjustments(data as HRPayAdjustment[]);
    } catch (error: any) {
      console.error('Error fetching adjustments:', error);
      toast.error('Error al cargar ajustes');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const createAdjustment = async (formData: HRPayAdjustmentFormData) => {
    try {
      const userId = getUserId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_pay_adjustments')
          .insert({
            employee_id: formData.employee_id,
            type: formData.type,
            amount: formData.amount,
            description: formData.description || null,
            period_start: formData.period_start || null,
            period_end: formData.period_end || null,
          });
        if (error) throw error;
      });
      
      toast.success('Ajuste creado exitosamente');
      await fetchAdjustments();
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      toast.error('Error al crear ajuste');
      throw error;
    }
  };

  const updateAdjustment = async (id: string, formData: Partial<HRPayAdjustmentFormData>) => {
    try {
      const userId = getUserId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_pay_adjustments')
          .update(formData)
          .eq('id', id);
        if (error) throw error;
      });
      
      toast.success('Ajuste actualizado');
      await fetchAdjustments();
    } catch (error: any) {
      console.error('Error updating adjustment:', error);
      toast.error('Error al actualizar ajuste');
      throw error;
    }
  };

  const deleteAdjustment = async (id: string) => {
    try {
      const userId = getUserId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_pay_adjustments')
          .delete()
          .eq('id', id);
        if (error) throw error;
      });
      
      toast.success('Ajuste eliminado');
      await fetchAdjustments();
    } catch (error: any) {
      console.error('Error deleting adjustment:', error);
      toast.error('Error al eliminar ajuste');
      throw error;
    }
  };

  return {
    adjustments,
    loading,
    refetch: fetchAdjustments,
    createAdjustment,
    updateAdjustment,
    deleteAdjustment,
  };
}
