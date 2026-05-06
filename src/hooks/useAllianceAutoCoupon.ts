import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateCouponEligibility } from '@/lib/couponValidation';
import type { Coupon, CouponApplication, OrderItem } from '@/types';
import type { CartItem } from '@/contexts/CartContext';

interface UseAllianceAutoCouponArgs {
  customerId?: string;
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  enabled: boolean;
}

interface AutoCouponResult {
  coupon: Coupon;
  application: CouponApplication;
}

/**
 * Carga los cupones de alianza vigentes del cliente y selecciona automáticamente
 * el mejor que califique para el carrito actual.
 */
export const useAllianceAutoCoupon = ({
  customerId,
  cartItems,
  subtotal,
  deliveryFee,
  enabled,
}: UseAllianceAutoCouponArgs) => {
  const [allianceCoupons, setAllianceCoupons] = useState<Coupon[]>([]);
  const [best, setBest] = useState<AutoCouponResult | null>(null);

  // Cargar cupones de alianza del cliente
  useEffect(() => {
    if (!customerId) {
      setAllianceCoupons([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_customer_alliance_coupons', {
        _customer_id: customerId,
      });
      if (error || !data || cancelled) {
        if (error) console.error('Error loading alliance coupons:', error);
        return;
      }

      const couponIds = (data as Array<{ coupon_id: string }>).map((r) => r.coupon_id);
      if (couponIds.length === 0) {
        setAllianceCoupons([]);
        return;
      }

      const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .in('id', couponIds)
        .eq('is_active', true);

      if (cancelled || !coupons) return;

      // Cargar scope (categorías/productos/variantes)
      const fullCoupons = await Promise.all(
        coupons.map(async (c) => {
          const [
            { data: allowedCats },
            { data: excludedCats },
            { data: allowedProds },
            { data: excludedProds },
            { data: allowedVars },
            { data: excludedVars },
          ] = await Promise.all([
            supabase.from('coupon_allowed_categories').select('category_id').eq('coupon_id', c.id),
            supabase.from('coupon_excluded_categories').select('category_id').eq('coupon_id', c.id),
            supabase.from('coupon_allowed_products').select('product_id').eq('coupon_id', c.id),
            supabase.from('coupon_excluded_products').select('product_id').eq('coupon_id', c.id),
            supabase.from('coupon_allowed_variants').select('category_variant_id').eq('coupon_id', c.id),
            supabase.from('coupon_excluded_variants').select('category_variant_id').eq('coupon_id', c.id),
          ]);
          return {
            ...c,
            time_windows: c.time_windows as Record<string, string[]> | undefined,
            allowed_categories: allowedCats?.map((r) => r.category_id) || [],
            excluded_categories: excludedCats?.map((r) => r.category_id) || [],
            allowed_products: allowedProds?.map((r) => r.product_id) || [],
            excluded_products: excludedProds?.map((r) => r.product_id) || [],
            allowed_variants: allowedVars?.map((r) => r.category_variant_id) || [],
            excluded_variants: excludedVars?.map((r) => r.category_variant_id) || [],
          } as Coupon;
        })
      );

      if (!cancelled) setAllianceCoupons(fullCoupons);
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Evaluar cuál cupón califica para el carrito actual
  useEffect(() => {
    if (!enabled || !customerId || allianceCoupons.length === 0 || cartItems.length === 0) {
      setBest(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const orderItems: OrderItem[] = cartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        categoryId: item.categoryId || '',
        basePrice: item.basePrice,
        quantity: item.quantity,
        extras:
          item.extras ||
          item.selectedExtras?.map((e) => ({
            key: e.id,
            label: e.name,
            price: e.price,
            quantity: 1,
          })) ||
          [],
        modifiers: item.modifiers || item.selectedModifiers || [],
        selectedVariant: item.selectedVariant,
        variant_name: item.variant_name,
        category_variant_id: item.category_variant_id,
        size: item.size,
        priceKind: item.priceKind,
      })) as any;

      let winner: AutoCouponResult | null = null;

      for (const coupon of allianceCoupons) {
        const result = await validateCouponEligibility(
          coupon,
          orderItems,
          subtotal,
          { id: customerId },
          undefined,
          [],
          deliveryFee
        );
        if (!result.valid || !result.preview) continue;

        const totalDiscount =
          (result.preview.discount_products || 0) + (result.preview.discount_delivery || 0);
        const currentBest = winner
          ? (winner.application.discount_products || 0) +
            (winner.application.discount_delivery || 0)
          : -1;

        if (totalDiscount > currentBest) {
          winner = {
            coupon,
            application: {
              id: crypto.randomUUID(),
              order_id: '',
              coupon_id: coupon.id,
              applied_at: new Date().toISOString(),
              discount_products: result.preview.discount_products || 0,
              discount_delivery: result.preview.discount_delivery || 0,
              payload: {
                coupon_code: coupon.code,
                coupon_type: coupon.type,
                affected_lines: [],
                delivery_original: deliveryFee,
                delivery_final: deliveryFee - (result.preview.discount_delivery || 0),
                
              },
            },
          };
        }
      }

      if (!cancelled) setBest(winner);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, customerId, allianceCoupons, cartItems, subtotal, deliveryFee]);

  return { allianceCoupons, autoCoupon: best };
};
