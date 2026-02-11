import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook ligero que retorna el % de descuento activo de un cliente (0 si no tiene).
 * Valida is_active y rango de fechas.
 */
export function useCustomerDiscountSubscription(customerId?: string | null) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setDiscountPercent(0);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer_discount_subscriptions')
          .select('discount_percent, start_date, end_date')
          .eq('customer_id', customerId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setDiscountPercent(0);
          return;
        }

        // Validate date range
        const today = new Date().toISOString().split('T')[0];
        if (data.start_date && today < data.start_date) {
          setDiscountPercent(0);
          return;
        }
        if (data.end_date && today > data.end_date) {
          setDiscountPercent(0);
          return;
        }

        setDiscountPercent(data.discount_percent);
      } catch (error) {
        console.error('Error fetching discount subscription:', error);
        setDiscountPercent(0);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [customerId]);

  return { discountPercent, loading };
}
