import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer, OrderItem, FulfillmentType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import CustomerForm from '@/components/pos/CustomerForm';
import ProductGrid from '@/components/pos/ProductGrid';
import Cart from '@/components/pos/Cart';
import PaymentModal from '@/components/pos/PaymentModal';

export default function NewSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Partial<Customer>>({});
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderTiming, setOrderTiming] = useState('after_payment');
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const { toast } = useToast();

  const total = cartItems.reduce((sum, item) => {
    const itemTotal = (item.basePrice + item.extras.reduce((extraSum, extra) => extraSum + extra.price, 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, configRes] = await Promise.all([
        supabase.from('products').select('*').eq('active', true),
        supabase.from('config').select('*').eq('key', 'order_timing').single()
      ]);

      if (productsRes.error) throw productsRes.error;
      setProducts(productsRes.data as Product[]);
      
      if (configRes.data) {
        setOrderTiming(configRes.data.value as string);
      }
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

  const addToCart = (product: Product, variant: string, priceType: 'combo' | 'only') => {
    const basePrice = (product.prices as any)[priceType][variant];
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      size: variant as any,
      priceKind: priceType,
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

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Error",
        description: "Agrega productos al carrito",
        variant: "destructive"
      });
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (paymentData: any) => {
    try {
      // Create or update customer if needed
      let customerId = customer.id;
      if (!customerId && (customer.name || customer.phone)) {
        // Check if customer exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .or(`phone.eq.${customer.phone},rut.eq.${customer.rut}`)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Update existing customer
          await supabase
            .from('customers')
            .update({
              name: customer.name,
              apellido: customer.apellido,
              direccion: customer.direccion,
              numeracion: customer.numeracion,
              comuna: customer.comuna,
              email: customer.email,
              phone: customer.phone,
              rut: customer.rut
            })
            .eq('id', customerId);
        } else {
          // Create new customer
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: customer.name,
              apellido: customer.apellido,
              direccion: customer.direccion,
              numeracion: customer.numeracion,
              comuna: customer.comuna,
              email: customer.email,
              phone: customer.phone,
              rut: customer.rut
            })
            .select()
            .single();

          if (customerError) throw customerError;
          customerId = customerData.id;
        }
      }

      const finalFulfillment = orderTiming === 'after_payment' ? paymentData.fulfillment : fulfillment;

      // Create order
      const orderData = {
        customer_id: customerId,
        fulfillment: finalFulfillment,
        items: cartItems as any,
        subtotal: total,
        delivery_fee: 0,
        discount: 0,
        total,
        payment_efectivo: paymentData.method === 'Efectivo' ? paymentData.amount : 0,
        payment_mp: paymentData.method === 'Transferencia' ? paymentData.amount : 0,
        payment_pos: paymentData.method === 'POS' ? paymentData.amount : 0,
        payment_method: paymentData.method.toLowerCase() as any,
        status: 'Pendiente' as const,
        notes: JSON.stringify({
          paymentDetails: paymentData,
          customerInfo: customer
        })
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      toast({
        title: "Éxito",
        description: "Pedido procesado y enviado a cocina"
      });

      // Reset form
      setCartItems([]);
      setCustomer({});
      setFulfillment('retiro');
      setShowPaymentModal(false);

    } catch (error) {
      console.error('Error processing order:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pedido",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nueva Venta</h1>
      
      {/* Customer Form */}
      <CustomerForm 
        customer={customer} 
        onCustomerChange={setCustomer} 
      />

      {/* Fulfillment - Show before payment if configured */}
      {orderTiming === 'before_payment' && (
        <Card>
          <CardHeader>
            <CardTitle>Modalidad de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <select 
              value={fulfillment} 
              onChange={(e) => setFulfillment(e.target.value as FulfillmentType)}
              className="w-full p-2 border rounded"
            >
              <option value="retiro">Retiro en Local</option>
              <option value="delivery">Delivery</option>
              <option value="servir">Para Servir</option>
            </select>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Products and Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2">
          <ProductGrid 
            products={products} 
            onAddToCart={addToCart} 
          />
        </div>

        {/* Cart */}
        <div>
          <Cart 
            items={cartItems}
            onUpdateQuantity={updateItemQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        customer={customer}
        items={cartItems}
        total={total}
      />
    </div>
  );
}