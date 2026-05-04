import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { withStaffContext } from '@/lib/dbContext';

export interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  is_active: boolean;
  requires_change: boolean;
  requires_receipt: boolean;
  requires_operation_number: boolean;
  counts_as_real_sale: boolean;
  display_order: number;
  affects_cash_flow?: boolean;
  internal_only?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthContext();

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de pago",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const createPaymentMethod = async (method: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(method)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Método de pago creado correctamente"
      });

      await fetchPaymentMethods();
      return data;
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el método de pago",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Método de pago actualizado correctamente"
      });

      await fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el método de pago",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Método de pago eliminado correctamente"
      });

      await fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el método de pago",
        variant: "destructive"
      });
      throw error;
    }
  };

  const reorderPaymentMethods = async (reorderedMethods: PaymentMethod[]) => {
    // Optimistic update
    setPaymentMethods(reorderedMethods);
    try {
      const ids = reorderedMethods.map((m) => m.id);
      const { error } = await supabase.rpc('reorder_payment_methods', { p_ids: ids });
      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Orden actualizado correctamente"
      });

      await fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error reordering payment methods:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el orden",
        variant: "destructive"
      });
      throw error;
    }
  };

  const restoreDefaults = async () => {
    try {
      // Delete all existing methods
      await supabase.from('payment_methods').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert default methods
      const defaultMethods = [
        { name: 'efectivo', display_name: 'Efectivo', icon: 'Banknote', requires_change: true, counts_as_real_sale: true, display_order: 1, is_active: true },
        { name: 'pos', display_name: 'POS', icon: 'CreditCard', requires_change: false, counts_as_real_sale: true, display_order: 2, is_active: true },
        { name: 'transferencia', display_name: 'Transferencia/MP', icon: 'Smartphone', requires_change: false, counts_as_real_sale: true, display_order: 3, is_active: true },
        { name: 'aplicacion', display_name: 'Aplicación', icon: 'AppWindow', requires_change: false, counts_as_real_sale: true, display_order: 4, is_active: true },
        { name: 'runas', display_name: 'Runas', icon: 'Sparkles', requires_change: false, counts_as_real_sale: false, display_order: 5, is_active: true },
        { name: 'pendiente', display_name: 'Pendiente', icon: 'Clock', requires_change: false, counts_as_real_sale: false, display_order: 6, is_active: true }
      ];

      await supabase.from('payment_methods').insert(defaultMethods);

      toast({
        title: "Éxito",
        description: "Métodos de pago restaurados a valores por defecto"
      });

      await fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error restoring defaults:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron restaurar los valores por defecto",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    paymentMethods,
    loading,
    fetchPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    reorderPaymentMethods,
    restoreDefaults
  };
}
