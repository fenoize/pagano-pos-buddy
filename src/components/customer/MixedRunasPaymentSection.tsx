import { useEffect, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Minus, Plus } from 'lucide-react';
import { formatCurrency, formatRunas } from '@/lib/utils';
import { useRunasConfig } from '@/hooks/useRunasConfig';

interface MixedRunasPaymentSectionProps {
  customerRunas: number;
  total: number;
  runasToUse: number;
  onChange: (runas: number, discount: number) => void;
}

/**
 * Permite abonar parte del pedido con runas y pagar el saldo con MercadoPago.
 * Siempre deja un saldo mayor a $0 para poder cobrar por MercadoPago.
 */
export function MixedRunasPaymentSection({
  customerRunas,
  total,
  runasToUse,
  onChange,
}: MixedRunasPaymentSectionProps) {
  const { runaRedemptionValue, loading } = useRunasConfig();

  const maxRunas = useMemo(() => {
    if (!runaRedemptionValue || total <= 0) return 0;
    const maxByTotal = Math.max(0, Math.ceil(total / runaRedemptionValue) - 1);
    return Math.max(0, Math.min(customerRunas, maxByTotal));
  }, [customerRunas, total, runaRedemptionValue]);

  // Mantener el valor dentro de los límites cuando cambia el total o el saldo
  useEffect(() => {
    const clamped = Math.max(0, Math.min(runasToUse, maxRunas));
    if (clamped !== runasToUse) {
      onChange(clamped, clamped * runaRedemptionValue);
    }
  }, [maxRunas, runasToUse, runaRedemptionValue, onChange]);

  const setRunas = (value: number) => {
    const clamped = Math.max(0, Math.min(Math.floor(value) || 0, maxRunas));
    onChange(clamped, clamped * runaRedemptionValue);
  };

  const discount = runasToUse * runaRedemptionValue;
  const remaining = Math.max(0, total - discount);
  const enabled = runasToUse > 0;

  if (loading) return null;

  if (customerRunas <= 0 || maxRunas <= 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Coins className="h-4 w-4 text-primary" />
            Pagar parte con mis Runas
          </Label>
          <p className="text-xs text-muted-foreground">
            Tienes {formatRunas(customerRunas)} · 1 runa = {formatCurrency(runaRedemptionValue)}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => setRunas(checked ? maxRunas : 0)}
        />
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setRunas(runasToUse - 1)}
              disabled={runasToUse <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={maxRunas}
              value={runasToUse}
              onChange={(e) => setRunas(Number(e.target.value))}
              className="text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setRunas(runasToUse + 1)}
              disabled={runasToUse >= maxRunas}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Máximo utilizable en este pedido: {formatRunas(maxRunas)}
          </p>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abono con runas</span>
              <span className="font-medium text-primary">-{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>A pagar en MercadoPago</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
