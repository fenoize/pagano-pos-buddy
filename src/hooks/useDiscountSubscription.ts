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
  usage_limit: number | null;
  usage_count: number;
  // New rule fields
  min_spend: number | null;
  max_spend: number | null;
  affects_delivery: boolean;
  delivery_mode: string | null;
  delivery_amount: number | null;
  apply_to_discounted: boolean;
  apply_to_combo_children: boolean;
  scope_mode: string;
  allowed_categories: string[];
  excluded_categories: string[];
  allowed_products: string[];
  excluded_products: string[];
}

export type DiscountSubscriptionUpdatable = Partial<Pick<DiscountSubscription,
  'discount_percent' | 'is_active' | 'notes' | 'start_date' | 'end_date' | 'usage_limit' |
  'min_spend' | 'max_spend' | 'affects_delivery' | 'delivery_mode' | 'delivery_amount' |
  'apply_to_discounted' | 'apply_to_combo_children' | 'scope_mode' |
  'allowed_categories' | 'excluded_categories' | 'allowed_products' | 'excluded_products'
>>;

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
      // Ensure arrays default to empty
      const sub = data ? {
        ...data,
        allowed_categories: (data as any).allowed_categories || [],
        excluded_categories: (data as any).excluded_categories || [],
        allowed_products: (data as any).allowed_products || [],
        excluded_products: (data as any).excluded_products || [],
        scope_mode: (data as any).scope_mode || 'all',
        affects_delivery: (data as any).affects_delivery || false,
        apply_to_discounted: (data as any).apply_to_discounted ?? true,
        apply_to_combo_children: (data as any).apply_to_combo_children ?? true,
      } as DiscountSubscription : null;
      setSubscription(sub);
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
    data: {
      discountPercent: number;
      notes?: string;
      startDate?: string | null;
      endDate?: string | null;
      usageLimit?: number | null;
      minSpend?: number | null;
      maxSpend?: number | null;
      affectsDelivery?: boolean;
      deliveryMode?: string | null;
      deliveryAmount?: number | null;
      applyToDiscounted?: boolean;
      applyToComboChildren?: boolean;
      scopeMode?: string;
      allowedCategories?: string[];
      excludedCategories?: string[];
      allowedProducts?: string[];
      excludedProducts?: string[];
    }
  ): Promise<boolean> => {
    if (!customerId) return false;
    try {
      const { error } = await supabase.rpc('create_discount_subscription', {
        p_customer_id: customerId,
        p_discount_percent: data.discountPercent,
        p_is_active: true,
        p_start_date: data.startDate || new Date().toISOString().split('T')[0],
        p_end_date: data.endDate || null,
        p_notes: data.notes || null,
        p_usage_limit: data.usageLimit ?? null,
        p_min_spend: data.minSpend ?? null,
        p_max_spend: data.maxSpend ?? null,
        p_affects_delivery: data.affectsDelivery ?? false,
        p_delivery_mode: data.deliveryMode ?? null,
        p_delivery_amount: data.deliveryAmount ?? null,
        p_apply_to_discounted: data.applyToDiscounted ?? true,
        p_apply_to_combo_children: data.applyToComboChildren ?? true,
        p_scope_mode: data.scopeMode ?? 'all',
        p_allowed_categories: data.allowedCategories ?? [],
        p_excluded_categories: data.excludedCategories ?? [],
        p_allowed_products: data.allowedProducts ?? [],
        p_excluded_products: data.excludedProducts ?? [],
      } as any);

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Error", description: "Este cliente ya tiene una suscripción de descuento", variant: "destructive" });
        } else {
          throw error;
        }
        return false;
      }

      toast({ title: "Éxito", description: `Descuento del ${data.discountPercent}% creado` });
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
    updates: DiscountSubscriptionUpdatable
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('update_discount_subscription', {
        p_id: id,
        p_updates: updates as any,
      } as any);

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
      const { error } = await supabase.rpc('delete_discount_subscription', {
        p_id: id,
      } as any);

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
