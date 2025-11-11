import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, CreditCard, AlertCircle, Store, Loader2, Coins } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { StoreStatusBanner } from '@/components/customer/StoreStatusBanner';
import { RunasPaymentSection } from '@/components/customer/RunasPaymentSection';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { useCustomerOrderSettings } from '@/hooks/useCustomerOrderSettings';
import { createRunasOrder } from '@/lib/integrations/runasPayment';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function CustomerCheckout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const { loading: mpLoading, createPaymentAndRedirect } = useMercadoPago();
  const { settings: paymentSettings, loading: settingsLoading } = useCustomerOrderSettings();
  const [notes, setNotes] = useState('');
  const [canOrder, setCanOrder] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mercadopago' | 'runas'>('mercadopago');
  const [runasToUse, setRunasToUse] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [processingRunas, setProcessingRunas] = useState(false);

  const mpEnabled = paymentSettings?.mp_payment_enabled ?? true;
  const runasEnabled = paymentSettings?.runas_payment_enabled ?? true;

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    // Si solo hay un método habilitado, seleccionarlo automáticamente
    if (mpEnabled && !runasEnabled) {
      setSelectedPaymentMethod('mercadopago');
    } else if (!mpEnabled && runasEnabled) {
      setSelectedPaymentMethod('runas');
    }
  }, [items.length, mpEnabled, runasEnabled, navigate]);

  const handlePayment = async () => {
    if (!canOrder) {
      toast.error('No se pueden procesar pedidos en este momento');
      return;
    }

    if (!customer) {
      toast.error('Debes iniciar sesión para continuar');
      return;
    }

    try {
      if (selectedPaymentMethod === 'mercadopago') {
        // Flujo de MercadoPago (redirección)
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
          customer_id: customer.id,
          notes: notes || 'Pedido desde app cliente'
        });
      } else if (selectedPaymentMethod === 'runas') {
        // Flujo de Runas (sin redirección)
        setProcessingRunas(true);
        
        const result = await createRunasOrder({
          items,
          customer_id: customer.id,
          notes: notes || 'Pedido pagado con runas',
          runas_to_use: runasToUse,
          discount_amount: discountAmount
        });

        if (result.success) {
          clearCart();
          toast.success('¡Pedido confirmado exitosamente!');
          navigate(`/order-success?order=${result.order_number}`);
        }
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Error al procesar el pago');
    } finally {
      setProcessingRunas(false);
    }
  };

  const handleRunasCalculated = (runas: number, discount: number) => {
    setRunasToUse(runas);
    setDiscountAmount(discount);
  };

  const canPayWithRunas = customer && (customer.cantidad_runas || 0) >= runasToUse;
  const loading = mpLoading || processingRunas || settingsLoading;

  return (
    <div className="customer-app min-h-screen pb-20 bg-background">
      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Finalizar Pedido
        </h1>

        {/* Store Status Banner */}
        <StoreStatusBanner onStatusChange={setCanOrder} />

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

        {/* Payment Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            {!mpEnabled && !runasEnabled ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No hay métodos de pago disponibles en este momento
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {(mpEnabled && runasEnabled) ? (
                  <Tabs value={selectedPaymentMethod} onValueChange={(v) => setSelectedPaymentMethod(v as 'mercadopago' | 'runas')}>
                    <TabsList className="w-full flex flex-row">
                      <TabsTrigger value="mercadopago" className="flex-1 gap-2">
                        <CreditCard className="h-4 w-4" />
                        MercadoPago
                      </TabsTrigger>
                      <TabsTrigger value="runas" className="flex-1 gap-2">
                        <Coins className="h-4 w-4" />
                        Runas
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="mercadopago" className="mt-4">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>• Paga con tarjetas de crédito/débito</p>
                        <p>• Proceso seguro a través de MercadoPago</p>
                        <p>• Serás redirigido para completar el pago</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="runas" className="mt-4">
                      {customer && (
                        <RunasPaymentSection
                          customerRunas={customer.cantidad_runas || 0}
                          subtotal={subtotal}
                          onRunasCalculated={handleRunasCalculated}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <>
                    {mpEnabled && (
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p className="font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          MercadoPago
                        </p>
                        <p>• Paga con tarjetas de crédito/débito</p>
                        <p>• Proceso seguro a través de MercadoPago</p>
                      </div>
                    )}
                    {runasEnabled && customer && (
                      <RunasPaymentSection
                        customerRunas={customer.cantidad_runas || 0}
                        subtotal={subtotal}
                        onRunasCalculated={handleRunasCalculated}
                      />
                    )}
                  </>
                )}
              </>
            )}
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
          disabled={loading || !canOrder || (selectedPaymentMethod === 'runas' && !canPayWithRunas)}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              {selectedPaymentMethod === 'mercadopago' ? (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar con MercadoPago
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Confirmar Pedido con Runas
                </>
              )}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {selectedPaymentMethod === 'mercadopago' 
            ? 'Al confirmar serás redirigido a MercadoPago para completar el pago de forma segura'
            : 'Al confirmar, las runas se descontarán de tu saldo y tu pedido será procesado inmediatamente'}
        </p>
      </div>
      <CustomerBottomNav />
    </div>
  );
}
