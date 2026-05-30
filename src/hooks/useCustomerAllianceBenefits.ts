import { useEffect, useState } from 'react';
import { useAllianceAutoCoupon } from '@/hooks/useAllianceAutoCoupon';
import {
  getPendingAllianceFreeDeliveryBenefit,
  isAllianceFreeDeliveryEligible,
  type AllianceFreeDeliveryBenefit,
} from '@/lib/allianceAttribution';
import type { CartItem } from '@/contexts/CartContext';

interface Args {
  customerId?: string;
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee?: number;
  enabled?: boolean;
}

/**
 * Detecta TODOS los beneficios económicos de alianza disponibles para un cliente:
 * - mejor cupón de alianza elegible para el carrito actual
 * - beneficio de delivery gratis pendiente
 *
 * No aplica nada por sí mismo; sólo expone los datos. Quien lo use decide si
 * los aplica (respetando las preferencias en localStorage / sessionStorage).
 */
export const useCustomerAllianceBenefits = ({
  customerId,
  cartItems,
  subtotal,
  deliveryFee = 0,
  enabled = true,
}: Args) => {
  const { autoCoupon, allianceCoupons } = useAllianceAutoCoupon({
    customerId,
    cartItems,
    subtotal,
    deliveryFee,
    enabled: enabled && Boolean(customerId),
  });

  const [freeDelivery, setFreeDelivery] = useState<AllianceFreeDeliveryBenefit | null>(null);

  useEffect(() => {
    if (!customerId || !enabled) {
      setFreeDelivery(null);
      return;
    }
    let cancelled = false;
    getPendingAllianceFreeDeliveryBenefit(customerId).then((b) => {
      if (!cancelled) setFreeDelivery(b);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, enabled]);

  const freeDeliveryEligible = freeDelivery
    ? isAllianceFreeDeliveryEligible(freeDelivery, subtotal)
    : false;

  const hasAny = Boolean(autoCoupon) || Boolean(freeDelivery);

  return { autoCoupon, freeDelivery, freeDeliveryEligible, hasAny };
};
