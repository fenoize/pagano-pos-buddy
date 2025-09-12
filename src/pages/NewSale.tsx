import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer, OrderItem, FulfillmentType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import CustomerSearchStep from '@/components/pos/CustomerSearchStep';
import FulfillmentStep from '@/components/pos/FulfillmentStep';
import ProductGrid from '@/components/pos/ProductGrid';
import { ProductCustomizationModal } from '@/components/pos/ProductCustomizationModal';
import Cart from '@/components/pos/Cart';
import PaymentModal from '@/components/pos/PaymentModal';
import RunasCalculator from '@/components/pos/RunasCalculator';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function NewSale() {
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Partial<Customer>>({});
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryZone, setDeliveryZone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [runaValue, setRunaValue] = useState(1000);
  const { toast } = useToast();

  const total = cartItems.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((extraSum, extra) => extraSum + (extra.price * (extra.quantity || 1)), 0);
    const itemTotal = (item.basePrice + extrasTotal) * item.quantity;
    return sum + itemTotal;
  }, 0) + deliveryFee;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, runaRes] = await Promise.all([
        supabase.from('products').select('*').eq('active', true),
        supabase.from('config').select('value').eq('key', 'runa_value').single()
      ]);

      if (productsRes.error) throw productsRes.error;
      setProducts(productsRes.data.map(p => ({
        ...p,
        prices: p.prices as any
      })) as Product[]);
      
      if (runaRes.data) {
        setRunaValue(runaRes.data.value as number);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuNext = () => {
    setCurrentStep(2);
  };

  const handleFulfillmentChange = (type: FulfillmentType, fee: number = 0, zone: string = '') => {
    setFulfillment(type);
    setDeliveryFee(fee);
    setDeliveryZone(zone);
  };

  const handleFulfillmentNext = () => {
    setCurrentStep(3);
  };

  const handleCustomerNext = () => {
    handleCheckout();
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowCustomizationModal(true);
  };

  const handleAddToCart = (orderItem: Omit<OrderItem, 'productId' | 'productName'>) => {
    if (!selectedProduct) return;

    const newItem: OrderItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      ...orderItem
    };

    setCartItems(prev => [...prev, newItem]);
    setShowCustomizationModal(false);
    setSelectedProduct(null);

    toast({
      title: "Producto agregado",
      description: `${selectedProduct.name} agregado al carrito`
    });
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
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (paymentData: any) => {
    try {
      // Create or update customer if needed
      let customerId = customer.id;
      if (!customerId && (customer.name || customer.phone)) {
        // Check if customer exists
        const { data: existingCustomers } = await supabase
          .from('customers')
          .select('id')
          .or(`phone.eq.${customer.phone},rut.eq.${customer.rut}`)
          .limit(1);

        if (existingCustomers && existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
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

      // Create order
      const orderData = {
        customer_id: customerId,
        fulfillment: paymentData.fulfillment || fulfillment,
        items: cartItems as any,
        subtotal: total - deliveryFee,
        delivery_fee: deliveryFee,
        discount: 0,
        total,
        payment_efectivo: paymentData.method === 'Efectivo' ? paymentData.amount : 0,
        payment_mp: paymentData.method === 'Transferencia' ? paymentData.amount : 0,
        payment_pos: paymentData.method === 'POS' ? paymentData.amount : 0,
        payment_method: paymentData.method.toLowerCase() as any,
        status: 'Pendiente' as const,
        notes: JSON.stringify({
          paymentDetails: paymentData,
          customerInfo: customer,
          deliveryZone
        })
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Handle runas transactions if applicable
      if (customerId && (paymentData.runas > 0 || total > 0)) {
        const transactions = [];
        
        // Runas spent
        if (paymentData.runas > 0) {
          transactions.push({
            customer_id: customerId,
            order_id: orderResult.id,
            type: 'spent',
            amount: paymentData.runas * runaValue,
            runas: -paymentData.runas
          });
        }

        // Runas earned (from total amount paid)
        const runasEarned = Math.floor(total / runaValue);
        if (runasEarned > 0) {
          transactions.push({
            customer_id: customerId,
            order_id: orderResult.id,
            type: 'earned',
            amount: total,
            runas: runasEarned
          });
        }

        if (transactions.length > 0) {
          await supabase.from('runas_transactions').insert(transactions);
          
          // Update customer runas balance
          const newBalance = (customer.cantidad_runas || 0) - (paymentData.runas || 0) + runasEarned;
          await supabase
            .from('customers')
            .update({ cantidad_runas: Math.max(0, newBalance) })
            .eq('id', customerId);
        }
      }

      toast({
        title: "¡Éxito!",
        description: `Pedido #${orderResult.order_number} creado y enviado a cocina`
      });

      // Reset form
      setCartItems([]);
      setCustomer({});
      setFulfillment('retiro');
      setDeliveryFee(0);
      setDeliveryZone('');
      setCurrentStep(1);
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products Grid */}
            <div className="lg:col-span-2">
              <ProductGrid 
                products={products} 
                onProductClick={handleProductClick}
              />
            </div>

            {/* Cart */}
            <div className="space-y-4">
              <Cart 
                items={cartItems}
                onUpdateQuantity={updateItemQuantity}
                onRemoveItem={removeItem}
                onCheckout={() => {
                  if (cartItems.length === 0) {
                    toast({
                      title: "Error",
                      description: "Agrega productos al carrito",
                      variant: "destructive"
                    });
                    return;
                  }
                  setCurrentStep(2);
                }}
              />
              
              {/* Runas Calculator */}
              {customer.id && (
                <RunasCalculator
                  totalAmount={total}
                  runaValue={runaValue}
                  customerRunas={customer.cantidad_runas}
                />
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <FulfillmentStep
            fulfillment={fulfillment}
            onFulfillmentChange={handleFulfillmentChange}
            onNext={handleFulfillmentNext}
          />
        );
      case 3:
        return (
          <CustomerSearchStep
            customer={customer}
            onCustomerChange={setCustomer}
            onNext={handleCustomerNext}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Menú';
      case 2: return 'Modalidad de Entrega';
      case 3: return 'Cliente';
      default: return 'Nueva Venta';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Nueva Venta - {getStepTitle()}</h1>
        
        {/* Step Navigation */}
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`px-2 py-1 rounded ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              1
            </span>
            <span className={`px-2 py-1 rounded ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              2
            </span>
            <span className={`px-2 py-1 rounded ${currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              3
            </span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {renderStep()}

      {/* Product Customization Modal */}
      {selectedProduct && (
        <ProductCustomizationModal
          isOpen={showCustomizationModal}
          onClose={() => {
            setShowCustomizationModal(false);
            setSelectedProduct(null);
          }}
          onAddToCart={handleAddToCart}
          product={selectedProduct}
        />
      )}

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