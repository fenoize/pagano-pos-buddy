import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HRShift, HREmployeeResponse } from '@/types/hr';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { triggerShiftAcceptedNotification, triggerShiftRejectedNotification } from '@/lib/staffNotificationTriggers';

interface MyShiftWithCoworkers extends HRShift {
  coworkers: { id: string; full_name: string; role_name: string }[];
}

export function useMyShifts() {
  const { user } = useAuthContext();
  const [shifts, setShifts] = useState<MyShiftWithCoworkers[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());

  // Find the hr_employee linked to this user
  useEffect(() => {
    if (!user?.id) {
      setEmployeeId(null);
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, full_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.log('No employee linked to this user');
        setEmployeeId(null);
        setEmployeeName('');
      } else {
        setEmployeeId(data.id);
        setEmployeeName(data.full_name);
      }
      setLoading(false);
    };

    fetchEmployee();
  }, [user?.id]);

  // Date range for fetching (1 month window)
  const dateRange = useMemo(() => {
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
    return { start, end };
  }, [currentDate]);

  // Fetch shifts for this employee
  const fetchShifts = useCallback(async () => {
    if (!employeeId) {
      setShifts([]);
      return;
    }

    try {
      setLoading(true);

      // Fetch my shifts
      const { data: myShifts, error: shiftsError } = await supabase
        .from('hr_shifts')
        .select(`
          *,
          employee:hr_employees(id, full_name, rut, user_id),
          shift_type:hr_shift_types(id, name, default_hours),
          role:hr_shift_roles(id, name),
          schedule:hr_schedules(id, name, start_time, end_time)
        `)
        .eq('employee_id', employeeId)
        .gte('shift_date', dateRange.start)
        .lte('shift_date', dateRange.end)
        .order('shift_date', { ascending: true });

      if (shiftsError) throw shiftsError;

      // For each shift, fetch coworkers on the same schedule/date
      const shiftsWithCoworkers: MyShiftWithCoworkers[] = await Promise.all(
        (myShifts || []).map(async (shift) => {
          let coworkers: { id: string; full_name: string; role_name: string }[] = [];

          if (shift.schedule_id) {
            const { data: coworkerShifts } = await supabase
              .from('hr_shifts')
              .select(`
                id,
                employee:hr_employees(id, full_name),
                role:hr_shift_roles(id, name)
              `)
              .eq('shift_date', shift.shift_date)
              .eq('schedule_id', shift.schedule_id)
              .neq('employee_id', employeeId)
              .not('employee_id', 'is', null);

            coworkers = (coworkerShifts || []).map(cs => ({
              id: cs.employee?.id || '',
              full_name: cs.employee?.full_name || '',
              role_name: cs.role?.name || ''
            }));
          }

          return { ...shift, coworkers } as MyShiftWithCoworkers;
        })
      );

      setShifts(shiftsWithCoworkers);
    } catch (error: any) {
      console.error('Error fetching my shifts:', error);
      toast.error('Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  }, [employeeId, dateRange.start, dateRange.end]);

  useEffect(() => {
    if (employeeId) {
      fetchShifts();
    }
  }, [fetchShifts, employeeId]);

  // Accept a single shift
  const acceptShift = async (shiftId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('hr_shifts')
        .update({
          employee_response: 'accepted' as HREmployeeResponse,
          employee_response_at: new Date().toISOString(),
          employee_response_note: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', shiftId)
        .eq('employee_id', employeeId);

      if (error) throw error;

      // Get shift info for notification
      const shift = shifts.find(s => s.id === shiftId);
      if (shift) {
        await triggerShiftAcceptedNotification(
          user.id,
          employeeName,
          shift.shift_date,
          shiftId
        );
      }

      toast.success('Turno aceptado');
      await fetchShifts();
      setSelectedShifts(prev => {
        const next = new Set(prev);
        next.delete(shiftId);
        return next;
      });
    } catch (error: any) {
      console.error('Error accepting shift:', error);
      toast.error('Error al aceptar turno');
    }
  };

  // Reject a single shift with optional note
  const rejectShift = async (shiftId: string, note?: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('hr_shifts')
        .update({
          employee_response: 'rejected' as HREmployeeResponse,
          employee_response_at: new Date().toISOString(),
          employee_response_note: note || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', shiftId)
        .eq('employee_id', employeeId);

      if (error) throw error;

      // Get shift info for notification
      const shift = shifts.find(s => s.id === shiftId);
      if (shift) {
        await triggerShiftRejectedNotification(
          user.id,
          employeeName,
          shift.shift_date,
          note || null,
          shiftId
        );
      }

      toast.success('Turno rechazado');
      await fetchShifts();
      setSelectedShifts(prev => {
        const next = new Set(prev);
        next.delete(shiftId);
        return next;
      });
    } catch (error: any) {
      console.error('Error rejecting shift:', error);
      toast.error('Error al rechazar turno');
    }
  };

  // Bulk accept
  const bulkAccept = async () => {
    if (selectedShifts.size === 0) return;

    try {
      const ids = Array.from(selectedShifts);
      const { error } = await supabase
        .from('hr_shifts')
        .update({
          employee_response: 'accepted' as HREmployeeResponse,
          employee_response_at: new Date().toISOString(),
          employee_response_note: null,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .eq('employee_id', employeeId);

      if (error) throw error;

      // Send notifications for each accepted shift
      for (const shiftId of ids) {
        const shift = shifts.find(s => s.id === shiftId);
        if (shift && user?.id) {
          await triggerShiftAcceptedNotification(
            user.id,
            employeeName,
            shift.shift_date,
            shiftId
          );
        }
      }

      toast.success(`${ids.length} turnos aceptados`);
      setSelectedShifts(new Set());
      await fetchShifts();
    } catch (error: any) {
      console.error('Error bulk accepting shifts:', error);
      toast.error('Error al aceptar turnos');
    }
  };

  // Bulk reject
  const bulkReject = async (note?: string) => {
    if (selectedShifts.size === 0) return;

    try {
      const ids = Array.from(selectedShifts);
      const { error } = await supabase
        .from('hr_shifts')
        .update({
          employee_response: 'rejected' as HREmployeeResponse,
          employee_response_at: new Date().toISOString(),
          employee_response_note: note || null,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .eq('employee_id', employeeId);

      if (error) throw error;

      // Send notifications for each rejected shift
      for (const shiftId of ids) {
        const shift = shifts.find(s => s.id === shiftId);
        if (shift && user?.id) {
          await triggerShiftRejectedNotification(
            user.id,
            employeeName,
            shift.shift_date,
            note || null,
            shiftId
          );
        }
      }

      toast.success(`${ids.length} turnos rechazados`);
      setSelectedShifts(new Set());
      await fetchShifts();
    } catch (error: any) {
      console.error('Error bulk rejecting shifts:', error);
      toast.error('Error al rechazar turnos');
    }
  };

  // Selection helpers
  const toggleSelect = (shiftId: string) => {
    setSelectedShifts(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const selectAllPending = () => {
    const pending = shifts.filter(s => s.employee_response === 'pending' || s.employee_response === null);
    setSelectedShifts(new Set(pending.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedShifts(new Set());
  };

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(d => subMonths(d, 1));
  const goToNextMonth = () => setCurrentDate(d => addMonths(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Counts
  const pendingCount = shifts.filter(s => s.employee_response === 'pending' || s.employee_response === null).length;
  const acceptedCount = shifts.filter(s => s.employee_response === 'accepted').length;
  const rejectedCount = shifts.filter(s => s.employee_response === 'rejected').length;

  return {
    shifts,
    loading,
    employeeId,
    employeeName,
    currentDate,
    selectedShifts,
    pendingCount,
    acceptedCount,
    rejectedCount,
    refetch: fetchShifts,
    acceptShift,
    rejectShift,
    bulkAccept,
    bulkReject,
    toggleSelect,
    selectAllPending,
    clearSelection,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  };
}
