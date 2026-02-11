import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Smartphone, Loader2 } from 'lucide-react';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

interface DeliveryCollectPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  amountToCollect: number;
  onConfirm: (method: string, cashGiven?: number) => void;
  isProcessing: boolean;
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote className="w-5 h-5" />,
  pos: <CreditCard className="w-5 h-5" />,
  transferencia: <Smartphone className="w-5 h-5" />,
};

export const DeliveryCollectPaymentModal: React.FC<DeliveryCollectPaymentModalProps> = ({
  open,
  onOpenChange,
  orderNumber,
  amountToCollect,
  onConfirm,
  isProcessing
}) => {
  const { paymentMethods } = usePaymentMethods();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cashGiven, setCashGiven] = useState('');

  // Filter: only active, real-sale methods, exclude pendiente/runas
  const availableMethods = paymentMethods.filter(
    m => m.is_active && !['pendiente', 'runas'].includes(m.name.toLowerCase())
  );

  const isEfectivo = selectedMethod?.toLowerCase() === 'efectivo';
  const cashGivenNum = parseInt(cashGiven) || 0;
  const change = isEfectivo ? Math.max(0, cashGivenNum - amountToCollect) : 0;
  const canConfirm = selectedMethod && (!isEfectivo || cashGivenNum >= amountToCollect);

  useEffect(() => {
    if (!open) {
      setSelectedMethod(null);
      setCashGiven('');
    }
  }, [open]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price);

  const handleConfirm = () => {
    if (!selectedMethod) return;
    onConfirm(selectedMethod, isEfectivo ? cashGivenNum : undefined);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Cobrar pedido #{orderNumber}</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Cómo pagó el cliente? Monto a cobrar: <strong className="text-foreground">{formatPrice(amountToCollect)}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Method selection */}
          <div className="grid grid-cols-2 gap-2">
            {availableMethods.map(m => (
              <Button
                key={m.id}
                variant={selectedMethod === m.name ? 'default' : 'outline'}
                className="flex items-center gap-2 h-12"
                onClick={() => { setSelectedMethod(m.name); setCashGiven(''); }}
              >
                {METHOD_ICONS[m.name.toLowerCase()] || <CreditCard className="w-5 h-5" />}
                {m.display_name}
              </Button>
            ))}
          </div>

          {/* Cash given field */}
          {isEfectivo && (
            <div className="space-y-2">
              <Label>¿Con cuánto paga el cliente?</Label>
              <Input
                type="number"
                placeholder="Ej: 10000"
                value={cashGiven}
                onChange={e => setCashGiven(e.target.value)}
                autoFocus
              />
              {cashGivenNum > 0 && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-sm font-medium">Vuelto:</span>
                  <Badge variant={change > 0 ? 'destructive' : 'secondary'} className="text-base">
                    {formatPrice(change)}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isProcessing}
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
            ) : (
              'Confirmar cobro y entrega'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
