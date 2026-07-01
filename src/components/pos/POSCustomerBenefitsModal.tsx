import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Ticket, Truck, AlertCircle } from 'lucide-react';
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
  /** Cupón actualmente elegible para el carrito (auto-aplicado). */
  coupon?: Coupon | null;
  estimatedDiscount?: number;
  /** Todos los cupones de alianza vigentes del cliente (elegibles o no en este carrito). */
  allianceCoupons?: Coupon[];
  freeDelivery?: AllianceFreeDeliveryBenefit | null;
  onChange?: () => void;
}

function formatCouponAmount(c: Coupon): string {
  if (c.type === 'percent') return `${c.amount}% de descuento`;
  if (c.type === 'fixed_cart') return `${formatCurrency(c.amount)} en el total`;
  if (c.type === 'fixed_product') return `${formatCurrency(c.amount)} por producto`;
  return `${c.amount}`;
}

export function POSCustomerBenefitsModal({
  open,
  onOpenChange,
  coupon,
  estimatedDiscount = 0,
  allianceCoupons = [],
  freeDelivery,
  onChange,
}: Props) {
  const [deliveryOn, setDeliveryOn] = useState(true);
  // Track toggle state per coupon id
  const [couponStates, setCouponStates] = useState<Record<string, boolean>>({});

  // Merge current eligible coupon into the list so it always appears
  const merged: Coupon[] = (() => {
    const list = [...allianceCoupons];
    if (coupon && !list.some((c) => c.id === coupon.id)) list.unshift(coupon);
    return list;
  })();

  useEffect(() => {
    if (freeDelivery?.benefitId) setDeliveryOn(isPosAllianceFreeDeliveryEnabled(freeDelivery.benefitId));
    const initial: Record<string, boolean> = {};
    for (const c of merged) initial[c.id] = isPosAllianceCouponEnabled(c.id);
    setCouponStates(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, freeDelivery?.benefitId, coupon?.id, allianceCoupons.map((c) => c.id).join(',')]);

  const handleCouponToggle = (id: string, v: boolean) => {
    setCouponStates((s) => ({ ...s, [id]: v }));
    setPosAllianceCouponEnabled(id, v);
    onChange?.();
  };
  const handleDeliveryToggle = (v: boolean) => {
    setDeliveryOn(v);
    if (freeDelivery?.benefitId) setPosAllianceFreeDeliveryEnabled(freeDelivery.benefitId, v);
    onChange?.();
  };

  const hasAny = merged.length > 0 || Boolean(freeDelivery);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Beneficios del cliente
          </DialogTitle>
          <DialogDescription>
            Este cliente tiene beneficios activos por alianza. Los elegibles se aplican automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {merged.map((c) => {
            const isEligible = coupon?.id === c.id;
            const enabled = couponStates[c.id] ?? true;
            return (
              <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Ticket className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{c.code}</span>
                      <Badge variant="secondary">Alianza</Badge>
                      {isEligible ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Aplicable ahora</Badge>
                      ) : (
                        <Badge variant="outline">No aplicable al carrito actual</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">{formatCouponAmount(c)}</p>
                    {c.description && (
                      <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                    )}
                    {c.min_spend ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo de compra: {formatCurrency(c.min_spend)}
                      </p>
                    ) : null}
                    {isEligible && estimatedDiscount > 0 && (
                      <p className="text-sm font-medium text-emerald-600 mt-1">
                        Ahorro estimado: {formatCurrency(estimatedDiscount)}
                      </p>
                    )}
                    {!isEligible && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>
                          Revisa que el carrito incluya productos/categorías válidas, cumpla el mínimo
                          de compra y esté dentro del horario permitido.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {isEligible ? 'Aplicar este descuento' : 'Habilitar cuando sea elegible'}
                  </span>
                  <Switch checked={enabled} onCheckedChange={(v) => handleCouponToggle(c.id, v)} />
                </div>
              </div>
            );
          })}

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

          {!hasAny && (
            <p className="text-sm text-muted-foreground">Sin beneficios elegibles para este cliente.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
