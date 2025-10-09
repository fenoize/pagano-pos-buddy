import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer, OrderItem, FulfillmentType, CouponApplication } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCashSession } from '@/hooks/useCashSession';
import { CashSessionStatus } from '@/components/cash/CashSessionStatus';
import { setStaffContext } from '@/lib/dbContext';
import CustomerSearchStep from '@/components/pos/CustomerSearchStep';
import CustomerSearchWidget from '@/components/pos/CustomerSearchWidget';
import FulfillmentStep, { DeliveryData } from '@/components/pos/FulfillmentStep';
import { createDeliverySnapshot } from '@/lib/deliveryHelpers';
import ProductGrid from '@/components/pos/ProductGrid';
import { ProductCustomizationModalEnhanced } from '@/components/pos/ProductCustomizationModalEnhanced';
import Cart from '@/components/pos/Cart';
import PaymentModal from '@/components/pos/PaymentModal';
import RunasCalculator from '@/components/pos/RunasCalculator';
import { CouponManager } from '@/components/pos/CouponManager';
import { CouponModal } from '@/components/pos/CouponModal';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function NewSale() {
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Partial<Customer>>({});
  const [orderName, setOrderName] = useState('');
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryZone, setDeliveryZone] = useState<string>('');
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | undefined>(undefined);
  const [runaValue, setRunaValue] = useState(10000); // Valor para ganar 1 runa (acumulación)
  const [runaRewardValue, setRunaRewardValue] = useState(1300); // Valor de cada runa al canjear
  const [usedRunas, setUsedRunas] = useState(0);
  const [appliedCoupons, setAppliedCoupons] = useState<CouponApplication[]>([]);
  const [manualDiscount, setManualDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number; amount: number } | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  
  // Preloaded customization data
  const [preloadedData, setPreloadedData] = useState<{
    variants: Record<string, any[]>;
    extras: any[];
    modifiers: any[];
  }>({ variants: {}, extras: [], modifiers: [] });
  const { toast } = useToast();
  const { user } = useAuthContext();
  const { canCreateOrders, loading: permissionsLoading } = usePermissions();
  const { hasActiveSession } = useCashSession();

  const subtotal = cartItems.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((extraSum, extra) => extraSum + (extra.price * (extra.quantity || 1)), 0);
    const itemTotal = (item.basePrice + extrasTotal) * item.quantity;
    return sum + itemTotal;
  }, 0);

  const couponDiscount = appliedCoupons.reduce((sum, coupon) => 
    sum + Number(coupon.discount_products) + Number(coupon.discount_delivery), 0);
  const manualDiscountAmount = manualDiscount ? manualDiscount.amount : 0;
  const runasDiscount = usedRunas * runaRewardValue; // Usar valor de canje
  const totalDiscount = couponDiscount + manualDiscountAmount + runasDiscount;
  const totalBeforeDelivery = Math.max(0, subtotal - totalDiscount);
  const total = totalBeforeDelivery + deliveryFee;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, runaConfigRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            product_categories(
              categories(
                id,
                name
              )
            )
          `)
          .eq('active', true),
        supabase.from('config').select('key, value').in('key', ['runa_value', 'runa_reward_value'])
      ]);

      if (productsRes.error) throw productsRes.error;
      setProducts(productsRes.data.map(p => ({
        ...p,
        prices: p.prices as any,
        categories: p.product_categories?.map((pc: any) => pc.categories) || []
      })) as Product[]);
      
      // Cargar ambos valores de runas
      if (runaConfigRes.data) {
        runaConfigRes.data.forEach((config) => {
          if (config.key === 'runa_value') {
            setRunaValue(config.value as number); // Para acumulación
          } else if (config.key === 'runa_reward_value') {
            setRunaRewardValue(config.value as number); // Para canje
          }
        });
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

  const handleDeliveryDataChange = (data: DeliveryData) => {
    setDeliveryData(data);
    if (data.zone) {
      setDeliveryFee(data.zone.delivery_fee);
    }
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

  const handleAddToCart = (orderItem: any) => {
    if (!selectedProduct) return;

    // Check if this is an edit operation
    if (orderItem.editingIndex !== undefined) {
      // Update existing item
      setCartItems(prev => prev.map((item, index) => 
        index === orderItem.editingIndex 
          ? {
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              // Legacy fields (optional)
              size: orderItem.size,
              priceKind: orderItem.priceKind,
              // New variant fields (optional)
              category_variant_id: orderItem.category_variant_id,
              variant_name: orderItem.variant_name,
              product_variant_option_id: orderItem.product_variant_option_id,
              // Combo fields
              is_combo_item: orderItem.is_combo_item,
              combo_selections: orderItem.combo_selections,
              // Common fields
              basePrice: orderItem.basePrice,
              quantity: orderItem.quantity,
              extras: orderItem.extras,
              modifiers: orderItem.modifiers,
              notes: orderItem.notes
            }
          : item
      ));
      
      toast({
        title: "Item actualizado",
        description: `${selectedProduct.name} actualizado en el carrito`
      });
    } else {
      // Add new item
      const newItem: OrderItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        // Legacy fields (optional)
        size: orderItem.size,
        priceKind: orderItem.priceKind,
        // New variant fields (optional)
        category_variant_id: orderItem.category_variant_id,
        variant_name: orderItem.variant_name,
        product_variant_option_id: orderItem.product_variant_option_id,
        // Combo fields
        is_combo_item: orderItem.is_combo_item,
        combo_selections: orderItem.combo_selections,
        // Common fields
        basePrice: orderItem.basePrice,
        quantity: orderItem.quantity,
        extras: orderItem.extras,
        modifiers: orderItem.modifiers,
        notes: orderItem.notes
      };

      setCartItems(prev => [...prev, newItem]);
      
      toast({
        title: "Producto agregado",
        description: `${selectedProduct.name} agregado al carrito`
      });
    }

    setShowCustomizationModal(false);
    setSelectedProduct(null);
    setEditingItemIndex(undefined);
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

  const handleEditItem = (index: number) => {
    const item = cartItems[index];
    // Find the product for this item
    const product = products.find(p => p.id === item.productId);
    if (!product) return;

    setSelectedProduct(product);
    setEditingItemIndex(index);
    setShowCustomizationModal(true);
  };

  const handleCheckout = () => {
    // Check if session is active for Cajero role
    if (user?.role === 'Cajero' && !hasActiveSession()) {
      toast({
        title: "Turno cerrado",
        description: "Debes abrir un turno antes de realizar ventas.",
        variant: "destructive"
      });
      return;
    }
    
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (paymentData: {
    payments: Array<{
      method: string;
      amount: number;
      receiptNumber?: string;
      operationNumber?: string;
      runas?: number;
    }>;
    fulfillment: FulfillmentType;
    notes?: string;
  }) => {
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

        // Validate user is authenticated and has permissions
        if (!user?.id) {
          throw new Error('Usuario no autenticado. Por favor, inicie sesión nuevamente.');
        }

        if (!canCreateOrders) {
          throw new Error('Usuario sin permisos para crear órdenes. Se requiere rol de Cajero o Administrador.');
        }

        const validUserId = user.id;

        // Establecer contexto de staff antes de crear orden
        try {
          await setStaffContext(validUserId);
        } catch (contextError) {
          console.error('Error estableciendo contexto de staff:', contextError);
          throw new Error('Error al establecer contexto de usuario');
        }

        // Calculate payment totals by method
        const totals = paymentData.payments.reduce(
          (acc, payment) => {
            if (payment.method === 'Efectivo') {
              acc.efectivo += payment.amount;
            } else if (payment.method === 'POS') {
              acc.pos += payment.amount;
            } else if (payment.method === 'Transferencia') {
              acc.mp += payment.amount;
            } else if (payment.method === 'Aplicación') {
              acc.aplicacion += payment.amount;
            } else if (payment.method === 'Runas') {
              acc.runas += payment.runas || 0;
            }
            return acc;
          },
          { efectivo: 0, pos: 0, mp: 0, aplicacion: 0, runas: 0 }
        );

        // Determine payment method
        const paymentMethod: 'efectivo' | 'pos' | 'mp' | 'aplicacion' | 'mixto' =
          paymentData.payments.length === 1
            ? (() => {
                const method = paymentData.payments[0].method;
                if (method === 'Efectivo') return 'efectivo';
                if (method === 'POS') return 'pos';
                if (method === 'Transferencia') return 'mp';
                if (method === 'Aplicación') return 'aplicacion';
                return 'efectivo';
              })()
            : 'mixto';

        const orderData = {
          customer_id: customerId,
          created_by_user_id: validUserId,
          nombre_resumen: orderName.trim() || null,
          fulfillment: fulfillment,
          items: cartItems as any,
          subtotal,
          delivery_fee: deliveryFee,
          discount: totalDiscount,
          total,
          payment_efectivo: totals.efectivo,
          payment_mp: totals.mp,
          payment_pos: totals.pos,
          payment_aplicacion: totals.aplicacion,
          payment_runas: totals.runas,
          payment_method: paymentMethod,
          status: 'Pendiente' as const,
          notes: paymentData.notes || null,
          // Delivery snapshot fields
          ...(fulfillment === 'delivery' && deliveryData && {
            delivery_zone_id: deliveryData.zone?.id,
            delivery_zone_name: deliveryData.zone?.name,
            delivery_address: deliveryData.addressLine,
            delivery_number: deliveryData.addressNumber,
            delivery_comuna_id: deliveryData.comunaId,
            delivery_comuna: deliveryData.comunaName,
            delivery_reference: deliveryData.reference,
            delivery_person_id: deliveryData.repartidorId || null,
            delivery_person_name: deliveryData.repartidorName || null
          })
        };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Save address if requested
      if (fulfillment === 'delivery' && deliveryData?.saveAddress && customerId) {
        try {
          await supabase.from('addresses').insert({
            customer_id: customerId,
            calle: deliveryData.addressLine,
            numero: deliveryData.addressNumber,
            comuna_id: deliveryData.comunaId,
            comuna: deliveryData.comunaName,
            observaciones: deliveryData.reference,
            is_default: false
          });
        } catch (error) {
          console.error('Error saving address:', error);
          // Don't fail the order if address save fails
        }
      }

      // Handle runas transactions if applicable
      if (customerId && (totals.runas > 0 || total > 0)) {
        const transactions = [];
        
        // Runas spent (usar valor de canje)
        if (totals.runas > 0) {
          transactions.push({
            customer_id: customerId,
            order_id: orderResult.id,
            type: 'canje',
            amount: totals.runas * runaRewardValue,
            runas: -totals.runas,
            origen: 'POS'
          });
        }

        // Runas earned (from total amount paid, excluding runas discount)
        // Usar valor de canje para calcular el descuento aplicado
        const runasDiscountAmount = totals.runas * runaRewardValue;
        const earnableAmount = total - runasDiscountAmount;
        // Usar valor de acumulación para calcular cuántas runas se ganan
        const runasEarned = Math.floor(earnableAmount / runaValue);
        if (runasEarned > 0) {
          transactions.push({
            customer_id: customerId,
            order_id: orderResult.id,
            type: 'acumulacion',
            amount: earnableAmount,
            runas: runasEarned,
            origen: 'POS'
          });
        }

        if (transactions.length > 0) {
          await supabase.from('runas_transactions').insert(transactions);
          
          // Update customer runas balance
          const newBalance = (customer.cantidad_runas || 0) - totals.runas + runasEarned;
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
      setOrderName('');
      setUsedRunas(0);
      setFulfillment('retiro');
      setDeliveryFee(0);
      setDeliveryZone('');
      setDeliveryData(null);
      setAppliedCoupons([]);
      setManualDiscount(null);
      setCurrentStep(1);
      setShowPaymentModal(false);

    } catch (error) {
      console.error('Error processing order:', error);
      
      let errorMessage = "No se pudo procesar el pedido";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Products Grid */}
              <div className="lg:col-span-2">
                <ProductGrid 
                  products={products} 
                  onProductClick={handleProductClick}
                  onDataPreloaded={setPreloadedData}
                />
              </div>

              {/* Cart */}
              <div className="space-y-4">
                <Cart 
                  items={cartItems}
                  onUpdateQuantity={updateItemQuantity}
                  onRemoveItem={removeItem}
                  onEditItem={handleEditItem}
                  subtotal={subtotal}
                  discount={totalDiscount}
                  deliveryFee={deliveryFee}
                  onCheckout={() => {
                      if (cartItems.length === 0) {
                        toast({
                          title: "Error",
                          description: "Agrega productos al carrito",
                          variant: "destructive"
                        });
                        return;
                      }
                      // Check session before proceeding
                      if (user?.role === 'Cajero' && !hasActiveSession()) {
                        toast({
                          title: "Turno cerrado",
                          description: "Debes abrir un turno antes de realizar ventas.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setCurrentStep(2);
                    }}
                />

                {/* Coupon Manager */}
                <CouponManager 
                  appliedCoupons={appliedCoupons}
                  onAddCoupon={() => setIsCouponModalOpen(true)}
                  onRemoveCoupon={(couponId) => {
                    setAppliedCoupons(prev => prev.filter(c => c.coupon_id !== couponId));
                  }}
                  subtotal={subtotal}
                  cartItems={cartItems}
                  totalCouponDiscount={couponDiscount}
                  manualDiscount={manualDiscount}
                  onManualDiscountChange={setManualDiscount}
                />

                {/* Customer Search Widget */}
                <CustomerSearchWidget
                  customer={customer}
                  onCustomerChange={setCustomer}
                  totalAmount={total}
                  runaValue={runaValue}
                  onRunasChange={setUsedRunas}
                  usedRunas={usedRunas}
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <FulfillmentStep
            fulfillment={fulfillment}
            customer={customer}
            onFulfillmentChange={handleFulfillmentChange}
            onDeliveryDataChange={handleDeliveryDataChange}
            onNext={handleFulfillmentNext}
          />
        );
      case 3:
        return (
          <CustomerSearchStep
            customer={customer}
            onCustomerChange={setCustomer}
            orderName={orderName}
            onOrderNameChange={setOrderName}
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
      {/* Cash Session Status - Show for Cajero and Administrador */}
      <CashSessionStatus />
      
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
        <ProductCustomizationModalEnhanced
          isOpen={showCustomizationModal}
          onClose={() => {
            setShowCustomizationModal(false);
            setSelectedProduct(null);
            setEditingItemIndex(undefined);
          }}
          onAddToCart={handleAddToCart}
          product={selectedProduct}
          editingItem={editingItemIndex !== undefined ? cartItems[editingItemIndex] : undefined}
          editingIndex={editingItemIndex}
          preloadedVariants={preloadedData.variants[selectedProduct.id!] || []}
          preloadedExtras={preloadedData.extras}
          preloadedModifiers={preloadedData.modifiers.filter(m => m.product_id === selectedProduct.id)}
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
        subtotal={subtotal}
        discount={totalDiscount}
        deliveryFee={deliveryFee}
        orderName={orderName}
        deliveryData={deliveryData}
        appliedCoupons={appliedCoupons}
        manualDiscount={manualDiscount}
      />

      {/* Coupon Modal */}
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onApply={(coupon) => {
          setAppliedCoupons(prev => [...prev, coupon]);
          setIsCouponModalOpen(false);
        }}
        cartItems={cartItems}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        customer={customer}
        existingCoupons={appliedCoupons}
      />
    </div>
  );
}