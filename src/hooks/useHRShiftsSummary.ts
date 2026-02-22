import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HRShift, HRPayRule } from '@/types/hr';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface ShiftSummaryItem {
  employee_id: string;
  employee_name: string;
  employee_rut: string | null;
  total_shifts: number;
  pending_shifts: number;    // draft + confirmed
  approved_shifts: number;   // approved + paid
  estimated_pay: number;     // calculado con pay_rules
}

export interface ShiftSummaryTotals {
  total_shifts: number;
  total_employees: number;
  total_pending: number;
  total_approved: number;
  total_estimated_pay: number;
}

export interface ShiftSummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  shiftTypeId?: string;
}

export function useHRShiftsSummary(filters: ShiftSummaryFilters) {
  const [shifts, setShifts] = useState<HRShift[]>([]);
  const [payRules, setPayRules] = useState<HRPayRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch pay rules
  const fetchPayRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hr_pay_rules')
        .select(`
          *,
          shift_type:hr_shift_types(id, name, default_hours)
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      setPayRules(data as HRPayRule[]);
    } catch (error: any) {
      console.error('Error fetching pay rules:', error);
    }
  }, []);

  // Fetch shifts
  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('hr_shifts')
        .select(`
          *,
          employee:hr_employees(id, full_name, rut),
          shift_type:hr_shift_types(id, name, default_hours)
        `);
      
      if (filters.dateFrom) {
        query = query.gte('shift_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('shift_date', filters.dateTo);
      }
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters.shiftTypeId) {
        query = query.eq('shift_type_id', filters.shiftTypeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setShifts(data as HRShift[]);
    } catch (error: any) {
      console.error('Error fetching HR shifts:', error);
      toast.error('Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPayRules();
  }, [fetchPayRules]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Calculate pay for a shift based on pay rules
  const getShiftPayAmount = useCallback((shift: HRShift): number => {
    const rule = payRules.find(r => 
      r.shift_type_id === shift.shift_type_id && r.is_active
    );
    return rule?.pay_per_shift || 0;
  }, [payRules]);

  // Calculate summary items grouped by employee
  const { items, totals } = useMemo(() => {
    // Filter only shifts with assigned employees
    const assignedShifts = shifts.filter(s => s.employee_id && s.employee);
    
    // Group by employee
    const byEmployee = new Map<string, HRShift[]>();
    assignedShifts.forEach(shift => {
      const empId = shift.employee_id!;
      if (!byEmployee.has(empId)) {
        byEmployee.set(empId, []);
      }
      byEmployee.get(empId)!.push(shift);
    });

    // Calculate summary for each employee
    const summaryItems: ShiftSummaryItem[] = [];
    
    byEmployee.forEach((employeeShifts, employeeId) => {
      const firstShift = employeeShifts[0];
      const pendingStatuses = ['draft', 'confirmed'];
      const approvedStatuses = ['approved', 'paid'];
      
      const pendingShifts = employeeShifts.filter(s => pendingStatuses.includes(s.status)).length;
      const approvedShifts = employeeShifts.filter(s => approvedStatuses.includes(s.status)).length;
      const estimatedPay = employeeShifts.reduce((sum, s) => sum + getShiftPayAmount(s), 0);
      
      summaryItems.push({
        employee_id: employeeId,
        employee_name: firstShift.employee?.full_name || 'Sin nombre',
        employee_rut: firstShift.employee?.rut || null,
        total_shifts: employeeShifts.length,
        pending_shifts: pendingShifts,
        approved_shifts: approvedShifts,
        estimated_pay: estimatedPay,
      });
    });

    // Sort by name
    summaryItems.sort((a, b) => a.employee_name.localeCompare(b.employee_name));

    // Calculate totals
    const summaryTotals: ShiftSummaryTotals = {
      total_shifts: summaryItems.reduce((sum, i) => sum + i.total_shifts, 0),
      total_employees: summaryItems.length,
      total_pending: summaryItems.reduce((sum, i) => sum + i.pending_shifts, 0),
      total_approved: summaryItems.reduce((sum, i) => sum + i.approved_shifts, 0),
      total_estimated_pay: summaryItems.reduce((sum, i) => sum + i.estimated_pay, 0),
    };

    return { items: summaryItems, totals: summaryTotals };
  }, [shifts, getShiftPayAmount]);

  return {
    items,
    totals,
    loading,
    filters,
    refetch: fetchShifts,
  };
}
