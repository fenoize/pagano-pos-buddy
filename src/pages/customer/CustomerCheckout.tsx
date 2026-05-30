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
import { ShoppingCart, CreditCard, AlertCircle, Store, Loader2, Coins, Truck, MapPin, Plus, Ticket } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { StoreStatusBanner } from '@/components/customer/StoreStatusBanner';
import { RunasPaymentSection } from '@/components/customer/RunasPaymentSection';
import { CustomerCouponInput } from '@/components/customer/CustomerCouponInput';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { useCustomerOrderSettings } from '@/hooks/useCustomerOrderSettings';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { useDeliveryGeo, DeliveryZoneWithGeo } from '@/hooks/useDeliveryGeo';
import { createRunasOrder } from '@/lib/integrations/runasPayment';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { getPendingAllianceFreeDeliveryBenefit, normalizeAllianceAddress, trackAlliancePurchase, isAllianceFreeDeliveryEligible, type AllianceFreeDeliveryBenefit } from '@/lib/allianceAttribution';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerDiscountSubscription } from '@/hooks/useCustomerDiscountSubscription';
import { Coupon, CouponApplication } from '@/types';
import { loadCartCoupon, saveCartCoupon, clearCartCoupon } from '@/lib/cartCouponStorage';
import { useAllianceAutoCoupon } from '@/hooks/useAllianceAutoCoupon';
import { isAllianceCouponEnabled, isAllianceFreeDeliveryEnabled } from '@/lib/allianceBenefitPrefs';

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
  latitude?: number | null;
  longitude?: number | null;
}

export default function CustomerCheckout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const { loading: mpLoading, createPaymentAndRedirect } = useMercadoPago();
  const { settings: paymentSettings, loading: settingsLoading } = useCustomerOrderSettings();
  const { zones: deliveryZones, loading: zonesLoading } = useDeliveryZones();
  const { findZoneByCoordinates } = useDeliveryGeo();
  const { discountPercent: subscriptionDiscount, rules: subscriptionRules } = useCustomerDiscountSubscription(customer?.id);
  
  const [notes, setNotes] = useState('');
  const [canOrder, setCanOrder] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mercadopago' | 'runas'>('mercadopago');
  const [runasToUse, setRunasToUse] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [processingRunas, setProcessingRunas] = useState(false);
  const initialStoredCoupon = (() => {
    try { return loadCartCoupon(); } catch { return null; }
  })();
  const [couponApplication, setCouponApplication] = useState<CouponApplication | null>(initialStoredCoupon?.application ?? null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(initialStoredCoupon?.coupon ?? null);
  const [fulfillmentType, setFulfillmentType] = useState<'retiro' | 'delivery'>('retiro');
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [matchedZoneInfo, setMatchedZoneInfo] = useState<{ id: string; name: string } | null>(null);
  const [allianceFreeDeliveryBenefit, setAllianceFreeDeliveryBenefit] = useState<AllianceFreeDeliveryBenefit | null>(null);

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

    // Find selected address with coordinates
    const address = customerAddresses.find(a => a.id === selectedAddressId);
    if (!address?.latitude || !address?.longitude) {
      // No coordinates, use minimum fee as fallback
      const activeZones = deliveryZones.filter(z => z.active);
      const minFee = activeZones.reduce((min, z) => Math.min(min, z.delivery_fee), Infinity);
      setDeliveryFee(minFee === Infinity ? 0 : minFee);
      return;
    }

    // Convert zones to format expected by findZoneByCoordinates
    const activeZonesWithGeo: DeliveryZoneWithGeo[] = deliveryZones
      .filter(z => z.active && z.polygon)
      .map(z => ({
        id: z.id,
        name: z.name,
        delivery_fee: z.delivery_fee,
        polygon: z.polygon,
        price_per_km: z.price_per_km || 0,
        min_fee: z.min_fee || 0,
        calculation_mode: z.calculation_mode || 'fixed',
        active: z.active
      }));

    // Find matching zone based on coordinates
    const matchedZone = findZoneByCoordinates(
      { lat: address.latitude, lng: address.longitude },
      activeZonesWithGeo
    );

    if (matchedZone) {
      setDeliveryFee(matchedZone.delivery_fee);
      setMatchedZoneInfo({ id: matchedZone.id, name: matchedZone.name });
    } else {
      // No zone matched - use fallback or show error
      const fallbackFee = deliveryZones.filter(z => z.active).reduce(
        (max, z) => Math.max(max, z.delivery_fee), 
        0
      );
      setDeliveryFee(fallbackFee);
      setMatchedZoneInfo(null);
    }
  }, [fulfillmentType, selectedAddressId, deliveryZones, customerAddresses, findZoneByCoordinates]);

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

  useEffect(() => {
    if (!customer?.id) return;
    getPendingAllianceFreeDeliveryBenefit(customer.id).then(setAllianceFreeDeliveryBenefit);
  }, [customer?.id]);

  // Auto-aplicar cupón de alianza si el cliente no tiene uno manualmente aplicado
  const { autoCoupon } = useAllianceAutoCoupon({
    customerId: customer?.id,
    cartItems: items,
    subtotal,
    deliveryFee,
    enabled: !appliedCoupon,
  });

  useEffect(() => {
    if (appliedCoupon) return;
    if (autoCoupon) {
      setAppliedCoupon(autoCoupon.coupon);
      setCouponApplication(autoCoupon.application);
      saveCartCoupon(autoCoupon.coupon, autoCoupon.application);
    }
  }, [autoCoupon, appliedCoupon]);

  const selectedAddress = customerAddresses.find(a => a.id === selectedAddressId);
  const selectedDeliveryAddressText = selectedAddress
    ? `${selectedAddress.calle} ${selectedAddress.numero}${selectedAddress.depto ? `, ${selectedAddress.depto}` : ''}, ${selectedAddress.comuna}`
    : '';
  const allianceFreeDeliveryApplies = (() => {
    if (fulfillmentType !== 'delivery' || deliveryFee <= 0 || !allianceFreeDeliveryBenefit) return false;
    if (!isAllianceFreeDeliveryEligible(allianceFreeDeliveryBenefit, subtotal)) return false;
    if (allianceFreeDeliveryBenefit.freeFirstOrder) return true;
    const selectedNormalized = normalizeAllianceAddress(selectedDeliveryAddressText);
    return allianceFreeDeliveryBenefit.addresses.some(address => normalizeAllianceAddress(address) === selectedNormalized);
  })();
  // Apply subscription discount with rules
  const subscriptionDiscountAmount = (() => {
    if (subscriptionDiscount <= 0 || !subscriptionRules) return 0;
    if (subscriptionRules.minSpend && subtotal < subscriptionRules.minSpend) return 0;
    if (subscriptionRules.maxSpend && subtotal > subscriptionRules.maxSpend) return 0;
    // For customer app, apply to full subtotal (scope filtering can be added later with product categories)
    return Math.round(subtotal * subscriptionDiscount / 100);
  })();
  const subscriptionDeliveryDiscount = (() => {
    if (!subscriptionRules?.affectsDelivery || deliveryFee <= 0) return 0;
    if (subscriptionRules.deliveryMode === 'free') return deliveryFee;
    if (subscriptionRules.deliveryMode === 'fixed') return Math.min(deliveryFee, subscriptionRules.deliveryAmount || 0);
    if (subscriptionRules.deliveryMode === 'percent') return Math.round(deliveryFee * (subscriptionRules.deliveryAmount || 0) / 100);
    return 0;
  })();
  const couponDiscountProducts = couponApplication?.discount_products || 0;
  const couponDiscountDelivery = couponApplication?.discount_delivery || 0;
  const allianceDeliveryDiscount = allianceFreeDeliveryApplies ? deliveryFee : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - subscriptionDiscountAmount - couponDiscountProducts);
  const effectiveDeliveryFee = Math.max(0, deliveryFee - subscriptionDeliveryDiscount - couponDiscountDelivery - allianceDeliveryDiscount);
  const total = subtotalAfterDiscount + (fulfillmentType === 'delivery' ? effectiveDeliveryFee : 0);

  const handleCouponApplied = (application: CouponApplication | null, coupon: Coupon | null) => {
    setCouponApplication(application);
    setAppliedCoupon(coupon);
    saveCartCoupon(coupon, application);
  };

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
      const deliveryAddress = selectedDeliveryAddressText || undefined;
      const latestStoredCoupon = loadCartCoupon();
      const couponToSend = latestStoredCoupon?.coupon ?? appliedCoupon;
      const couponApplicationToSend = latestStoredCoupon?.application ?? couponApplication;

      if (selectedPaymentMethod === 'mercadopago') {
        // Flujo de MercadoPago (redirección)
        await createPaymentAndRedirect({
          items: items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            basePrice: item.basePrice,
            // Mapear extras al formato correcto de OrderItem
            extras: item.extras || item.selectedExtras?.map(e => ({
              key: e.id,
              label: e.name,
              price: e.price,
              quantity: 1
            })) || [],
            modifiers: item.modifiers || item.selectedModifiers || [],
            // Variantes
            variant_name: item.variant_name || item.selectedVariant?.name,
            category_variant_id: item.category_variant_id,
            product_variant_option_id: item.product_variant_option_id,
            size: item.size,
            priceKind: item.priceKind,
            // Combos
            is_combo_item: item.is_combo_item,
            combo_selections: item.combo_selections,
            notes: item.notes
          })),
          customer_id: customer.id,
          notes: notes || 'Pedido desde app cliente',
          fulfillment: fulfillmentType,
          delivery_address: deliveryAddress,
          delivery_fee: fulfillmentType === 'delivery' ? effectiveDeliveryFee : 0,
          delivery_zone_id: fulfillmentType === 'delivery' ? matchedZoneInfo?.id : undefined,
          delivery_zone_name: fulfillmentType === 'delivery' ? matchedZoneInfo?.name : undefined,
          delivery_lat: fulfillmentType === 'delivery' ? selectedAddress?.latitude : undefined,
          delivery_lng: fulfillmentType === 'delivery' ? selectedAddress?.longitude : undefined,
          coupon_id: couponToSend?.id || couponApplicationToSend?.coupon_id || null,
          coupon_code: couponToSend?.code || couponApplicationToSend?.payload?.coupon_code || null,
          subscription_discount_amount: subscriptionDiscountAmount,
          subscription_delivery_discount: subscriptionDeliveryDiscount,
          alliance_delivery_discount: allianceDeliveryDiscount
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
          delivery_fee: fulfillmentType === 'delivery' ? effectiveDeliveryFee : 0,
          delivery_zone_id: fulfillmentType === 'delivery' ? matchedZoneInfo?.id : undefined,
          delivery_zone_name: fulfillmentType === 'delivery' ? matchedZoneInfo?.name : undefined,
          delivery_lat: fulfillmentType === 'delivery' ? selectedAddress?.latitude : undefined,
          delivery_lng: fulfillmentType === 'delivery' ? selectedAddress?.longitude : undefined
        });

        if (result.success) {
          // Incrementar usage_count de suscripción de descuento
          if (customer?.id && subscriptionDiscount > 0) {
            try {
              const { data: sub } = await supabase
                .from('customer_discount_subscriptions')
                .select('id, usage_count')
                .eq('customer_id', customer.id)
                .eq('is_active', true)
                .maybeSingle();
              if (sub) {
                await supabase
                  .from('customer_discount_subscriptions')
                  .update({ usage_count: (sub.usage_count || 0) + 1 })
                  .eq('id', sub.id);
              }
            } catch (err) {
              console.error('Error incrementando usage_count:', err);
            }
          }
          await trackAlliancePurchase(customer.id, result.order_id, total, { payment_method: 'runas', alliance_free_delivery_applied: allianceFreeDeliveryApplies, delivery_address: deliveryAddress || null });
          clearCart();
          clearCartCoupon();
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

        {/* Subscription Discount Banner */}
        {subscriptionDiscount > 0 && (
          <Alert className="border-emerald-500/30 bg-emerald-500/10">
            <Coins className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="text-emerald-200 font-medium">
              ¡Tienes un {subscriptionDiscount}% de descuento aplicado automáticamente!
            </AlertDescription>
          </Alert>
        )}

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
                      <Button variant="outline" onClick={() => navigate('/my-addresses')}>
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
                      
                      <Button variant="ghost" size="sm" onClick={() => navigate('/my-addresses')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar nueva dirección
                      </Button>

                      {deliveryFee > 0 && (
                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <span className="text-sm">Costo de delivery</span>
                          <span className="font-semibold">{allianceFreeDeliveryApplies ? 'Gratis por alianza' : formatCurrency(deliveryFee)}</span>
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
                    <Button variant="outline" onClick={() => navigate('/my-addresses')}>
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
                        <span className="font-semibold">{allianceFreeDeliveryApplies ? 'Gratis por alianza' : formatCurrency(deliveryFee)}</span>
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

        {/* Coupon Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Cupón de descuento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerCouponInput
              cartItems={items}
              subtotal={subtotal}
              customerId={customer?.id}
              deliveryFee={fulfillmentType === 'delivery' ? deliveryFee : 0}
              onCouponApplied={handleCouponApplied}
              initialCoupon={appliedCoupon}
              initialApplication={couponApplication}
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

            {(subscriptionDiscountAmount > 0 || couponDiscountProducts > 0) && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {subscriptionDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400 font-medium">
                    <span>Descuento suscripción ({subscriptionDiscount}%)</span>
                    <span>-{formatCurrency(subscriptionDiscountAmount)}</span>
                  </div>
                )}
                {couponDiscountProducts > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400 font-medium">
                    <span>Cupón {appliedCoupon?.code}</span>
                    <span>-{formatCurrency(couponDiscountProducts)}</span>
                  </div>
                )}
              </>
            )}
            
            {fulfillmentType === 'delivery' && deliveryFee > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Delivery</span>
                  <span>
                    {effectiveDeliveryFee < deliveryFee ? (
                      <>
                        <span className="line-through text-muted-foreground mr-2">{formatCurrency(deliveryFee)}</span>
                        {formatCurrency(effectiveDeliveryFee)}
                      </>
                    ) : formatCurrency(deliveryFee)}
                  </span>
                </div>
                {allianceDeliveryDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400 font-medium">
                    <span>Beneficio alianza</span>
                    <span>-{formatCurrency(allianceDeliveryDiscount)}</span>
                  </div>
                )}
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
