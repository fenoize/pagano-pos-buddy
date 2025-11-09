import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatRunas, formatCurrency } from '@/lib/utils';
import { calculateRequiredRunas, calculateRunasDiscount } from '@/lib/integrations/runasPayment';

interface RunasPaymentSectionProps {
  customerRunas: number;
  subtotal: number;
  onRunasCalculated?: (runas: number, discount: number) => void;
}

export function RunasPaymentSection({ 
  customerRunas, 
  subtotal,
  onRunasCalculated 
}: RunasPaymentSectionProps) {
  const [requiredRunas, setRequiredRunas] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculatePayment = async () => {
      setLoading(true);
      try {
        const required = await calculateRequiredRunas(subtotal);
        const discount = await calculateRunasDiscount(required);
        
        setRequiredRunas(required);
        setDiscountAmount(discount);
        
        if (onRunasCalculated) {
          onRunasCalculated(required, discount);
        }
      } catch (error) {
        console.error('Error calculating runas payment:', error);
      } finally {
        setLoading(false);
      }
    };

    calculatePayment();
  }, [subtotal, onRunasCalculated]);

  const hasSufficientRunas = customerRunas >= requiredRunas;
  const remainingRunas = customerRunas - requiredRunas;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-primary" />
          Pago con Runas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saldo actual */}
        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Tu saldo actual:</span>
          <span className="font-bold text-lg">{formatRunas(customerRunas)}</span>
        </div>

        {/* Costo del pedido */}
        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Costo del pedido:</span>
          <span className="font-bold">{formatCurrency(subtotal)}</span>
        </div>

        {/* Runas necesarias */}
        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">Runas necesarias:</span>
          <span className="font-bold text-lg text-primary">{formatRunas(requiredRunas)}</span>
        </div>

        {/* Equivalencia */}
        <div className="text-xs text-center text-muted-foreground">
          {formatRunas(requiredRunas)} = {formatCurrency(discountAmount)}
        </div>

        {/* Estado de validación */}
        {hasSufficientRunas ? (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <div className="space-y-1">
                <p className="font-semibold">✓ Tienes suficientes runas</p>
                <p className="text-sm">
                  Te quedarán <span className="font-bold">{formatRunas(remainingRunas)}</span> después del pago
                </p>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">No tienes suficientes runas</p>
                <p className="text-sm">
                  Te faltan <span className="font-bold">{formatRunas(requiredRunas - customerRunas)}</span> para completar el pago
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Info adicional */}
        <div className="pt-2 text-xs text-muted-foreground space-y-1">
          <p>• Tu pedido será confirmado inmediatamente</p>
          <p>• Las runas se descontarán de tu saldo al confirmar</p>
          <p>• Podrás retirar tu pedido cuando esté listo</p>
        </div>
      </CardContent>
    </Card>
  );
}
