import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, CreditCard, AlertCircle, Store, Loader2 } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { formatCurrency } from '@/lib/utils';

export default function CustomerCheckout() {
  const navigate = useNavigate();
  const { items, subtotal } = useCart();
  const { customer } = useCustomerAuth();
  const { loading, storeStatus, loadingStatus, fetchStoreStatus, createPaymentAndRedirect } = useMercadoPago();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }
    fetchStoreStatus();
  }, []);

  const handlePayment = async () => {
    if (!storeStatus?.app_orders_enabled || !storeStatus?.accept_app_orders) {
      return;
    }

    try {
      await createPaymentAndRedirect({
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          basePrice: item.basePrice,
          selectedExtras: item.selectedExtras,
          selectedModifiers: item.selectedModifiers,
          selectedVariant: item.selectedVariant
        })),
        customer_id: customer?.id,
        notes: notes || 'Pedido desde app cliente'
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
    }
  };

  const canPlaceOrder = storeStatus?.app_orders_enabled && storeStatus?.accept_app_orders && !loadingStatus;

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Finalizar Pedido
        </h1>

        {/* Store Status Alert */}
        {loadingStatus ? (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Verificando disponibilidad del local...
            </AlertDescription>
          </Alert>
        ) : !canPlaceOrder ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!storeStatus?.app_orders_enabled
                ? 'Los pedidos desde la app están desactivados temporalmente.'
                : 'El local no está recibiendo pedidos en este momento. Por favor intenta más tarde.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Fulfillment Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Tipo de entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Retiro en local</h3>
                  <p className="text-sm text-muted-foreground">
                    Retira tu pedido en el local una vez esté listo
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              El delivery estará disponible próximamente
            </p>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={customer?.name || ''} disabled />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={customer?.phone || 'No registrado'} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notas del pedido (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ej: Sin cebolla, sin pepinillos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.productName}</span>
                  <span className="font-medium">{formatCurrency(item.basePrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Button
          size="lg"
          className="w-full"
          onClick={handlePayment}
          disabled={loading || !canPlaceOrder}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar con MercadoPago
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Al confirmar serás redirigido a MercadoPago para completar el pago de forma segura
        </p>
      </div>
      <CustomerBottomNav />
    </div>
  );
}
