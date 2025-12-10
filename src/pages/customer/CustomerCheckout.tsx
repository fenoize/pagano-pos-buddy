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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShoppingCart, CreditCard, AlertCircle, Store, Loader2, Coins, Truck, MapPin, Plus } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { StoreStatusBanner } from '@/components/customer/StoreStatusBanner';
import { RunasPaymentSection } from '@/components/customer/RunasPaymentSection';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { useCustomerOrderSettings } from '@/hooks/useCustomerOrderSettings';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { createRunasOrder } from '@/lib/integrations/runasPayment';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CustomerAddress {
  id: string;
  alias: string;
  calle: string;
  numero: string;
  depto?: string | null;
  comuna: string;
  comuna_id?: string | null;
  observaciones?: string | null;
  is_default: boolean;
}

export default function CustomerCheckout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const { loading: mpLoading, createPaymentAndRedirect } = useMercadoPago();
  const { settings: paymentSettings, loading: settingsLoading } = useCustomerOrderSettings();
  const { zones: deliveryZones, loading: zonesLoading } = useDeliveryZones();
  
  const [notes, setNotes] = useState('');
  const [canOrder, setCanOrder] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mercadopago' | 'runas'>('mercadopago');
  const [runasToUse, setRunasToUse] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [processingRunas, setProcessingRunas] = useState(false);

  // Fulfillment state
  const [fulfillmentType, setFulfillmentType] = useState<'retiro' | 'delivery'>('retiro');
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const mpEnabled = paymentSettings?.mp_payment_enabled ?? true;
  const runasEnabled = paymentSettings?.runas_payment_enabled ?? true;
  const deliveryEnabled = paymentSettings?.app_delivery_enabled ?? false;
  const pickupEnabled = paymentSettings?.app_pickup_enabled ?? true;

  // Fetch customer addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!customer?.id) return;
      
      setLoadingAddresses(true);
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCustomerAddresses(data || []);
        
        // Auto-select default address
        const defaultAddr = data?.find(a => a.is_default);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };

    if (deliveryEnabled) {
      fetchAddresses();
    }
  }, [customer?.id, deliveryEnabled]);

  // Calculate delivery fee when address changes
  useEffect(() => {
    if (fulfillmentType !== 'delivery' || !selectedAddressId) {
      setDeliveryFee(0);
      return;
    }

    // For now, use a simple fee from the first active zone
    // In production, you'd calculate based on the address location
    const activeZones = deliveryZones.filter(z => z.active);
    if (activeZones.length > 0) {
      const zone = activeZones[0];
      if (zone.calculation_mode === 'fixed') {
        setDeliveryFee(zone.delivery_fee);
      } else {
        // For distance-based, use min_fee as fallback
        setDeliveryFee(zone.min_fee || zone.delivery_fee);
      }
    }
  }, [fulfillmentType, selectedAddressId, deliveryZones]);

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

    // Si solo hay un tipo de entrega, seleccionarlo
    if (deliveryEnabled && !pickupEnabled) {
      setFulfillmentType('delivery');
    } else if (!deliveryEnabled && pickupEnabled) {
      setFulfillmentType('retiro');
    }
  }, [items.length, mpEnabled, runasEnabled, deliveryEnabled, pickupEnabled, navigate]);

  const selectedAddress = customerAddresses.find(a => a.id === selectedAddressId);
  const total = subtotal + (fulfillmentType === 'delivery' ? deliveryFee : 0);

  const handlePayment = async () => {
    if (!canOrder) {
      toast.error('No se pueden procesar pedidos en este momento');
      return;
    }

    if (!customer) {
      toast.error('Debes iniciar sesión para continuar');
      return;
    }

    // Validate delivery address
    if (fulfillmentType === 'delivery' && !selectedAddressId) {
      toast.error('Debes seleccionar una dirección de entrega');
      return;
    }

    try {
      const deliveryAddress = selectedAddress 
        ? `${selectedAddress.calle} ${selectedAddress.numero}${selectedAddress.depto ? `, ${selectedAddress.depto}` : ''}, ${selectedAddress.comuna}`
        : undefined;

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
          notes: notes || 'Pedido desde app cliente',
          fulfillment: fulfillmentType,
          delivery_address: deliveryAddress,
          delivery_fee: fulfillmentType === 'delivery' ? deliveryFee : 0
        });
      } else if (selectedPaymentMethod === 'runas') {
        // Flujo de Runas (sin redirección)
        setProcessingRunas(true);
        
        const result = await createRunasOrder({
          items,
          customer_id: customer.id,
          notes: notes || 'Pedido pagado con runas',
          runas_to_use: runasToUse,
          discount_amount: discountAmount,
          fulfillment: fulfillmentType,
          delivery_address: deliveryAddress,
          delivery_fee: fulfillmentType === 'delivery' ? deliveryFee : 0
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
  const loading = mpLoading || processingRunas || settingsLoading || zonesLoading;

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
            {deliveryEnabled && pickupEnabled ? (
              <Tabs value={fulfillmentType} onValueChange={(v) => setFulfillmentType(v as 'retiro' | 'delivery')}>
                <TabsList className="w-full">
                  <TabsTrigger value="retiro" className="flex-1 gap-2">
                    <Store className="h-4 w-4" />
                    Retiro en local
                  </TabsTrigger>
                  <TabsTrigger value="delivery" className="flex-1 gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="retiro" className="mt-4">
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
                </TabsContent>

                <TabsContent value="delivery" className="mt-4 space-y-4">
                  {loadingAddresses ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : customerAddresses.length === 0 ? (
                    <div className="text-center py-6 space-y-3">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">No tienes direcciones guardadas</p>
                      <Button variant="outline" onClick={() => navigate('/addresses')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar dirección
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Label>Selecciona una dirección de entrega</Label>
                      <RadioGroup
                        value={selectedAddressId || ''}
                        onValueChange={setSelectedAddressId}
                        className="space-y-3"
                      >
                        {customerAddresses.map((address) => (
                          <div
                            key={address.id}
                            className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              selectedAddressId === address.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedAddressId(address.id)}
                          >
                            <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor={address.id} className="font-semibold cursor-pointer">
                                {address.alias}
                                {address.is_default && (
                                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                    Principal
                                  </span>
                                )}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {address.calle} {address.numero}
                                {address.depto && `, ${address.depto}`}
                              </p>
                              <p className="text-sm text-muted-foreground">{address.comuna}</p>
                              {address.observaciones && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  {address.observaciones}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                      
                      <Button variant="ghost" size="sm" onClick={() => navigate('/addresses')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar nueva dirección
                      </Button>

                      {deliveryFee > 0 && (
                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <span className="text-sm">Costo de delivery</span>
                          <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            ) : deliveryEnabled ? (
              // Only delivery available
              <div className="space-y-4">
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Delivery</h3>
                      <p className="text-sm text-muted-foreground">
                        Recibe tu pedido en la dirección que elijas
                      </p>
                    </div>
                  </div>
                </div>
                
                {loadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : customerAddresses.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No tienes direcciones guardadas</p>
                    <Button variant="outline" onClick={() => navigate('/addresses')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar dirección
                    </Button>
                  </div>
                ) : (
                  <>
                    <Label>Selecciona una dirección de entrega</Label>
                    <RadioGroup
                      value={selectedAddressId || ''}
                      onValueChange={setSelectedAddressId}
                      className="space-y-3"
                    >
                      {customerAddresses.map((address) => (
                        <div
                          key={address.id}
                          className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === address.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedAddressId(address.id)}
                        >
                          <RadioGroupItem value={address.id} id={`only-${address.id}`} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={`only-${address.id}`} className="font-semibold cursor-pointer">
                              {address.alias}
                              {address.is_default && (
                                <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                  Principal
                                </span>
                              )}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {address.calle} {address.numero}
                              {address.depto && `, ${address.depto}`}
                            </p>
                            <p className="text-sm text-muted-foreground">{address.comuna}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    {deliveryFee > 0 && (
                      <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                        <span className="text-sm">Costo de delivery</span>
                        <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Only pickup available (default)
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
            )}
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
                          subtotal={total}
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
                        subtotal={total}
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
            
            {fulfillmentType === 'delivery' && deliveryFee > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              </>
            )}
            
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Button
          size="lg"
          className="w-full"
          onClick={handlePayment}
          disabled={
            loading || 
            !canOrder || 
            (selectedPaymentMethod === 'runas' && !canPayWithRunas) ||
            (fulfillmentType === 'delivery' && !selectedAddressId)
          }
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
