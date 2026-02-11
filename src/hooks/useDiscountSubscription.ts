import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DiscountSubscription {
  id: string;
  customer_id: string;
  discount_percent: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDiscountSubscription(customerId?: string) {
  const [subscription, setSubscription] = useState<DiscountSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSubscription = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_discount_subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data as DiscountSubscription | null);
    } catch (error) {
      console.error('Error fetching discount subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const createSubscription = async (
    discountPercent: number,
    notes?: string,
    startDate?: string | null,
    endDate?: string | null
  ): Promise<boolean> => {
    if (!customerId) return false;
    try {
      const { error } = await supabase
        .from('customer_discount_subscriptions')
        .insert({
          customer_id: customerId,
          discount_percent: discountPercent,
          is_active: true,
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: endDate || null,
          notes: notes || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Error", description: "Este cliente ya tiene una suscripción de descuento", variant: "destructive" });
        } else {
          throw error;
        }
        return false;
      }

      toast({ title: "Éxito", description: `Descuento del ${discountPercent}% creado` });
      await fetchSubscription();
      return true;
    } catch (error) {
      console.error('Error creating discount subscription:', error);
      toast({ title: "Error", description: "Error al crear la suscripción", variant: "destructive" });
      return false;
    }
  };

  const updateSubscription = async (
    id: string,
    updates: Partial<Pick<DiscountSubscription, 'discount_percent' | 'is_active' | 'notes' | 'start_date' | 'end_date'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('customer_discount_subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Éxito", description: "Suscripción actualizada" });
      await fetchSubscription();
      return true;
    } catch (error) {
      console.error('Error updating discount subscription:', error);
      toast({ title: "Error", description: "Error al actualizar", variant: "destructive" });
      return false;
    }
  };

  const deleteSubscription = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('customer_discount_subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Éxito", description: "Suscripción eliminada" });
      setSubscription(null);
      return true;
    } catch (error) {
      console.error('Error deleting discount subscription:', error);
      toast({ title: "Error", description: "Error al eliminar", variant: "destructive" });
      return false;
    }
  };

  return {
    subscription,
    loading,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    refetch: fetchSubscription
  };
}
