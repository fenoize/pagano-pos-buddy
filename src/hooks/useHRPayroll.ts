import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import { HRPayrollRun, HRPayrollItem, HRPayrollGenerateParams, HRPayrollFilters, HRPayAdjustment } from '@/types/hr';
import { toast } from 'sonner';

const getUserId = () => getStaffUserId();

export function useHRPayroll() {
  const [payrollRuns, setPayrollRuns] = useState<HRPayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HRPayrollFilters>({});

  const fetchPayrollRuns = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) return;
      
      const data = await withStaffContext(userId, async () => {
        let query = supabase
          .from('hr_payroll_runs')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (filters.dateFrom) {
          query = query.gte('period_start', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('period_end', filters.dateTo);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.periodType) {
          query = query.eq('period_type', filters.periodType);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
      });
      
      setPayrollRuns(data as unknown as HRPayrollRun[]);
    } catch (error: any) {
      console.error('Error fetching payroll runs:', error);
      toast.error('Error al cargar liquidaciones');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPayrollRuns();
  }, [fetchPayrollRuns]);

  const generatePayroll = async (params: HRPayrollGenerateParams): Promise<string | null> => {
    try {
      const userId = getUserId();
      const payrollId = await withStaffContext(userId, async () => {
        const { data, error } = await supabase.rpc('hr_generate_payroll_run_v1', {
          p_period_type: params.period_type,
          p_start_date: params.start_date,
          p_end_date: params.end_date,
          p_notes: params.notes || null,
        });
        
        if (error) throw error;
        return data as string;
      });
      
      toast.success('Liquidación generada exitosamente');
      await fetchPayrollRuns();
      return payrollId;
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      toast.error(error.message || 'Error al generar liquidación');
      return null;
    }
  };

  const issuePayroll = async (payrollId: string) => {
    try {
      const userId = getUserId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase.rpc('hr_issue_payroll', {
          p_payroll_id: payrollId,
        });
        
        if (error) throw error;
      });
      
      toast.success('Liquidación emitida');
      await fetchPayrollRuns();
    } catch (error: any) {
      console.error('Error issuing payroll:', error);
      toast.error(error.message || 'Error al emitir liquidación');
      throw error;
    }
  };

  const markPayrollPaid = async (payrollId: string, paymentMethod: string, accountId: string) => {
    try {
      const userId = getUserId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase.rpc('hr_mark_payroll_paid', {
          p_payroll_id: payrollId,
          p_payment_method: paymentMethod,
          p_account_id: accountId,
        });
        
        if (error) throw error;
      });
      
      toast.success('Liquidación marcada como pagada');
      await fetchPayrollRuns();
    } catch (error: any) {
      console.error('Error marking payroll paid:', error);
      toast.error(error.message || 'Error al marcar como pagada');
      throw error;
    }
  };

  const getPayrollItems = async (payrollId: string): Promise<HRPayrollItem[]> => {
    try {
      const userId = getUserId();
      const data = await withStaffContext(userId, async () => {
        const { data, error } = await supabase
          .from('hr_payroll_items')
          .select(`
            *,
            employee:hr_employees(id, full_name, rut)
          `)
          .eq('payroll_id', payrollId)
          .order('created_at');
        
        if (error) throw error;
        return data;
      });
      
      return data as unknown as HRPayrollItem[];
    } catch (error: any) {
      console.error('Error fetching payroll items:', error);
      toast.error('Error al cargar detalle de liquidación');
      return [];
    }
  };

  const deletePayroll = async (payrollId: string) => {
    try {
      const userId = getUserId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_payroll_runs')
          .delete()
          .eq('id', payrollId)
          .eq('status', 'draft');
        
        if (error) throw error;
      });
      
      toast.success('Liquidación eliminada');
      await fetchPayrollRuns();
    } catch (error: any) {
      console.error('Error deleting payroll:', error);
      toast.error('Error al eliminar liquidación');
      throw error;
    }
  };

  return {
    payrollRuns,
    loading,
    filters,
    setFilters,
    refetch: fetchPayrollRuns,
    generatePayroll,
    issuePayroll,
    markPayrollPaid,
    getPayrollItems,
    deletePayroll,
  };
}

export function useHRPayAdjustments(employeeId?: string) {
  const [adjustments, setAdjustments] = useState<HRPayAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

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
            employee:hr_employees(id, full_name)
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

  const createAdjustment = async (data: {
    employee_id: string;
    period_start: string;
    period_end: string;
    type: 'bonus' | 'advance' | 'discount';
    amount: number;
    description?: string;
  }) => {
    try {
      const userId = getUserId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_pay_adjustments')
          .insert({
            ...data,
            created_by: userId,
          });
        
        if (error) throw error;
      });
      
      toast.success('Ajuste creado');
      await fetchAdjustments();
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      toast.error('Error al crear ajuste');
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
    deleteAdjustment,
  };
}
