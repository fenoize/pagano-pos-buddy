import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Ticket, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Coupon } from '@/types';
import {
  isAllianceCouponEnabled,
  setAllianceCouponEnabled,
  isAllianceFreeDeliveryEnabled,
  setAllianceFreeDeliveryEnabled,
} from '@/lib/allianceBenefitPrefs';
import type { AllianceFreeDeliveryBenefit } from '@/lib/allianceAttribution';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: Coupon | null;
  estimatedDiscount?: number;
  freeDelivery?: AllianceFreeDeliveryBenefit | null;
  onChange?: () => void;
}

export function AllianceBenefitModal({ open, onOpenChange, coupon, estimatedDiscount = 0, freeDelivery, onChange }: Props) {
  const [couponOn, setCouponOn] = useState(true);
  const [deliveryOn, setDeliveryOn] = useState(true);

  useEffect(() => {
    if (coupon?.id) setCouponOn(isAllianceCouponEnabled(coupon.id));
    if (freeDelivery?.benefitId) setDeliveryOn(isAllianceFreeDeliveryEnabled(freeDelivery.benefitId));
  }, [coupon?.id, freeDelivery?.benefitId, open]);

  const handleCouponToggle = (v: boolean) => {
    setCouponOn(v);
    if (coupon?.id) setAllianceCouponEnabled(coupon.id, v);
    onChange?.();
  };
  const handleDeliveryToggle = (v: boolean) => {
    setDeliveryOn(v);
    if (freeDelivery?.benefitId) setAllianceFreeDeliveryEnabled(freeDelivery.benefitId, v);
    onChange?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="customer-app max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tus beneficios por alianza
          </DialogTitle>
          <DialogDescription>
            Estos descuentos están disponibles para tu cuenta. Puedes activarlos o desactivarlos cuando quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {coupon && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Ticket className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{coupon.code}</span>
                    <Badge variant="secondary">Alianza</Badge>
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-muted-foreground mt-1">{coupon.description}</p>
                  )}
                  {estimatedDiscount > 0 && (
                    <p className="text-sm font-medium text-emerald-500 mt-1">
                      Ahorro estimado: {formatCurrency(estimatedDiscount)}
                    </p>
                  )}
                  {coupon.min_order_amount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Pedido mínimo: {formatCurrency(coupon.min_order_amount)}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Usar este descuento en mi pedido</span>
                <Switch checked={couponOn} onCheckedChange={handleCouponToggle} />
              </div>
            </div>
          )}

          {freeDelivery && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">Delivery gratis</span>
                    <Badge variant="secondary">Alianza</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {freeDelivery.freeFirstOrder
                      ? 'Tu primer pedido tiene envío gratis a cualquier dirección.'
                      : `Envío gratis en direcciones autorizadas (${freeDelivery.addresses.length}).`}
                  </p>
                  {freeDelivery.minAmount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Compra mínima: {formatCurrency(freeDelivery.minAmount)}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Usar envío gratis en mi pedido</span>
                <Switch checked={deliveryOn} onCheckedChange={handleDeliveryToggle} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
