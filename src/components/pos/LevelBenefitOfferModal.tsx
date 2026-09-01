import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Ticket } from 'lucide-react';
import { LevelIcon } from '@/components/fidelizacion/LevelIcon';
import { formatCurrency } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  benefit: {
    coupon_code?: string;
    coupon_type?: string;
    coupon_amount?: number;
    label?: string;
    level_name?: string;
    level_icon?: string;
    level_color?: string;
  };
  customerName?: string;
  hasExistingCoupon: boolean;
  existingCouponCode?: string;
  onApply: (couponCode: string) => void;
  onSkip: () => void;
}

function formatAmount(type?: string, amount?: number): string {
  const value = Number(amount || 0);
  if (type === 'percent') return `${value}% de descuento`;
  if (type === 'fixed_cart') return `${formatCurrency(value)} en el total`;
  if (type === 'fixed_product') return `${formatCurrency(value)} por producto`;
  return `${value}`;
}

export function LevelBenefitOfferModal({
  open,
  onOpenChange,
  benefit,
  customerName,
  hasExistingCoupon,
  existingCouponCode,
  onApply,
  onSkip,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LevelIcon icon={benefit.level_icon} color={benefit.level_color} className="h-5 w-5" />
            Beneficio de nivel {benefit.level_name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1 flex-wrap">
            <span>{customerName || 'Este cliente'} es {benefit.level_name}</span>
            <LevelIcon icon={benefit.level_icon} color={benefit.level_color} className="h-4 w-4" />
            <span>. Tiene un beneficio disponible:</span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <Ticket className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{benefit.coupon_code}</span>
                <Badge variant="secondary">{formatAmount(benefit.coupon_type, benefit.coupon_amount)}</Badge>
              </div>
              {benefit.label && <p className="text-sm text-muted-foreground">{benefit.label}</p>}
            </div>
          </div>
        </div>

        {hasExistingCoupon && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Ya hay un cupón aplicado{existingCouponCode ? ` (código: ${existingCouponCode})` : ''}. Si aplicas el
              beneficio de nivel, se reemplazará el cupón actual.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            No usar
          </Button>
          <Button onClick={() => benefit.coupon_code && onApply(benefit.coupon_code)}>
            Aplicar beneficio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
