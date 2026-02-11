import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CouponStats {
  coupon_id: string;
  total_used: number;
  total_discounted: number;
  total_sales: number;
}

export interface CouponApplicationDetail {
  id: string;
  applied_at: string;
  order_id: string;
  order_number?: number;
  customer_name?: string;
  order_total: number;
  discount_products: number;
  discount_delivery: number;
  total_discount: number;
  commission?: number;
}

export const useCouponStats = () => {
  const [statsMap, setStatsMap] = useState<Record<string, CouponStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchAllStats = useCallback(async (couponIds: string[]) => {
    if (couponIds.length === 0) return;
    try {
      setLoadingStats(true);
      const map: Record<string, CouponStats> = {};

      // Fetch all applications with order totals in one query
      const { data: applications } = await supabase
        .from('coupon_applications')
        .select('coupon_id, discount_products, discount_delivery, order_id')
        .in('coupon_id', couponIds);

      if (!applications || applications.length === 0) {
        couponIds.forEach(id => {
          map[id] = { coupon_id: id, total_used: 0, total_discounted: 0, total_sales: 0 };
        });
        setStatsMap(map);
        return;
      }

      // Get unique order IDs
      const orderIds = [...new Set(applications.map(a => a.order_id))];
      
      // Fetch order totals
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total')
        .in('id', orderIds);

      const orderTotalMap = new Map<string, number>();
      orders?.forEach(o => orderTotalMap.set(o.id, o.total));

      // Aggregate
      couponIds.forEach(id => {
        const apps = applications.filter(a => a.coupon_id === id);
        map[id] = {
          coupon_id: id,
          total_used: apps.length,
          total_discounted: apps.reduce((sum, a) => sum + (a.discount_products || 0) + (a.discount_delivery || 0), 0),
          total_sales: apps.reduce((sum, a) => sum + (orderTotalMap.get(a.order_id) || 0), 0),
        };
      });

      setStatsMap(map);
    } catch (error) {
      console.error('Error fetching coupon stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchCouponDetail = useCallback(async (couponId: string): Promise<CouponApplicationDetail[]> => {
    const { data: applications } = await supabase
      .from('coupon_applications')
      .select('id, applied_at, order_id, discount_products, discount_delivery')
      .eq('coupon_id', couponId)
      .order('applied_at', { ascending: false });

    if (!applications || applications.length === 0) return [];

    const orderIds = applications.map(a => a.order_id);
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total, customer_id')
      .in('id', orderIds);

    const customerIds = [...new Set((orders || []).map(o => o.customer_id).filter(Boolean))] as string[];
    let customerMap = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, nombres, apellidos')
        .in('id', customerIds);
      customers?.forEach(c => {
        const fullName = c.nombres ? `${c.nombres} ${c.apellidos || ''}`.trim() : (c.name || 'Sin nombre');
        customerMap.set(c.id, fullName);
      });
    }

    const orderMap = new Map(orders?.map(o => [o.id, o]) || []);

    return applications.map(app => {
      const order = orderMap.get(app.order_id);
      return {
        id: app.id,
        applied_at: app.applied_at,
        order_id: app.order_id,
        order_number: order?.order_number,
        customer_name: order?.customer_id ? customerMap.get(order.customer_id) : undefined,
        order_total: order?.total || 0,
        discount_products: app.discount_products || 0,
        discount_delivery: app.discount_delivery || 0,
        total_discount: (app.discount_products || 0) + (app.discount_delivery || 0),
      };
    });
  }, []);

  return { statsMap, loadingStats, fetchAllStats, fetchCouponDetail };
};
