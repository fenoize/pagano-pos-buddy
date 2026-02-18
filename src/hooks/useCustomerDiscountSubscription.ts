import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountSubscriptionRules {
  discountPercent: number;
  minSpend: number | null;
  maxSpend: number | null;
  affectsDelivery: boolean;
  deliveryMode: string | null;
  deliveryAmount: number | null;
  applyToDiscounted: boolean;
  applyToComboChildren: boolean;
  scopeMode: string;
  allowedCategories: string[];
  excludedCategories: string[];
  allowedProducts: string[];
  excludedProducts: string[];
}

/**
 * Hook ligero que retorna el % de descuento activo de un cliente (0 si no tiene)
 * y las reglas asociadas para validar en checkout.
 */
export function useCustomerDiscountSubscription(customerId?: string | null) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [rules, setRules] = useState<DiscountSubscriptionRules | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setDiscountPercent(0);
      setRules(null);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer_discount_subscriptions')
          .select('discount_percent, start_date, end_date, usage_limit, usage_count, min_spend, max_spend, affects_delivery, delivery_mode, delivery_amount, apply_to_discounted, apply_to_combo_children, scope_mode, allowed_categories, excluded_categories, allowed_products, excluded_products')
          .eq('customer_id', customerId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setDiscountPercent(0);
          setRules(null);
          return;
        }

        // Validate date range
        const today = new Date().toISOString().split('T')[0];
        if (data.start_date && today < data.start_date) {
          setDiscountPercent(0);
          setRules(null);
          return;
        }
        if (data.end_date && today > data.end_date) {
          setDiscountPercent(0);
          setRules(null);
          return;
        }

        // Validate usage limit
        if (data.usage_limit !== null && data.usage_count >= data.usage_limit) {
          setDiscountPercent(0);
          setRules(null);
          return;
        }

        setDiscountPercent(data.discount_percent);
        setRules({
          discountPercent: data.discount_percent,
          minSpend: (data as any).min_spend ?? null,
          maxSpend: (data as any).max_spend ?? null,
          affectsDelivery: (data as any).affects_delivery ?? false,
          deliveryMode: (data as any).delivery_mode ?? null,
          deliveryAmount: (data as any).delivery_amount ?? null,
          applyToDiscounted: (data as any).apply_to_discounted ?? true,
          applyToComboChildren: (data as any).apply_to_combo_children ?? true,
          scopeMode: (data as any).scope_mode ?? 'all',
          allowedCategories: (data as any).allowed_categories ?? [],
          excludedCategories: (data as any).excluded_categories ?? [],
          allowedProducts: (data as any).allowed_products ?? [],
          excludedProducts: (data as any).excluded_products ?? [],
        });
      } catch (error) {
        console.error('Error fetching discount subscription:', error);
        setDiscountPercent(0);
        setRules(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [customerId]);

  return { discountPercent, rules, loading };
}
