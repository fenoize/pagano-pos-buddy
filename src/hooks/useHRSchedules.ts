import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import { toast } from '@/hooks/use-toast';
import type { HRSchedule, HRScheduleFormData, HRSchedulePositionFormData } from '@/types/hr';
import { toast } from "sonner";

interface UseHRSchedulesOptions {
  userId?: string;
}

export function useHRSchedules(options?: UseHRSchedulesOptions) {
  const [schedules, setSchedules] = useState<HRSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const getUserId = () => options?.userId || getStaffUserId();

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch schedules - RLS is public, no context needed for read
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('hr_schedules' as any)
        .select('*')
        .order('name');

      if (schedulesError) throw schedulesError;

      // Fetch positions with joins
      const { data: positionsData, error: positionsError } = await supabase
        .from('hr_schedule_positions' as any)
        .select(`
          *,
          role:hr_shift_roles(*),
          shift_type:hr_shift_types(*)
        `)
        .order('sort_order');

      if (positionsError) throw positionsError;

      // Group positions by schedule
      const schedulesWithPositions = (schedulesData || []).map((schedule: any) => ({
        ...schedule,
        positions: (positionsData || []).filter((p: any) => p.schedule_id === schedule.id)
      }));

      setSchedules(schedulesWithPositions);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Error', { description: 'No se pudieron cargar los horarios' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = async (data: HRScheduleFormData): Promise<HRSchedule | null> => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Error', { description: 'Sesión no válida' });
      return null;
    }

    try {
      // Auto-detect crosses_midnight
      const startParts = data.start_time.split(':').map(Number);
      const endParts = data.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      const crossesMidnight = endMinutes <= startMinutes;

      let result: HRSchedule | null = null;

      await withStaffContext(userId, async () => {
        const { data: newSchedule, error } = await supabase
          .from('hr_schedules' as any)
          .insert({
            name: data.name,
            days_of_week: data.days_of_week,
            start_time: data.start_time,
            end_time: data.end_time,
            crosses_midnight: crossesMidnight
          })
          .select()
          .single();

        if (error) throw error;
        result = newSchedule as unknown as HRSchedule;
      });

      toast({
        title: 'Horario creado',
        description: `Se creó el horario "${data.name}"`
      });

      await fetchSchedules();
      return result;
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Error', { description: 'No se pudo crear el horario' });
      return null;
    }
  };

  const updateSchedule = async (id: string, data: Partial<HRScheduleFormData> & { is_active?: boolean }): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Error', { description: 'Sesión no válida' });
      return false;
    }

    try {
      const updateData: Record<string, unknown> = { ...data };

      // Recalculate crosses_midnight if times changed
      if (data.start_time && data.end_time) {
        const startParts = data.start_time.split(':').map(Number);
        const endParts = data.end_time.split(':').map(Number);
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];
        updateData.crosses_midnight = endMinutes <= startMinutes;
      }

      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_schedules' as any)
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      });

      toast.success('Horario actualizado', { description: 'Los cambios se guardaron correctamente' });

      await fetchSchedules();
      return true;
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Error', { description: 'No se pudo actualizar el horario' });
      return false;
    }
  };

  const deleteSchedule = async (id: string): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Error', { description: 'Sesión no válida' });
      return false;
    }

    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_schedules' as any)
          .delete()
          .eq('id', id);

        if (error) throw error;
      });

      toast.success('Horario eliminado', { description: 'El horario fue eliminado correctamente' });

      await fetchSchedules();
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Error', { description: 'No se pudo eliminar el horario' });
      return false;
    }
  };

  const addPosition = async (scheduleId: string, data: HRSchedulePositionFormData): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Error', { description: 'Sesión no válida' });
      return false;
    }

    try {
      // Get current max sort_order
      const schedule = schedules.find(s => s.id === scheduleId);
      const maxOrder = schedule?.positions?.reduce((max, p) => Math.max(max, p.sort_order), -1) ?? -1;

      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_schedule_positions' as any)
          .insert({
            schedule_id: scheduleId,
            role_id: data.role_id,
            shift_type_id: data.shift_type_id,
            sort_order: maxOrder + 1
          });

        if (error) throw error;
      });

      toast.success('Posición agregada', { description: 'Se agregó la posición al horario' });

      await fetchSchedules();
      return true;
    } catch (error) {
      console.error('Error adding position:', error);
      toast.error('Error', { description: 'No se pudo agregar la posición' });
      return false;
    }
  };

  const removePosition = async (positionId: string): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Error', { description: 'Sesión no válida' });
      return false;
    }

    try {
      await withStaffContext(userId, async () => {
        const { error } = await supabase
          .from('hr_schedule_positions' as any)
          .delete()
          .eq('id', positionId);

        if (error) throw error;
      });

      toast.success('Posición eliminada', { description: 'Se eliminó la posición del horario' });

      await fetchSchedules();
      return true;
    } catch (error) {
      console.error('Error removing position:', error);
      toast.error('Error', { description: 'No se pudo eliminar la posición' });
      return false;
    }
  };

  // Computed
  const activeSchedules = schedules.filter(s => s.is_active);

  return {
    schedules,
    activeSchedules,
    loading,
    refetch: fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    addPosition,
    removePosition
  };
}
