import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer, OrderItem, Extra, FulfillmentType, PaymentMethod } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, ShoppingCart, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function NewSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Partial<Customer>>({});
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    number: '',
    comuna: '',
    distance: 0
  });
  const [payments, setPayments] = useState({
    efectivo: 0,
    mp: 0,
    pos: 0
  });
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const deliveryFee = fulfillment === 'delivery' ? 1500 + (deliveryInfo.distance * 500) : 0;
  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal = (item.basePrice + item.extras.reduce((extraSum, extra) => extraSum + extra.price, 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);
  const total = subtotal + deliveryFee - discount;
  const totalPayments = payments.efectivo + payments.mp + payments.pos;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, configRes] = await Promise.all([
        supabase.from('products').select('*').eq('active', true),
        supabase.from('config').select('*').eq('key', 'extras').single()
      ]);

      if (productsRes.error) throw productsRes.error;
      if (configRes.error) throw configRes.error;

      setProducts(productsRes.data as Product[]);
      setExtras(configRes.data.value as unknown as Extra[]);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, size: 'simple' | 'doble' | 'triple', priceKind: 'combo' | 'only') => {
    const basePrice = product.prices[priceKind][size];
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      size,
      priceKind,
      basePrice,
      quantity: 1,
      extras: [],
      modifiers: [],
      notes: ''
    };

    setCartItems(prev => [...prev, newItem]);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter((_, i) => i !== index));
    } else {
      setCartItems(prev => prev.map((item, i) => 
        i === index ? { ...item, quantity } : item
      ));
    }
  };

  const addExtraToItem = (itemIndex: number, extra: Extra) => {
    setCartItems(prev => prev.map((item, i) => 
      i === itemIndex 
        ? { ...item, extras: [...item.extras, { key: extra.key, label: extra.label, price: extra.price }] }
        : item
    ));
  };

  const removeExtraFromItem = (itemIndex: number, extraIndex: number) => {
    setCartItems(prev => prev.map((item, i) => 
      i === itemIndex 
        ? { ...item, extras: item.extras.filter((_, ei) => ei !== extraIndex) }
        : item
    ));
  };

  const getPaymentMethod = (): PaymentMethod => {
    const hasEfectivo = payments.efectivo > 0;
    const hasMP = payments.mp > 0;
    const hasPOS = payments.pos > 0;
    
    const activePayments = [hasEfectivo, hasMP, hasPOS].filter(Boolean).length;
    
    if (activePayments > 1) return 'mixto';
    if (hasEfectivo) return 'efectivo';
    if (hasMP) return 'mp';
    if (hasPOS) return 'pos';
    return 'efectivo';
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Error",
        description: "Agrega productos al carrito",
        variant: "destructive"
      });
      return;
    }

    if (totalPayments !== total) {
      toast({
        title: "Error", 
        description: `El total de pagos ($${totalPayments.toLocaleString()}) debe ser igual al total ($${total.toLocaleString()})`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Create customer if needed
      let customerId = null;
      if (customer.name || customer.phone) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customer.name,
            phone: customer.phone,
            rut: customer.rut,
            email: customer.email
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = customerData.id;
      }

      // Create order
      const orderData = {
        customer_id: customerId,
        fulfillment,
        delivery_address: fulfillment === 'delivery' ? deliveryInfo.address : null,
        delivery_number: fulfillment === 'delivery' ? deliveryInfo.number : null,
        delivery_comuna: fulfillment === 'delivery' ? deliveryInfo.comuna : null,
        delivery_distance: fulfillment === 'delivery' ? deliveryInfo.distance : null,
        items: cartItems as any,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        payment_efectivo: payments.efectivo,
        payment_mp: payments.mp,
        payment_pos: payments.pos,
        payment_method: getPaymentMethod(),
        status: 'Pendiente' as const,
        notes: notes || null
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      toast({
        title: "Éxito",
        description: "Venta registrada correctamente"
      });

      // Reset form
      setCartItems([]);
      setCustomer({});
      setFulfillment('retiro');
      setDeliveryInfo({ address: '', number: '', comuna: '', distance: 0 });
      setPayments({ efectivo: 0, mp: 0, pos: 0 });
      setDiscount(0);
      setNotes('');

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la venta",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-bold">Nueva Venta</h1>
        
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Combo</h4>
                    <div className="space-y-2">
                      {(['simple', 'doble', 'triple'] as const).map((size) => (
                        <Button
                          key={size}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                          onClick={() => addToCart(product, size, 'combo')}
                        >
                          <span className="capitalize">{size}</span>
                          <span>{formatPrice(product.prices.combo[size])}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Solo</h4>
                    <div className="space-y-2">
                      {(['simple', 'doble', 'triple'] as const).map((size) => (
                        <Button
                          key={size}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                          onClick={() => addToCart(product, size, 'only')}
                        >
                          <span className="capitalize">{size}</span>
                          <span>{formatPrice(product.prices.only[size])}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart and Order Details */}
      <div className="space-y-6">
        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrito ({cartItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-medium">{item.productName}</h5>
                    <p className="text-sm text-muted-foreground">
                      {item.size} • {item.priceKind === 'combo' ? 'Combo' : 'Solo'}
                    </p>
                  </div>
                  <Badge variant="secondary">{formatPrice(item.basePrice)}</Badge>
                </div>

                {/* Extras */}
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2 flex-wrap">
                    {extras.map((extra) => (
                      <Button
                        key={extra.key}
                        variant="outline"
                        size="sm"
                        onClick={() => addExtraToItem(index, extra)}
                      >
                        +{extra.label} ({formatPrice(extra.price)})
                      </Button>
                    ))}
                  </div>
                  {item.extras.map((extra, extraIndex) => (
                    <div key={extraIndex} className="flex justify-between items-center text-sm">
                      <span>{extra.label}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatPrice(extra.price)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExtraFromItem(index, extraIndex)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="font-medium">
                    {formatPrice((item.basePrice + item.extras.reduce((sum, e) => sum + e.price, 0)) * item.quantity)}
                  </div>
                </div>
              </div>
            ))}

            {cartItems.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Carrito vacío
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={customer.name || ''}
                onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={customer.phone || ''}
                onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Teléfono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment */}
        <Card>
          <CardHeader>
            <CardTitle>Modalidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={fulfillment} onValueChange={(value: FulfillmentType) => setFulfillment(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retiro">Retiro en Local</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>

            {fulfillment === 'delivery' && (
              <div className="space-y-3">
                <div>
                  <Label>Dirección</Label>
                  <Input
                    value={deliveryInfo.address}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Dirección de entrega"
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={deliveryInfo.number}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, number: e.target.value }))}
                    placeholder="Número"
                  />
                </div>
                <div>
                  <Label>Comuna</Label>
                  <Input
                    value={deliveryInfo.comuna}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, comuna: e.target.value }))}
                    placeholder="Comuna"
                  />
                </div>
                <div>
                  <Label>Distancia (km)</Label>
                  <Input
                    type="number"
                    value={deliveryInfo.distance}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, distance: Number(e.target.value) }))}
                    placeholder="Distancia en km"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader>
            <CardTitle>Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Efectivo</Label>
                <Input
                  type="number"
                  value={payments.efectivo}
                  onChange={(e) => setPayments(prev => ({ ...prev, efectivo: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Mercado Pago</Label>
                <Input
                  type="number"
                  value={payments.mp}
                  onChange={(e) => setPayments(prev => ({ ...prev, mp: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>POS</Label>
                <Input
                  type="number"
                  value={payments.pos}
                  onChange={(e) => setPayments(prev => ({ ...prev, pos: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Descuento</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder="Descuento"
              />
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Pagos:</span>
                <span className={totalPayments !== total ? 'text-red-600' : ''}>
                  {formatPrice(totalPayments)}
                </span>
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales"
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleSubmit}
              disabled={cartItems.length === 0 || totalPayments !== total}
            >
              Confirmar Venta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}