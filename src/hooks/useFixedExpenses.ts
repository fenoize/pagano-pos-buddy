import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FixedExpense } from '@/types/finance';
import { toast } from 'sonner';

export function useFixedExpenses() {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFixedExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_fixed_expenses' as any)
        .select(`
          *,
          account:account_id (
            id,
            name,
            type
          )
        `)
        .order('department', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setFixedExpenses((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching fixed expenses:', error);
      toast.error('Error al cargar gastos fijos');
    } finally {
      setLoading(false);
    }
  };

  const createFixedExpense = async (expense: Partial<FixedExpense>) => {
    try {
      const { data, error } = await supabase
        .from('finance_fixed_expenses' as any)
        .insert([expense])
        .select()
        .single();

      if (error) throw error;

      toast.success('Gasto fijo creado exitosamente');
      await fetchFixedExpenses();
      return data;
    } catch (error: any) {
      console.error('Error creating fixed expense:', error);
      toast.error('Error al crear gasto fijo');
      throw error;
    }
  };

  const updateFixedExpense = async (id: string, expense: Partial<FixedExpense>) => {
    try {
      const { error } = await supabase
        .from('finance_fixed_expenses' as any)
        .update(expense)
        .eq('id', id);

      if (error) throw error;

      toast.success('Gasto fijo actualizado');
      await fetchFixedExpenses();
    } catch (error: any) {
      console.error('Error updating fixed expense:', error);
      toast.error('Error al actualizar gasto fijo');
      throw error;
    }
  };

  const deleteFixedExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_fixed_expenses' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Gasto fijo eliminado');
      await fetchFixedExpenses();
    } catch (error: any) {
      console.error('Error deleting fixed expense:', error);
      toast.error('Error al eliminar gasto fijo');
      throw error;
    }
  };

  useEffect(() => {
    fetchFixedExpenses();
  }, []);

  return {
    fixedExpenses,
    loading,
    createFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    refetch: fetchFixedExpenses
  };
}
