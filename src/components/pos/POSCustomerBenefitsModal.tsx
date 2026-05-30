import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Ticket, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Coupon } from '@/types';
import type { AllianceFreeDeliveryBenefit } from '@/lib/allianceAttribution';
import {
  isPosAllianceCouponEnabled,
  setPosAllianceCouponEnabled,
  isPosAllianceFreeDeliveryEnabled,
  setPosAllianceFreeDeliveryEnabled,
} from '@/lib/allianceBenefitPrefs';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: Coupon | null;
  estimatedDiscount?: number;
  freeDelivery?: AllianceFreeDeliveryBenefit | null;
  onChange?: () => void;
}

export function POSCustomerBenefitsModal({ open, onOpenChange, coupon, estimatedDiscount = 0, freeDelivery, onChange }: Props) {
  const [couponOn, setCouponOn] = useState(true);
  const [deliveryOn, setDeliveryOn] = useState(true);

  useEffect(() => {
    if (coupon?.id) setCouponOn(isPosAllianceCouponEnabled(coupon.id));
    if (freeDelivery?.benefitId) setDeliveryOn(isPosAllianceFreeDeliveryEnabled(freeDelivery.benefitId));
  }, [coupon?.id, freeDelivery?.benefitId, open]);

  const handleCouponToggle = (v: boolean) => {
    setCouponOn(v);
    if (coupon?.id) setPosAllianceCouponEnabled(coupon.id, v);
    onChange?.();
  };
  const handleDeliveryToggle = (v: boolean) => {
    setDeliveryOn(v);
    if (freeDelivery?.benefitId) setPosAllianceFreeDeliveryEnabled(freeDelivery.benefitId, v);
    onChange?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Beneficios del cliente
          </DialogTitle>
          <DialogDescription>
            Este cliente tiene beneficios activos por alianza. Por defecto se aplican al pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {coupon ? (
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
                    <p className="text-sm font-medium text-emerald-600 mt-1">
                      Ahorro estimado: {formatCurrency(estimatedDiscount)}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aplicar este descuento</span>
                <Switch checked={couponOn} onCheckedChange={handleCouponToggle} />
              </div>
            </div>
          ) : null}

          {freeDelivery ? (
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
                      ? 'Primer pedido con envío gratis.'
                      : `Envío gratis en direcciones autorizadas (${freeDelivery.addresses.length}).`}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aplicar envío gratis</span>
                <Switch checked={deliveryOn} onCheckedChange={handleDeliveryToggle} />
              </div>
            </div>
          ) : null}

          {!coupon && !freeDelivery && (
            <p className="text-sm text-muted-foreground">Sin beneficios elegibles para este carrito.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
