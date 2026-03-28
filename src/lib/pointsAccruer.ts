import { supabase } from '@/integrations/supabase/client';

interface PointsResult {
  points: number;
  new_balance: number;
  leveled_up: boolean;
  new_level: string;
}

/**
 * Acumula puntos para un pedido (1 punto por $100 de venta real).
 * También evalúa y aplica subidas de nivel automáticas.
 */
export async function accruePointsForOrder(
  customerId: string,
  orderId: string
): Promise<PointsResult | null> {
  try {
    const { data, error } = await supabase.rpc('accrue_points_for_order', {
      p_customer_id: customerId,
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error accruing points:', error);
      return null;
    }

    return data as unknown as PointsResult;
  } catch (err) {
    console.error('Error accruing points:', err);
    return null;
  }
}
