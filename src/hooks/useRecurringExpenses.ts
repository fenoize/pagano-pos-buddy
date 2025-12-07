import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RecurringExpense {
  id: string;
  name: string;
  category: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TopRecurringExpense {
  recurring_id: string;
  recurring_name: string;
  category: string;
  total_amount: number;
  expense_count: number;
}

export function useRecurringExpenses() {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecurringExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_recurring_expenses')
        .select('*')
        .order('name');

      if (error) throw error;
      setRecurringExpenses((data || []) as RecurringExpense[]);
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los gastos recurrentes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createRecurringExpense = async (
    data: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { error } = await supabase
        .from('finance_recurring_expenses')
        .insert([data]);

      if (error) throw error;

      toast({
        title: 'Gasto recurrente creado',
        description: 'El gasto recurrente se ha creado exitosamente',
      });

      await fetchRecurringExpenses();
      return true;
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el gasto recurrente',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateRecurringExpense = async (
    id: string,
    data: Partial<RecurringExpense>
  ) => {
    try {
      const { error } = await supabase
        .from('finance_recurring_expenses')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Gasto recurrente actualizado',
        description: 'Los cambios se han guardado correctamente',
      });

      await fetchRecurringExpenses();
      return true;
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el gasto recurrente',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteRecurringExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Gasto recurrente eliminado',
        description: 'El gasto recurrente se ha eliminado correctamente',
      });

      await fetchRecurringExpenses();
      return true;
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el gasto recurrente',
        variant: 'destructive',
      });
      return false;
    }
  };

  const fetchTopRecurringForClosure = async (
    startDate: string,
    endDate: string
  ): Promise<TopRecurringExpense[]> => {
    try {
      const { data, error } = await supabase.rpc('get_top_recurring_expenses_for_closure', {
        _start: startDate,
        _end: endDate,
        _limit: 10,
      });

      if (error) throw error;
      return (data || []) as TopRecurringExpense[];
    } catch (error) {
      console.error('Error fetching top recurring expenses:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchRecurringExpenses();
  }, []);

  return {
    recurringExpenses,
    activeRecurringExpenses: recurringExpenses.filter((e) => e.is_active),
    loading,
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    fetchTopRecurringForClosure,
    refetch: fetchRecurringExpenses,
  };
}
