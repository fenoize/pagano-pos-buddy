import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import { HRPayrollRun, HRPayrollItem, HRPayrollGenerateParams, HRPayrollFilters } from '@/types/hr';
import { toast } from 'sonner';

export function useHRPayroll() {
  const [payrollRuns, setPayrollRuns] = useState<HRPayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HRPayrollFilters>({});

  const getUserId = () => getStaffUserId();

  const fetchPayrollRuns = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) return;
      
      await withStaffContext(userId, async () => {
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
        setPayrollRuns(data as unknown as HRPayrollRun[]);
      });
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
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return null;
    }
    try {
      let payrollId: string | null = null;
      await withStaffContext(userId, async () => {
        const { data, error } = await supabase.rpc('hr_generate_payroll_run_v1', {
          p_period_type: params.period_type,
          p_start_date: params.start_date,
          p_end_date: params.end_date,
          p_notes: params.notes || null,
        });
        if (error) throw error;
        payrollId = data as string;
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
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.rpc('hr_issue_payroll', { p_payroll_id: payrollId });
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
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
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
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return [];
    }
    try {
      let items: HRPayrollItem[] = [];
      await withStaffContext(userId, async () => {
        const { data, error } = await supabase
          .from('hr_payroll_items')
          .select(`*, employee:hr_employees(id, full_name, rut)`)
          .eq('payroll_id', payrollId)
          .order('created_at');
        if (error) throw error;
        items = data as unknown as HRPayrollItem[];
      });
      return items;
    } catch (error: any) {
      console.error('Error fetching payroll items:', error);
      toast.error('Error al cargar detalle de liquidación');
      return [];
    }
  };

  const deletePayroll = async (payrollId: string) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase.from('hr_payroll_runs').delete().eq('id', payrollId).eq('status', 'draft');
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
