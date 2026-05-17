import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinanceExpense } from '@/types/finance';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

const BUCKET_NAME = 'finance-documents';

export function useFinanceExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_expenses')
        .select(`
          *,
          account:finance_accounts(id, name, type),
          recurring:finance_recurring_expenses(id, name, category)
        `)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as FinanceExpense[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Error', { description: 'No se pudieron cargar los egresos' });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, expenseId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `expenses/${expenseId}_${timestamp}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Obtener URL firmada (el bucket es privado)
      const { data: urlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(data.path, 31536000); // 1 año

      return urlData?.signedUrl || null;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error', { description: 'No se pudo subir el documento' });
      return null;
    }
  };

  const createExpense = async (
    data: Omit<FinanceExpense, 'id' | 'created_at' | 'updated_at' | 'registered_by' | 'account'>,
    file?: File
  ) => {
    try {
      if (!user?.id) {
        toast.error('Error', { description: 'Usuario no autenticado' });
        return false;
      }

      // 1. Crear el egreso SIN attachment_url
      const { data: newExpense, error: insertError } = await supabase
        .from('finance_expenses')
        .insert([{ ...data, attachment_url: null, registered_by: user.id }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Si hay archivo, subirlo y actualizar el registro
      if (file && newExpense) {
        const attachmentUrl = await uploadDocument(file, newExpense.id);
        
        if (attachmentUrl) {
          const { error: updateError } = await supabase
            .from('finance_expenses')
            .update({ attachment_url: attachmentUrl })
            .eq('id', newExpense.id);

          if (updateError) {
            console.error('Error updating attachment_url:', updateError);
          }
        }
      }

      toast.success('Egreso registrado', { description: 'El egreso se ha registrado exitosamente' });

      await fetchExpenses();
      return true;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Error', { description: 'No se pudo registrar el egreso' });
      return false;
    }
  };

  const updateExpense = async (
    id: string,
    data: Partial<FinanceExpense>,
    file?: File
  ) => {
    try {
      // Si hay nuevo archivo, subirlo primero
      if (file) {
        const attachmentUrl = await uploadDocument(file, id);
        if (attachmentUrl) {
          data.attachment_url = attachmentUrl;
        }
      }

      const { error } = await supabase
        .from('finance_expenses')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast.success('Egreso actualizado', { description: 'Los cambios se han guardado correctamente' });

      await fetchExpenses();
      return true;
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Error', { description: 'No se pudo actualizar el egreso' });
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

      toast.success('Egreso eliminado', { description: 'El egreso se ha eliminado correctamente' });

      await fetchExpenses();
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Error', { description: 'No se pudo eliminar el egreso' });
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
