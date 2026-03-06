import { supabase } from '@/integrations/supabase/client';

/**
 * Cached set of payment method names that do NOT count as real sales.
 * Methods like 'runas', 'colacion', 'pendiente' etc. that should be excluded
 * from revenue/sales calculations.
 */
let cachedNonRealMethods: Set<string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getNonRealSaleMethods(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedNonRealMethods && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedNonRealMethods;
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .select('name')
    .eq('counts_as_real_sale', false);

  if (error) {
    console.error('Error fetching non-real payment methods:', error);
    // Fallback: at minimum, runas and pendiente are never real sales
    return new Set(['runas', 'pendiente']);
  }

  cachedNonRealMethods = new Set((data || []).map(m => m.name));
  // Always include runas and pendiente as safety net
  cachedNonRealMethods.add('runas');
  cachedNonRealMethods.add('pendiente');
  cacheTimestamp = now;

  return cachedNonRealMethods;
}

/**
 * Check if a given payment_method value represents a real sale.
 * For 'mixto' orders, returns true (partial real sale).
 */
export function isRealSaleMethod(method: string, nonRealMethods: Set<string>): boolean {
  if (method === 'mixto') return true; // mixto needs per-field analysis
  return !nonRealMethods.has(method);
}

/**
 * Calculate real revenue from an order, excluding non-real payment amounts.
 * For non-real single-method orders: returns 0.
 * For mixto/real orders: returns total minus payment_runas.
 */
export function getOrderRealRevenue(
  order: { total: number; payment_method: string; payment_runas?: number | null },
  nonRealMethods: Set<string>
): number {
  if (order.payment_method === 'mixto') {
    // For mixto, subtract runas (the only non-real method with a dedicated column)
    return order.total - (order.payment_runas || 0);
  }
  if (nonRealMethods.has(order.payment_method)) {
    return 0;
  }
  return order.total;
}
