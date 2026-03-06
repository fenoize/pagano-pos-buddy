import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer, OrderItem, FulfillmentType, CouponApplication, PickupMode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCashSession } from '@/hooks/useCashSession';
import { setStaffContext } from '@/lib/dbContext';
import CustomerSearchStep from '@/components/pos/CustomerSearchStep';
import CustomerSearchWidget from '@/components/pos/CustomerSearchWidget';
import { CustomerModal } from '@/components/pos/CustomerModal';
import FulfillmentStep, { DeliveryData } from '@/components/pos/FulfillmentStep';
import { createDeliverySnapshot } from '@/lib/deliveryHelpers';
import ProductGrid from '@/components/pos/ProductGrid';
import { ProductCustomizationModalEnhanced } from '@/components/pos/ProductCustomizationModalEnhanced';
import Cart from '@/components/pos/Cart';
import PaymentModal from '@/components/pos/PaymentModal';
import RunasCalculator from '@/components/pos/RunasCalculator';
import { CouponManager } from '@/components/pos/CouponManager';
import { CouponModal } from '@/components/pos/CouponModal';
import { ArrowLeft, ArrowRight, User, Ticket, History } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { usePOSConfig } from '@/hooks/usePOSConfig';
import { useCustomerDiscountSubscription } from '@/hooks/useCustomerDiscountSubscription';
import { ScrollArea } from '@/components/ui/scroll-area';
import { checkAndAwardBadges } from '@/lib/badgeAwarder';
import { RecentOrdersModal } from '@/components/sales/RecentOrdersModal';

export default function NewSale() {
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Partial<Customer>>({});
  const [orderName, setOrderName] = useState('');
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const [pickupMode, setPickupMode] = useState<PickupMode | undefined>(undefined);
  const pickupModeRef = useRef<PickupMode | undefined>(undefined);
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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [showRecentOrders, setShowRecentOrders] = useState(false);
  
  // Preloaded customization data
  const [preloadedData, setPreloadedData] = useState<{
    variants: Record<string, any[]>;
    extras: any[];
    modifiers: any[];
    combos: Record<string, any>;
  }>({ variants: {}, extras: [], modifiers: [], combos: {} });
  const { toast } = useToast();
  const { user } = useAuthContext();
  const { canCreateOrders, loading: permissionsLoading } = usePermissions();
  const { hasActiveSession } = useCashSession();
  const { deductInventoryFromOrder } = useInventory();
  const { config: posConfig } = usePOSConfig();
  const { discountPercent: subscriptionDiscountPercent, rules: subscriptionRules } = useCustomerDiscountSubscription(customer?.id as string | undefined);

  const subtotal = cartItems.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((extraSum, extra) => extraSum + (extra.price * (extra.quantity || 1)), 0);
    const itemTotal = (item.basePrice + extrasTotal) * item.quantity;
    return sum + itemTotal;
  }, 0);

  // Calculate subscription discount with rules
  const calculateSubscriptionDiscount = () => {
    if (subscriptionDiscountPercent <= 0 || !subscriptionRules) return { products: 0, delivery: 0 };

    // Min/max spend check
    if (subscriptionRules.minSpend && subtotal < subscriptionRules.minSpend) return { products: 0, delivery: 0 };
    if (subscriptionRules.maxSpend && subtotal > subscriptionRules.maxSpend) return { products: 0, delivery: 0 };

    // Calculate eligible product total based on scope
    let eligibleTotal = 0;
    if (subscriptionRules.scopeMode === 'all') {
      eligibleTotal = subtotal;
    } else {
      cartItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const categoryId = product?.category || '';
        const productId = item.productId || '';

        let eligible = true;
        if (subscriptionRules.scopeMode === 'categories') {
          if (subscriptionRules.allowedCategories.length > 0 && !subscriptionRules.allowedCategories.includes(categoryId)) eligible = false;
          if (subscriptionRules.excludedCategories.includes(categoryId)) eligible = false;
        } else if (subscriptionRules.scopeMode === 'products') {
          if (subscriptionRules.allowedProducts.length > 0 && !subscriptionRules.allowedProducts.includes(productId)) eligible = false;
          if (subscriptionRules.excludedProducts.includes(productId)) eligible = false;
        }

        if (eligible) {
          const extrasTotal = item.extras.reduce((s, e) => s + (e.price * (e.quantity || 1)), 0);
          eligibleTotal += (item.basePrice + extrasTotal) * item.quantity;
        }
      });
    }

    const productsDiscount = Math.round(eligibleTotal * subscriptionDiscountPercent / 100);

    // Delivery discount
    let deliveryDisc = 0;
    if (subscriptionRules.affectsDelivery && deliveryFee > 0) {
      if (subscriptionRules.deliveryMode === 'free') {
        deliveryDisc = deliveryFee;
      } else if (subscriptionRules.deliveryMode === 'fixed') {
        deliveryDisc = Math.min(deliveryFee, subscriptionRules.deliveryAmount || 0);
      } else if (subscriptionRules.deliveryMode === 'percent') {
        deliveryDisc = Math.round(deliveryFee * (subscriptionRules.deliveryAmount || 0) / 100);
      }
    }

    return { products: productsDiscount, delivery: deliveryDisc };
  };

  const subscriptionDisc = calculateSubscriptionDiscount();
  const subscriptionDiscountAmount = subscriptionDisc.products;
  const subscriptionDeliveryDiscount = subscriptionDisc.delivery;

  const couponDiscount = appliedCoupons.reduce((sum, coupon) => 
    sum + Number(coupon.discount_products) + Number(coupon.discount_delivery), 0);
  const manualDiscountAmount = manualDiscount ? manualDiscount.amount : 0;
  const runasDiscount = usedRunas * runaRewardValue;
  const totalDiscount = couponDiscount + manualDiscountAmount + runasDiscount + subscriptionDiscountAmount;
  const totalBeforeDelivery = Math.max(0, subtotal - totalDiscount);
  const effectiveDeliveryFee = Math.max(0, deliveryFee - subscriptionDeliveryDiscount);
  const total = totalBeforeDelivery + effectiveDeliveryFee;

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
          .eq('active', true)
          .eq('show_in_pos', true),
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
    // Reset pickup mode when changing fulfillment type
    if (type === 'delivery') {
      pickupModeRef.current = undefined;
      setPickupMode(undefined);
    }
  };

  const handlePickupModeChange = (mode: PickupMode) => {
    // Use a ref so we never lose the selection due to React state timing.
    pickupModeRef.current = mode;
    setPickupMode(mode);
    setCurrentStep(3);
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

  const [matchedVariantId, setMatchedVariantId] = useState<string | undefined>();

  const handleProductClick = (product: Product, variantId?: string) => {
    setSelectedProduct(product);
    setMatchedVariantId(variantId);
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
      methodName: string;
      countsAsRealSale: boolean;
      amount: number;
      receiptNumber?: string;
      operationNumber?: string;
      runas?: number;
    }>;
    fulfillment: FulfillmentType;
    notes?: string;
  }) => {
    // Prevenir procesamiento duplicado
    if (isProcessingOrder) {
      toast({
        title: "Procesando",
        description: "Ya hay un pedido siendo procesado",
        variant: "destructive"
      });
      return;
    }

    // Validaciones inmediatas
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Usuario no autenticado. Por favor, inicie sesión nuevamente.",
        variant: "destructive"
      });
      return;
    }

    if (!canCreateOrders) {
      toast({
        title: "Error",
        description: "Usuario sin permisos para crear órdenes. Se requiere rol de Cajero o Administrador.",
        variant: "destructive"
      });
      return;
    }

    // Preparar snapshot de todos los datos
    const orderSnapshot = {
      cartItems: [...cartItems],
      customer: { ...customer },
      orderName: orderName.trim() || null,
      fulfillment,
      pickupMode: fulfillment === 'retiro' ? (pickupModeRef.current ?? pickupMode) : undefined,
      deliveryData: deliveryData ? { ...deliveryData } : null,
      deliveryFee,
      deliveryZone,
      subtotal,
      totalDiscount,
      total,
      appliedCoupons: [...appliedCoupons],
      manualDiscount: manualDiscount ? { ...manualDiscount } : null,
      usedRunas,
      runaValue,
      runaRewardValue,
      userId: user.id
    };

    // Cerrar modal y resetear estado INMEDIATAMENTE
    setShowPaymentModal(false);
    setCartItems([]);
    setCustomer({});
    setOrderName('');
    setUsedRunas(0);
    setFulfillment('retiro');
    pickupModeRef.current = undefined;
    setPickupMode(undefined);
    setDeliveryFee(0);
    setDeliveryZone('');
    setDeliveryData(null);
    setAppliedCoupons([]);
    setManualDiscount(null);
    setCurrentStep(1);

    // Mostrar feedback inicial
    toast({
      title: "Procesando pedido...",
      description: "El pedido se está enviando a cocina"
    });

    // Marcar como procesando
    setIsProcessingOrder(true);

    // Procesar en segundo plano
    processOrderInBackground(orderSnapshot, paymentData);
    
    // Timeout de seguridad: resetear después de 30s por si algo falla
    setTimeout(() => {
      setIsProcessingOrder(false);
    }, 30000);
  };

  const processOrderInBackground = async (
    orderSnapshot: any,
    paymentData: {
      payments: Array<{
        method: string;
        methodName: string;
        countsAsRealSale: boolean;
        amount: number;
        receiptNumber?: string;
        operationNumber?: string;
        runas?: number;
      }>;
      fulfillment: FulfillmentType;
      notes?: string;
    }
  ) => {
    try {
      // Create or update customer if needed
      let customerId = orderSnapshot.customer.id;
      if (!customerId && (orderSnapshot.customer.name || orderSnapshot.customer.phone)) {
        // Check if customer exists
        const { data: existingCustomers } = await supabase
          .from('customers')
          .select('id')
          .or(`phone.eq.${orderSnapshot.customer.phone},rut.eq.${orderSnapshot.customer.rut}`)
          .limit(1);

        if (existingCustomers && existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
          // Update existing customer
          await supabase
            .from('customers')
            .update({
              name: orderSnapshot.customer.name,
              apellido: orderSnapshot.customer.apellido,
              email: orderSnapshot.customer.email,
              phone: orderSnapshot.customer.phone,
              rut: orderSnapshot.customer.rut
            })
            .eq('id', customerId);
        } else {
          // Create new customer
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: orderSnapshot.customer.name,
              apellido: orderSnapshot.customer.apellido,
              email: orderSnapshot.customer.email,
              phone: orderSnapshot.customer.phone,
              rut: orderSnapshot.customer.rut
            })
            .select()
            .single();

          if (customerError) throw customerError;
          customerId = customerData.id;
        }
      }

      const validUserId = orderSnapshot.userId;

      // Establecer contexto de staff antes de crear orden
      try {
        await setStaffContext(validUserId);
      } catch (contextError) {
        console.error('Error estableciendo contexto de staff:', contextError);
        throw new Error('Error al establecer contexto de usuario');
      }

      // Obtener la sesión de caja activa del usuario para vincular la orden
      let activeCashSessionId: string | null = null;
      try {
        const { data: activeSession } = await supabase
          .from('cash_sessions')
          .select('id')
          .eq('user_id', validUserId)
          .is('closed_at', null)
          .order('opened_at', { ascending: false })
          .limit(1)
          .single();
        
        activeCashSessionId = activeSession?.id || null;
      } catch (sessionError) {
        console.warn('No se encontró sesión de caja activa:', sessionError);
      }

      // Calculate payment totals by method using methodName
      const totals = paymentData.payments.reduce(
        (acc, payment) => {
          const name = payment.methodName || payment.method.toLowerCase();
          if (name === 'efectivo') {
            acc.efectivo += payment.amount;
          } else if (name === 'pos') {
            acc.pos += payment.amount;
          } else if (name === 'transferencia' || name === 'mp') {
            acc.mp += payment.amount;
          } else if (name === 'aplicacion') {
            acc.aplicacion += payment.amount;
          } else if (name === 'runas') {
            acc.runas += payment.runas || 0;
          } else {
            // Non-standard methods (colacion, etc.) → store in aplicacion as catch-all
            acc.aplicacion += payment.amount;
          }
          return acc;
        },
        { efectivo: 0, pos: 0, mp: 0, aplicacion: 0, runas: 0 }
      );

      // Determine payment method - use methodName for accurate mapping
      const knownMethods: Record<string, string> = {
        efectivo: 'efectivo', pos: 'pos', mp: 'mp', transferencia: 'transferencia',
        aplicacion: 'aplicacion', runas: 'runas', pendiente: 'pendiente', colacion: 'colacion'
      };

      const paymentMethod: string =
        paymentData.payments.length === 1
          ? (knownMethods[paymentData.payments[0].methodName] || paymentData.payments[0].methodName || 'efectivo')
          : 'mixto';

      // Determinar payment_status según el método
      const isPendingPayment = paymentMethod === 'pendiente';
      const paymentStatus = isPendingPayment ? 'unpaid' : 'paid';

      const orderData = {
        customer_id: customerId,
        created_by_user_id: validUserId,
        cash_session_id: activeCashSessionId,
        nombre_resumen: orderSnapshot.orderName,
        fulfillment: orderSnapshot.fulfillment,
        pickup_mode: orderSnapshot.pickupMode || null,
        items: orderSnapshot.cartItems as any,
        subtotal: orderSnapshot.subtotal,
        delivery_fee: orderSnapshot.deliveryFee,
        discount: orderSnapshot.totalDiscount,
        total: orderSnapshot.total,
        payment_efectivo: isPendingPayment ? 0 : totals.efectivo,
        payment_mp: isPendingPayment ? 0 : totals.mp,
        payment_pos: isPendingPayment ? 0 : totals.pos,
        payment_aplicacion: isPendingPayment ? 0 : totals.aplicacion,
        payment_runas: isPendingPayment ? 0 : totals.runas,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status: 'Pendiente' as const,
        notes: paymentData.notes || null,
        // Delivery snapshot fields
        ...(orderSnapshot.fulfillment === 'delivery' && orderSnapshot.deliveryData && {
          delivery_zone_id: orderSnapshot.deliveryData.zone?.id,
          delivery_zone_name: orderSnapshot.deliveryData.zone?.name,
          delivery_address: orderSnapshot.deliveryData.addressLine,
          delivery_number: orderSnapshot.deliveryData.addressNumber,
          delivery_comuna_id: orderSnapshot.deliveryData.comunaId,
          delivery_comuna: orderSnapshot.deliveryData.comunaName,
          delivery_reference: orderSnapshot.deliveryData.reference,
          delivery_person_id: orderSnapshot.deliveryData.repartidorId || null,
          delivery_person_name: orderSnapshot.deliveryData.repartidorName || null
        })
      };

      // Crear orden usando función transaccional
      const { data: orderResult, error: orderError } = await supabase.rpc('create_order_with_context', {
        p_user_id: validUserId,
        p_order_data: orderData
      });

      if (orderError) throw orderError;
      
      const fullOrderData = orderResult as any;

      // Save address if requested
      if (orderSnapshot.fulfillment === 'delivery' && orderSnapshot.deliveryData?.saveAddress && customerId) {
        try {
          await supabase.from('addresses').insert({
            customer_id: customerId,
            calle: orderSnapshot.deliveryData.addressLine,
            numero: orderSnapshot.deliveryData.addressNumber,
            comuna_id: orderSnapshot.deliveryData.comunaId,
            comuna: orderSnapshot.deliveryData.comunaName,
            observaciones: orderSnapshot.deliveryData.reference,
            is_default: false
          });
        } catch (error) {
          console.error('Error saving address:', error);
        }
      }

      // Load runas configuration
      const { data: runaConfigData } = await supabase
        .from('config')
        .select('key, value')
        .in('key', [
          'runa_value',
          'runa_reward_value',
          'runas_exclude_if_paid_with_runas',
          'runas_exclude_if_discounted',
          'runas_min_eligible_amount'
        ]);

      const runaConfig = runaConfigData?.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, any>) || {};

      // Handle runas transactions with business rules
      if (customerId && (totals.runas > 0 || orderSnapshot.total > 0)) {
        const transactions = [];
        
        // Redemption transaction (always recorded if runas are used)
        if (totals.runas > 0) {
          transactions.push({
            customer_id: customerId,
            order_id: fullOrderData.id,
            type: 'canje',
            amount: totals.runas * orderSnapshot.runaRewardValue,
            runas: -totals.runas,
            origen: 'POS'
          });
        }

        // Accumulation transaction (WITH BUSINESS RULES)
        let canEarnRunas = true;
        let reason = '';
        
        // Rule 1: Do not accumulate if paid with runas
        if (runaConfig.runas_exclude_if_paid_with_runas && totals.runas > 0) {
          canEarnRunas = false;
          reason = 'Pago con runas';
        }
        
        // Rule 2: Do not accumulate if there are discounts/coupons
        if (runaConfig.runas_exclude_if_discounted && orderSnapshot.totalDiscount > 0) {
          canEarnRunas = false;
          reason = 'Descuento aplicado';
        }
        
        // Rule 3: Minimum eligible amount
        const eligibleAmount = orderSnapshot.total;
        if (eligibleAmount < (runaConfig.runas_min_eligible_amount || 0)) {
          canEarnRunas = false;
          reason = 'Monto insuficiente';
        }
        
        if (canEarnRunas) {
          const runasDiscountAmount = totals.runas * orderSnapshot.runaRewardValue;
          const earnableAmount = orderSnapshot.total - runasDiscountAmount;
          const runasEarned = Math.floor(earnableAmount / orderSnapshot.runaValue);
          
          if (runasEarned > 0) {
            transactions.push({
              customer_id: customerId,
              order_id: fullOrderData.id,
              type: 'acumulacion',
              amount: earnableAmount,
              runas: runasEarned,
              origen: 'POS'
            });
          }
        } else {
          console.log(`No se acumulan runas en orden ${fullOrderData.id}: ${reason}`);
        }

        // Insert transactions using RPC to avoid RLS issues
        if (transactions.length > 0) {
          for (const transaction of transactions) {
            const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_runas_transaction_with_context', {
              p_user_id: validUserId,
              p_customer_id: transaction.customer_id,
              p_order_id: transaction.order_id,
              p_type: transaction.type,
              p_runas: transaction.runas,
              p_amount: transaction.amount,
              p_origen: transaction.origen || 'POS',
              p_motivo: null
            });
            
            if (rpcError) {
              console.error('Error insertando transacción de runas:', rpcError);
            } else {
              console.log(`✅ Transacción de runas registrada: ${transaction.type} ${transaction.runas} runas`, rpcResult);
            }
          }
        }
      }

      // Check and award badges
      if (customerId) {
        try {
          const badgeResults = await checkAndAwardBadges(customerId, fullOrderData.id);
          const newBadges = badgeResults.filter(r => r.awarded);
          
          if (newBadges.length > 0) {
            console.log(`✨ Nuevas insignias otorgadas: ${newBadges.map(b => b.badgeCode).join(', ')}`);
            toast({
              title: '🏆 ¡Nueva insignia!',
              description: `El cliente ha ganado ${newBadges.length} insignia(s) nueva(s)`,
            });
          }
        } catch (badgeError) {
          console.error('Error otorgando insignias:', badgeError);
          // Not critical, don't interrupt flow
        }
      }

      // Incrementar usage_count de suscripción de descuento
      if (customerId && subscriptionDiscountPercent > 0) {
        try {
          const { data: sub } = await supabase
            .from('customer_discount_subscriptions')
            .select('id, usage_count')
            .eq('customer_id', customerId)
            .eq('is_active', true)
            .maybeSingle();
          if (sub) {
            await supabase
              .from('customer_discount_subscriptions')
              .update({ usage_count: (sub.usage_count || 0) + 1 })
              .eq('id', sub.id);
            console.log('✅ usage_count de suscripción de descuento incrementado');
          }
        } catch (err) {
          console.error('Error incrementando usage_count:', err);
        }
      }

      // Descontar inventario
      try {
        const inventoryResult = await deductInventoryFromOrder(fullOrderData.id);
        
        if (!inventoryResult.success && inventoryResult.errors.length > 0) {
          console.warn('Advertencias de inventario:', inventoryResult.errors);
        }
      } catch (inventoryError) {
        console.error('Error al descontar inventario (no crítico):', inventoryError);
      }

      toast({
        title: "¡Pedido creado!",
        description: `Pedido #${fullOrderData.order_number} enviado a cocina exitosamente`,
        duration: 5000
      });

    } catch (error) {
      console.error('Error processing order:', error);
      
      let errorMessage = "No se pudo procesar el pedido";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }
      
      toast({
        title: "Error al procesar pedido",
        description: errorMessage,
        variant: "destructive",
        duration: 7000
      });
    } finally {
      setIsProcessingOrder(false);
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
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-4 pr-4">
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => setIsCustomerModalOpen(true)}
                    >
                      <User className="w-4 h-4" />
                      <span className="truncate">
                        {customer.id ? customer.name : 'Cliente'}
                      </span>
                      {subscriptionDiscountPercent > 0 && (
                        <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                          -{subscriptionDiscountPercent}%
                        </span>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => setIsCouponModalOpen(true)}
                    >
                      <Ticket className="w-4 h-4" />
                      <span className="truncate">
                        {appliedCoupons.length > 0 || manualDiscount 
                          ? `Descuento${appliedCoupons.length > 1 ? 's' : ''}` 
                          : 'Cupón'}
                      </span>
                    </Button>
                  </div>

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
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            {/* Persistent Customer Widget */}
            <Card className="border-dashed">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    {customer.id ? (
                      <div>
                        <span className="font-medium">{customer.name} {customer.apellido}</span>
                        <span className="text-sm text-muted-foreground ml-2">{customer.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin cliente seleccionado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsCustomerModalOpen(true)}
                    >
                      {customer.id ? 'Cambiar' : 'Añadir Cliente'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsCouponModalOpen(true)}
                    >
                      <Ticket className="w-4 h-4 mr-1" />
                      {appliedCoupons.length > 0 ? `${appliedCoupons.length} Cupón${appliedCoupons.length > 1 ? 'es' : ''}` : 'Añadir Cupón'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <FulfillmentStep
              fulfillment={fulfillment}
              pickupMode={pickupMode}
              customer={customer}
              initialDeliveryData={deliveryData}
              onFulfillmentChange={handleFulfillmentChange}
              onPickupModeChange={handlePickupModeChange}
              onDeliveryDataChange={handleDeliveryDataChange}
              onNext={handleFulfillmentNext}
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {/* Persistent Customer Widget */}
            <Card className="border-dashed">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    {customer.id ? (
                      <div>
                        <span className="font-medium">{customer.name} {customer.apellido}</span>
                        <span className="text-sm text-muted-foreground ml-2">{customer.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin cliente seleccionado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsCustomerModalOpen(true)}
                    >
                      {customer.id ? 'Cambiar' : 'Añadir Cliente'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsCouponModalOpen(true)}
                    >
                      <Ticket className="w-4 h-4 mr-1" />
                      {appliedCoupons.length > 0 ? `${appliedCoupons.length} Cupón${appliedCoupons.length > 1 ? 'es' : ''}` : 'Añadir Cupón'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <CustomerSearchStep
              customer={customer}
              onCustomerChange={setCustomer}
              orderName={orderName}
              onOrderNameChange={setOrderName}
              onNext={handleCustomerNext}
            />
          </div>
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
      <div className="flex items-center justify-end">
        
        {/* Step Navigation */}
        <div className="flex items-center gap-2">
          {/* Botón de Últimas Órdenes */}
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowRecentOrders(true)}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Últimas Órdenes</span>
          </Button>
          
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
            setMatchedVariantId(undefined);
          }}
          onAddToCart={handleAddToCart}
          product={selectedProduct}
          editingItem={editingItemIndex !== undefined ? cartItems[editingItemIndex] : undefined}
          editingIndex={editingItemIndex}
          preloadedVariants={preloadedData.variants[selectedProduct.id!] || []}
          preloadedExtras={preloadedData.extras}
          preloadedModifiers={preloadedData.modifiers.filter(m => m.product_id === selectedProduct.id)}
          preloadedComboData={preloadedData.combos[selectedProduct.id!]}
          showVariantStock={posConfig.showVariantStock}
          preselectedVariantId={matchedVariantId}
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
        }}
        cartItems={cartItems}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        customer={customer}
        existingCoupons={appliedCoupons}
        onRemoveCoupon={(couponId) => {
          setAppliedCoupons(prev => prev.filter(c => c.coupon_id !== couponId));
        }}
        manualDiscount={manualDiscount}
        onManualDiscountChange={setManualDiscount}
      />

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customer={customer}
        onCustomerChange={setCustomer}
      />

      {/* Recent Orders Modal */}
      <RecentOrdersModal
        isOpen={showRecentOrders}
        onClose={() => setShowRecentOrders(false)}
      />
    </div>
  );
}