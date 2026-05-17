import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
export interface ExpenseCategory {
  id: string;
  name: string;
  include_vat: boolean;
  requires_document: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useFinanceExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_expense_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories((data || []) as unknown as ExpenseCategory[]);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      toast.error('Error', { description: 'No se pudieron cargar las categorías de egresos' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name: string): Promise<boolean> => {
    try {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.display_order), 0);
      
      const { error } = await supabase
        .from('finance_expense_categories')
        .insert({
          name,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      toast({
        title: 'Categoría creada',
        description: `La categoría "${name}" se creó correctamente`,
      });
      await fetchCategories();
      return true;
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error('Error', { description: error.message?.includes('unique') 
          ? 'Ya existe una categoría con ese nombre'
          : 'No se pudo crear la categoría' });
      return false;
    }
  };

  const updateCategory = async (id: string, updates: Partial<ExpenseCategory>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('finance_expense_categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Categoría actualizada', { description: 'Los cambios se guardaron correctamente' });
      await fetchCategories();
      return true;
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error('Error', { description: error.message?.includes('unique')
          ? 'Ya existe una categoría con ese nombre'
          : 'No se pudo actualizar la categoría' });
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('finance_expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Categoría eliminada', { description: 'La categoría se eliminó correctamente' });
      await fetchCategories();
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error', { description: 'No se pudo eliminar la categoría' });
      return false;
    }
  };

  // Get active categories as string array (for compatibility with existing code)
  const activeCategories = categories.filter(c => c.is_active);
  const categoryNames = activeCategories.map(c => c.name);

  return {
    categories,
    activeCategories,
    categoryNames,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
