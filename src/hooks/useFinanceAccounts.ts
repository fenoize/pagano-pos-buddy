import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinanceAccount } from '@/types/finance';
import { toast } from '@/hooks/use-toast';

export function useFinanceAccounts() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccounts((data || []) as FinanceAccount[]);
    } catch (error) {
      console.error('Error fetching finance accounts:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cuentas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (data: Omit<FinanceAccount, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { error } = await supabase
        .from('finance_accounts')
        .insert([data]);

      if (error) throw error;

      toast({
        title: 'Cuenta creada',
        description: 'La cuenta se ha creado exitosamente',
      });

      await fetchAccounts();
      return true;
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la cuenta',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateAccount = async (id: string, data: Partial<FinanceAccount>) => {
    try {
      const { error } = await supabase
        .from('finance_accounts')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cuenta actualizada',
        description: 'Los cambios se han guardado correctamente',
      });

      await fetchAccounts();
      return true;
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cuenta',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleActiveAccount = async (id: string, currentStatus: boolean) => {
    return await updateAccount(id, { is_active: !currentStatus });
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts,
    loading,
    createAccount,
    updateAccount,
    toggleActiveAccount,
    refetch: fetchAccounts,
  };
}
