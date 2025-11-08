import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinanceExpense } from '@/types/finance';
import { toast } from '@/hooks/use-toast';

export function useFinanceExpenses() {
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_expenses')
        .select(`
          *,
          account:finance_accounts(id, name, type)
        `)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as FinanceExpense[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los egresos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createExpense = async (data: Omit<FinanceExpense, 'id' | 'created_at' | 'updated_at' | 'registered_by' | 'account'>) => {
    try {
      const { error } = await supabase
        .from('finance_expenses')
        .insert([data]);

      if (error) throw error;

      toast({
        title: 'Egreso registrado',
        description: 'El egreso se ha registrado exitosamente',
      });

      await fetchExpenses();
      return true;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el egreso',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateExpense = async (id: string, data: Partial<FinanceExpense>) => {
    try {
      const { error } = await supabase
        .from('finance_expenses')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Egreso actualizado',
        description: 'Los cambios se han guardado correctamente',
      });

      await fetchExpenses();
      return true;
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el egreso',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Egreso eliminado',
        description: 'El egreso se ha eliminado correctamente',
      });

      await fetchExpenses();
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el egreso',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return {
    expenses,
    loading,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
}
