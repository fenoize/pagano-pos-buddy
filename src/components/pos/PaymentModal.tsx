import React, { useState, useEffect, useRef } from 'react';
import { Customer, OrderItem, FulfillmentType, PaymentMethod } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, Banknote, Smartphone, Coins, Bike, Plus, X,
  AppWindow, Sparkles, DollarSign, Wallet, User, Ticket, ChevronDown, ChevronUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryData } from './FulfillmentStep';
import { formatDeliveryAddress } from '@/lib/deliveryHelpers';
import { CouponApplication } from '@/types';
import { PaymentMethod as ConfiguredPaymentMethod } from '@/hooks/usePaymentMethods';
import { useSalesChannels, type SalesChannel } from '@/hooks/useSalesChannels';
import { toast } from "sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: PaymentData) => void;
  customer: Partial<Customer>;
  items: OrderItem[];
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  orderName?: string;
  deliveryData?: DeliveryData | null;
  appliedCoupons?: CouponApplication[];
  manualDiscount?: { type: 'percentage' | 'fixed'; value: number; amount: number } | null;
  onOpenCustomerModal?: () => void;
  onOpenCouponModal?: () => void;
  subscriptionDiscountPercent?: number;
}

interface SinglePayment {
  method: string;
  methodName: string; // internal name (e.g. 'efectivo', 'colacion')
  countsAsRealSale: boolean;
  amount: number;
  cashGiven?: number; // monto físico entregado por el cliente (efectivo, antes del cap por total)
  receiptNumber?: string;
  operationNumber?: string;
  runas?: number;
  /** When method is 'aplicacion', slug of the delivery app channel selected (rappi, uber_eats, pedidos_ya) */
  salesChannelSlug?: string;
  /** External order id assigned by the delivery app */
  externalOrderId?: string;
}

interface PaymentData {
  payments: SinglePayment[];
  fulfillment: FulfillmentType;
  notes?: string;
}

function PaymentItemRow({ item, itemTotal, formatPrice }: { item: OrderItem; itemTotal: number; formatPrice: (n: number) => string }) {
  const isCombo = item.is_combo_item && item.combo_selections && item.combo_selections.length > 0;
  const hasDetails = isCombo
    || (item.variant_group_selections && item.variant_group_selections.length > 0)
    || (item.extras && item.extras.length > 0)
    || (item.modifiers && item.modifiers.length > 0)
    || !!item.notes;
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border/60 rounded-lg bg-muted/20">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          asChild
          disabled={!hasDetails}
        >
          <button
            type="button"
            className="w-full flex justify-between items-start gap-2 p-3 text-left hover:bg-muted/40 rounded-lg transition-colors disabled:cursor-default disabled:hover:bg-transparent"
            disabled={!hasDetails}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {hasDetails && (
                open ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
                     : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium text-sm truncate">
                {item.quantity}x {item.productName}
                {item.variant_name ? ` (${item.variant_name})` : item.size ? ` (${item.size})` : ''}
                {item.priceKind === 'combo' && !item.variant_name ? ' • Combo' : ''}
              </span>
            </div>
            <span className="currency text-sm font-semibold whitespace-nowrap">
              {formatPrice(itemTotal)}
            </span>
          </button>
        </CollapsibleTrigger>
        {hasDetails && (
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0 space-y-2">
              {item.variant_group_selections && item.variant_group_selections.length > 0 && (
                <div className="text-xs text-muted-foreground pl-2">
                  {item.variant_group_selections.map((s: any, i: number) => (
                    <div key={i}>• {s.option_name}</div>
                  ))}
                </div>
              )}

              {isCombo && (
                <div className="space-y-2">
                  {item.combo_selections!.map((selection: any, selIdx: number) => (
                    <div key={selIdx} className="text-xs bg-background/60 rounded p-2 space-y-0.5">
                      <div className="font-medium">
                        {selection.comboSlot?.category?.name || 'Item'}
                        {selection.quantity > 1 && ` x${selection.quantity}`}
                      </div>
                      {selection.selectedProduct && (
                        <div className="text-muted-foreground pl-2">→ {selection.selectedProduct.name}</div>
                      )}
                      {selection.selectedVariant && (
                        <div className="text-muted-foreground pl-2">
                          • {selection.selectedVariant.variant?.name || selection.selectedVariant.name || 'Variante'}
                          {selection.selectedVariant.price_adjustment ? (
                            <span className="ml-1">
                              ({selection.selectedVariant.price_adjustment > 0 ? '+' : ''}
                              {formatPrice(selection.selectedVariant.price_adjustment)})
                            </span>
                          ) : null}
                        </div>
                      )}
                      {selection.extras && selection.extras.length > 0 && (
                        <div className="pl-2">
                          {selection.extras.map((extra: any, ei: number) => (
                            <div key={ei} className="flex justify-between text-muted-foreground">
                              <span>+ {extra.label || extra.name}{extra.quantity > 1 ? ` x${extra.quantity}` : ''}</span>
                              {extra.price > 0 && <span>{formatPrice(extra.price * (extra.quantity || 1))}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {selection.modifiers && selection.modifiers.length > 0 && (
                        <div className="pl-2 italic text-muted-foreground">
                          {selection.modifiers.map((m: any, mi: number) => (
                            <div key={mi}>• {m.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!isCombo && item.extras && item.extras.length > 0 && (
                <div className="text-xs">
                  {item.extras.map((extra, ei) => (
                    <div key={ei} className="flex justify-between text-muted-foreground">
                      <span>+ {extra.label}{extra.quantity && extra.quantity > 1 ? ` x${extra.quantity}` : ''}</span>
                      <span>{formatPrice(extra.price * (extra.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
              )}

              {item.modifiers && item.modifiers.length > 0 && (
                <div className="text-xs italic text-muted-foreground">
                  {item.modifiers.map((m: any, mi: number) => (
                    <div key={mi}>• {m.name}</div>
                  ))}
                </div>
              )}

              {item.notes && (
                <div className="text-xs bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-400 px-2 py-1 rounded">
                  <span className="font-medium text-amber-700 dark:text-amber-400">Nota:</span>{' '}
                  <span className="text-amber-700 dark:text-amber-300">{item.notes}</span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  customer, 
  items, 
  total, 
  subtotal, 
  discount, 
  deliveryFee, 
  orderName, 
  deliveryData, 
  appliedCoupons = [], 
  manualDiscount,
  onOpenCustomerModal,
  onOpenCouponModal,
  subscriptionDiscountPercent = 0
}: PaymentModalProps) {
  const [payments, setPayments] = useState<SinglePayment[]>([]);
  const [currentMethod, setCurrentMethod] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [currentReceiptNumber, setCurrentReceiptNumber] = useState('');
  const [currentOperationNumber, setCurrentOperationNumber] = useState('');
  const [currentRunas, setCurrentRunas] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<ConfiguredPaymentMethod[]>([]);
  const [cashDenominations, setCashDenominations] = useState<number[]>([]);
  const [runaRewardValue, setRunaRewardValue] = useState(1300);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-flow for "Aplicación" payment method (delivery apps)
  const { channels: allChannels } = useSalesChannels({ onlyActive: true });
  const deliveryAppChannels = allChannels.filter((c) => c.type === 'delivery_app');
  const [selectedAppChannel, setSelectedAppChannel] = useState<SalesChannel | null>(null);
  const [externalOrderId, setExternalOrderId] = useState('');
  const appInputRef = useRef<HTMLInputElement>(null);
  const isAppFlow = currentMethod === 'aplicacion' && !!selectedAppChannel;

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  // Reset all payment fields every time modal opens
  useEffect(() => {
    if (isOpen) {
      // Always reset all fields when modal opens
      setPayments([]);
      setCurrentAmount('');
      setCurrentReceiptNumber('');
      setCurrentOperationNumber('');
      setCurrentRunas('');
      setNotes('');
      setIsSubmitting(false);
      setSelectedAppChannel(null);
      setExternalOrderId('');
      
      // Set default payment method
      if (paymentMethods.length > 0) {
        const firstActiveMethod = paymentMethods.find(m => m.is_active);
        if (firstActiveMethod) {
          setCurrentMethod(firstActiveMethod.name);
        }
      }
    } else {
      // Reset when modal closes
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // When switching away from "aplicacion", clear the app sub-state
  useEffect(() => {
    if (currentMethod !== 'aplicacion') {
      setSelectedAppChannel(null);
      setExternalOrderId('');
    }
  }, [currentMethod]);

  // When an app is picked, lock amount to total and focus the input
  useEffect(() => {
    if (selectedAppChannel) {
      setCurrentAmount(total.toString());
      const t = setTimeout(() => appInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [selectedAppChannel, total]);

  // Auto-llenar campos al cambiar método de pago
  useEffect(() => {
    if (!isOpen) return;
    
    const remainingBalance = getRemainingBalance();
    
    // Auto-llenar monto para métodos que no son efectivo ni runas ni pendiente
    const methodConfig = getCurrentMethodConfig();
    if (currentMethod !== 'efectivo' && currentMethod !== 'runas' && currentMethod !== 'pendiente' && !methodConfig?.requires_change) {
      setCurrentAmount(remainingBalance.toString());
    }
    
    // Auto-llenar runas necesarias
    if (currentMethod === 'runas' && remainingBalance > 0) {
      const runasNeeded = Math.ceil(remainingBalance / runaRewardValue);
      
      // Usar la cantidad necesaria, sin importar si se pasa
      setCurrentRunas(runasNeeded.toString());
      setCurrentAmount((runasNeeded * runaRewardValue).toString());
    }
    
    // Limpiar campos para Efectivo (mantener comportamiento actual)
    if (currentMethod === 'efectivo') {
      setCurrentAmount('');
    }
  }, [currentMethod, total, payments, runaRewardValue, isOpen]);

  const fetchConfig = async () => {
    try {
      // Cargar métodos de pago desde la nueva tabla payment_methods
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (methodsData && methodsData.length > 0) {
        setPaymentMethods(methodsData);
      }

      // Cargar configuración adicional
      const { data: configData } = await supabase
        .from('config')
        .select('*')
        .in('key', ['runa_reward_value', 'cash_denominations']);

      configData?.forEach((config) => {
        if (config.key === 'runa_reward_value') {
          setRunaRewardValue(config.value as number);
        } else if (config.key === 'cash_denominations') {
          setCashDenominations(config.value as number[]);
        }
      });
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getMethodIcon = (methodName: string) => {
    const method = paymentMethods.find(m => m.display_name === methodName || m.name === methodName);
    if (!method) return <CreditCard className="w-5 h-5" />;

    switch (method.icon) {
      case 'Banknote': return <Banknote className="w-5 h-5" />;
      case 'CreditCard': return <CreditCard className="w-5 h-5" />;
      case 'Smartphone': return <Smartphone className="w-5 h-5" />;
      case 'AppWindow': return <AppWindow className="w-5 h-5" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5" />;
      case 'Coins': return <Coins className="w-5 h-5" />;
      case 'DollarSign': return <DollarSign className="w-5 h-5" />;
      case 'Wallet': return <Wallet className="w-5 h-5" />;
      case 'Clock': return <Clock className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  const getCurrentMethodConfig = () => {
    return paymentMethods.find(m => m.name === currentMethod);
  };

  const getTotalPaid = () => {
    return payments.reduce((sum, payment) => {
      if (payment.method === 'Runas') {
        return sum + (payment.runas || 0) * runaRewardValue;
      }
      return sum + payment.amount;
    }, 0);
  };

  const getRemainingBalance = () => {
    return Math.max(0, total - getTotalPaid());
  };

  const getCurrentPaymentAmount = () => {
    if (currentMethod === 'runas') {
      const runasNum = parseFloat(currentRunas) || 0;
      return runasNum * runaRewardValue;
    }
    return parseFloat(currentAmount) || 0;
  };

  const calculateChange = () => {
    const efectivoPayments = payments.filter(p => {
      const methodConfig = paymentMethods.find(m => m.name === p.method || m.display_name === p.method);
      return methodConfig?.requires_change;
    });
    const totalEfectivo = efectivoPayments.reduce((sum, p) => sum + p.amount, 0);
    const otherPayments = payments.filter(p => {
      const methodConfig = paymentMethods.find(m => m.name === p.method || m.display_name === p.method);
      return !methodConfig?.requires_change;
    });
    const totalOther = otherPayments.reduce((sum, p) => {
      if (p.method === 'runas' || p.method === 'Runas') {
        return sum + (p.runas || 0) * runaRewardValue;
      }
      return sum + p.amount;
    }, 0);
    return Math.max(0, totalEfectivo - Math.max(0, total - totalOther));
  };

  const getCurrentChange = () => {
    const methodConfig = getCurrentMethodConfig();
    if (!methodConfig?.requires_change) return 0;
    
    const amount = parseFloat(currentAmount) || 0;
    const remaining = getRemainingBalance();
    
    return Math.max(0, amount - remaining);
  };

  const handleAddPayment = () => {
    const amount = parseFloat(currentAmount) || 0;
    const methodConfig = getCurrentMethodConfig();
    
    // Para método pendiente, no se requiere monto
    if (currentMethod === 'pendiente') {
      const newPayment: SinglePayment = {
        method: methodConfig?.display_name || 'Pendiente',
        methodName: 'pendiente',
        countsAsRealSale: methodConfig?.counts_as_real_sale ?? false,
        amount: 0,
      };
      setPayments([newPayment]);
      toast.success("Pago pendiente", { description: "El pedido irá a cocina sin pago inmediato" });
      return;
    }

    if (currentMethod !== 'runas' && currentMethod !== 'pendiente' && amount <= 0) {
      toast.error("Error", { description: "Ingrese un monto válido" });
      return;
    }

    if (methodConfig?.requires_receipt && !currentReceiptNumber.trim()) {
      toast.error("Error", { description: "Ingrese el número de boleta" });
      return;
    }

    if (methodConfig?.requires_operation_number && !currentOperationNumber.trim()) {
      toast.error("Error", { description: "Ingrese el número de operación" });
      return;
    }

    if (currentMethod === 'runas') {
      const runasNum = parseFloat(currentRunas) || 0;
      if (runasNum <= 0) {
        toast.error("Error", { description: "Ingrese cantidad de runas" });
        return;
      }
      
      // Validar que el cliente tenga suficientes runas
      if (runasNum > (customer.cantidad_runas || 0)) {
        toast.error("Error", { description: `El cliente solo tiene ${customer.cantidad_runas || 0} runas disponibles` });
        return;
      }
      
      // Validar que las runas cubran al menos el saldo restante
      const runasValue = runasNum * runaRewardValue;
      const remainingBalance = getRemainingBalance();
      if (runasValue < remainingBalance) {
        toast.error("Error", { description: `Se necesitan al menos ${Math.ceil(remainingBalance / runaRewardValue)} runas para cubrir el saldo restante` });
        return;
      }
    }

    // For aplicacion sub-flow, require the channel + external order id
    if (currentMethod === 'aplicacion') {
      if (!selectedAppChannel) {
        toast.error("Error", { description: "Selecciona la app de delivery" });
        return;
      }
      if (!externalOrderId.trim()) {
        toast.error("Error", { description: "Ingresa el N° de pedido de la app" });
        return;
      }
    }

    const newPayment: SinglePayment = {
      method: methodConfig?.display_name || currentMethod,
      methodName: methodConfig?.name || currentMethod,
      countsAsRealSale: methodConfig?.counts_as_real_sale ?? true,
      amount: currentMethod === 'runas' 
        ? 0 
        : (methodConfig?.requires_change 
            ? Math.min(amount, getRemainingBalance()) 
            : amount),
      cashGiven: currentMethod === 'efectivo' ? amount : undefined,
      receiptNumber: methodConfig?.requires_receipt ? currentReceiptNumber : undefined,
      operationNumber: methodConfig?.requires_operation_number ? currentOperationNumber : undefined,
      runas: currentMethod === 'runas' ? parseFloat(currentRunas) : undefined,
      salesChannelSlug: currentMethod === 'aplicacion' ? selectedAppChannel?.slug : undefined,
      externalOrderId: currentMethod === 'aplicacion' ? externalOrderId.trim() : undefined,
    };

    setPayments([...payments, newPayment]);
    setCurrentAmount('');
    setCurrentReceiptNumber('');
    setCurrentOperationNumber('');
    setCurrentRunas('');
    toast.success("Pago agregado", { description: `${methodConfig?.display_name || currentMethod} agregado a la lista` });
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    // Prevenir múltiples clics
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    let finalPayments = [...payments];
    
    // Si no hay pagos en la lista, agregar el pago actual directamente
    if (payments.length === 0) {
      const amount = parseFloat(currentAmount) || 0;
      const methodConfig = getCurrentMethodConfig();
      
      // Para método pendiente, crear pago directamente
      if (currentMethod === 'pendiente') {
        finalPayments = [{
          method: methodConfig?.display_name || 'Pendiente',
          methodName: 'pendiente',
          countsAsRealSale: methodConfig?.counts_as_real_sale ?? false,
          amount: 0,
        }];
      } else if (currentMethod !== 'runas' && amount <= 0) {
        // Validar método actual
        toast.error("Error", { description: "Ingrese un monto válido" });
        setIsSubmitting(false);
        return;
      }
      else if (methodConfig?.requires_receipt && !currentReceiptNumber.trim()) {
        toast.error("Error", { description: "Ingrese el número de boleta" });
        setIsSubmitting(false);
        return;
      }
      else if (methodConfig?.requires_operation_number && !currentOperationNumber.trim()) {
        toast.error("Error", { description: "Ingrese el número de operación" });
        setIsSubmitting(false);
        return;
      }

      else if (currentMethod === 'runas') {
        const runasNum = parseFloat(currentRunas) || 0;
        if (runasNum <= 0) {
          toast.error("Error", { description: "Ingrese cantidad de runas" });
          setIsSubmitting(false);
          return;
        }
        
        if (runasNum > (customer.cantidad_runas || 0)) {
          toast.error("Error", { description: `El cliente solo tiene ${customer.cantidad_runas || 0} runas disponibles` });
          setIsSubmitting(false);
          return;
        }
        
        const runasValue = runasNum * runaRewardValue;
        if (runasValue < total) {
          toast.error("Error", { description: `Se necesitan al menos ${Math.ceil(total / runaRewardValue)} runas para cubrir el total` });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Crear el pago actual (si no es pendiente que ya se creó arriba)
      if (currentMethod !== 'pendiente') {
        const currentPayment: SinglePayment = {
          method: methodConfig?.display_name || currentMethod,
          methodName: methodConfig?.name || currentMethod,
          countsAsRealSale: methodConfig?.counts_as_real_sale ?? true,
          amount: currentMethod === 'runas' 
            ? 0 
            : (methodConfig?.requires_change 
                ? Math.min(amount, total) 
                : amount),
          cashGiven: currentMethod === 'efectivo' ? amount : undefined,
          receiptNumber: methodConfig?.requires_receipt ? currentReceiptNumber : undefined,
          operationNumber: methodConfig?.requires_operation_number ? currentOperationNumber : undefined,
          runas: currentMethod === 'runas' ? parseFloat(currentRunas) : undefined,
        };
        
        finalPayments = [currentPayment];
      }
    }
    
    // Validar total pagado (excepto para método pendiente)
    const isPendingPayment = finalPayments.some(p => 
      p.method === 'Pendiente' || p.method === 'pendiente'
    );

    const totalPaid = finalPayments.reduce((sum, payment) => {
      if (payment.method === 'runas' || payment.method === 'Runas') {
        return sum + (payment.runas || 0) * runaRewardValue;
      }
      return sum + payment.amount;
    }, 0);
    
    if (!isPendingPayment && totalPaid < total) {
      toast.error("Error", { description: "El total pagado es menor al total de la venta" });
      setIsSubmitting(false);
      return;
    }

    const paymentData: PaymentData = {
      payments: finalPayments,
      fulfillment: deliveryData?.zone ? 'delivery' : 'retiro',
      notes: notes.trim() || undefined,
    };
    
    try {
      // Llamar onConfirm - el modal se cerrará y el estado se reseteará desde el padre
      onConfirm(paymentData);
    } catch (error) {
      console.error('Error in payment confirmation:', error);
      setIsSubmitting(false);
      toast.error("Error", { description: "No se pudo confirmar el pago" });
    }
  };

  const isValidPayment = () => {
    // Si es método pendiente, siempre es válido
    if (currentMethod === 'pendiente') {
      return true;
    }
    
    // Si hay pagos en la lista y uno es pendiente, es válido
    if (payments.length > 0) {
      const hasPendingPayment = payments.some(p => 
        p.method === 'Pendiente' || p.method === 'pendiente'
      );
      if (hasPendingPayment) return true;
      return getTotalPaid() >= total;
    }
    
    const methodConfig = getCurrentMethodConfig();
    
    // Si no hay pagos en la lista, validar el método actual
    const currentPaymentAmount = getCurrentPaymentAmount();
    
    // Validar que el pago actual cubra el total
    if (currentPaymentAmount < total) {
      return false;
    }
    
    // Validar campos requeridos según método
    if (methodConfig?.requires_receipt && !currentReceiptNumber.trim()) {
      return false;
    }
    
    if (methodConfig?.requires_operation_number && !currentOperationNumber.trim()) {
      return false;
    }
    
    if (currentMethod === 'runas') {
      const runasNum = parseFloat(currentRunas) || 0;
      if (runasNum <= 0 || runasNum > (customer.cantidad_runas || 0)) {
        return false;
      }
    }
    
    if (methodConfig?.requires_change) {
      const amount = parseFloat(currentAmount) || 0;
      if (amount <= 0) {
        return false;
      }
    }
    
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-4 pr-8">
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span>Procesar Pago {payments.length > 1 ? '(Mixto)' : ''}</span>
              {(orderName || customer.name) && (
                <span className="inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-foreground font-medium truncate max-w-[200px]">
                    {orderName || customer.name}
                  </span>
                </span>
              )}
            </DialogTitle>
            <div className="flex items-baseline gap-2 shrink-0">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary currency">{formatPrice(total)}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Quick action buttons: Customer + Coupon */}
        {(onOpenCustomerModal || onOpenCouponModal) && (
          <div className="px-6 pb-2 flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenCustomerModal && (
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={onOpenCustomerModal}
              >
                <User className="w-4 h-4" />
                {customer.id ? customer.name : 'Añadir Cliente'}
                {subscriptionDiscountPercent > 0 && (
                  <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold dark:bg-emerald-900 dark:text-emerald-300">
                    -{subscriptionDiscountPercent}%
                  </span>
                )}
              </Button>
            )}
            {onOpenCouponModal && (
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={onOpenCouponModal}
              >
                <Ticket className="w-4 h-4" />
                {appliedCoupons.length > 0 || manualDiscount
                  ? `${appliedCoupons.length > 0 ? `${appliedCoupons.length} Cupón${appliedCoupons.length > 1 ? 'es' : ''}` : 'Descuento'}`
                  : 'Añadir Cupón'}
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ====== LEFT COLUMN: Order detail + customer ====== */}
          <div className="space-y-3">
          {/* Order / Customer name - compact */}
          {orderName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md text-sm">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Nombre cliente:</span>
              <span className="font-medium text-primary truncate">{orderName}</span>
            </div>
          )}

          {/* Order Summary - Detailed */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {items.map((item, index) => {
                  const itemTotal = (item.basePrice + item.extras.reduce((sum, e) => sum + (e.price * (e.quantity || 1)), 0)) * item.quantity;
                  return (
                    <PaymentItemRow
                      key={index}
                      item={item}
                      itemTotal={itemTotal}
                      formatPrice={formatPrice}
                    />
                  );
                })}
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="currency">{formatPrice(subtotal)}</span>
                  </div>
                  {appliedCoupons.length > 0 && (
                    <>
                      {appliedCoupons.map((coupon, index) => (
                        <div key={index} className="flex justify-between text-sm text-green-600">
                          <span>Cupón {coupon.payload.coupon_code}:</span>
                          <span className="currency">
                            -{formatPrice(Number(coupon.discount_products) + Number(coupon.discount_delivery))}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {manualDiscount && manualDiscount.amount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Descuento Manual ({manualDiscount.type === 'percentage' ? `${manualDiscount.value}%` : formatPrice(manualDiscount.value)}):</span>
                      <span className="currency">-{formatPrice(manualDiscount.amount)}</span>
                    </div>
                  )}
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Delivery:</span>
                      <span className="currency">{formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="currency">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          {deliveryFee > 0 && deliveryData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zona:</span>
                    <span className="font-medium">{deliveryData.zone?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="font-medium text-right">
                      {formatDeliveryAddress(
                        deliveryData.addressLine,
                        deliveryData.addressNumber,
                        deliveryData.comunaName,
                        deliveryData.reference
                      )}
                    </span>
                  </div>
                  {deliveryData.repartidorName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repartidor:</span>
                      <span className="font-medium">{deliveryData.repartidorName}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Costo Delivery (no afecto):</span>
                    <span className="currency">{formatPrice(deliveryFee)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
          {/* ====== RIGHT COLUMN: Payments + notes ====== */}
          <div className="space-y-3">

          {/* Totals header */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center px-3 py-2 bg-primary/5 rounded-md">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total a pagar</span>
              <span className="text-lg font-bold text-primary leading-tight">{formatPrice(total)}</span>
            </div>
            <div className="flex flex-col items-center justify-center px-3 py-2 bg-secondary/10 rounded-md">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Saldo pendiente</span>
              <span className="text-lg font-bold text-secondary leading-tight">{formatPrice(getRemainingBalance())}</span>
            </div>
          </div>

          {/* Payments List */}
          {payments.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Pagos agregados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.method)}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{payment.method}</span>
                          {payment.method === 'Runas' ? (
                            <span className="text-xs text-muted-foreground">
                              {payment.runas} runas = {formatPrice((payment.runas || 0) * runaRewardValue)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(payment.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePayment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total pagado:</span>
                    <span>{formatPrice(getTotalPaid())}</span>
                  </div>
                  {calculateChange() > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                      <span>Vuelto:</span>
                      <span>{formatPrice(calculateChange())}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method Selection */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Agregar método de pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.id}
                    type="button"
                    variant={currentMethod === method.name ? 'default' : 'outline'}
                    className="h-16 flex flex-col gap-2"
                    onClick={() => setCurrentMethod(method.name)}
                  >
                    {getMethodIcon(method.display_name)}
                    <span>{method.display_name}</span>
                  </Button>
                ))}
              </div>

              {/* Payment Details based on selected method */}
              {currentMethod === 'efectivo' && (
                <div className="space-y-3">
                  <Label>Billetes Rápidos</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {cashDenominations.map((denomination) => (
                      <Button
                        key={denomination}
                        variant="outline"
                        className="h-12 flex flex-col gap-1 text-sm font-medium"
                        onClick={() => {
                          const current = parseFloat(currentAmount) || 0;
                          setCurrentAmount((current + denomination).toString());
                        }}
                      >
                        <Banknote className="w-4 h-4" />
                        {formatPrice(denomination)}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      className="h-12 flex flex-col gap-1 text-sm font-medium text-destructive hover:text-destructive"
                      onClick={() => setCurrentAmount('')}
                    >
                      <X className="w-4 h-4" />
                      Borrar
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="efectivo">Con cuánto paga</Label>
                    <Input
                      id="efectivo"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  
                  {/* Mostrar vuelto en tiempo real */}
                  {parseFloat(currentAmount || '0') > getRemainingBalance() && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-500 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          Monto entregado:
                        </span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-400">
                          {formatPrice(parseFloat(currentAmount))}
                        </span>
                      </div>
                      <Separator className="bg-green-300 dark:bg-green-700" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          Vuelto a dar:
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-300">
                          {formatPrice(getCurrentChange())}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentMethod === 'pos' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="pos">Monto POS</Label>
                    <Input
                      id="pos"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="receiptNumber">N° de boleta</Label>
                    <Input
                      id="receiptNumber"
                      placeholder="Número de boleta"
                      value={currentReceiptNumber}
                      onChange={(e) => setCurrentReceiptNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentMethod === 'transferencia' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="mp">Monto transferencia</Label>
                    <Input
                      id="mp"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="operationNumber">N° de operación</Label>
                    <Input
                      id="operationNumber"
                      placeholder="Número de operación"
                      value={currentOperationNumber}
                      onChange={(e) => setCurrentOperationNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentMethod === 'aplicacion' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="aplicacion">Monto aplicación</Label>
                    <Input
                      id="aplicacion"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="operationNumberApp">N° de pedido (Uber/PedidosYa)</Label>
                    <Input
                      id="operationNumberApp"
                      placeholder="Número de pedido"
                      value={currentOperationNumber}
                      onChange={(e) => setCurrentOperationNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {!['efectivo', 'pos', 'transferencia', 'aplicacion', 'runas', 'pendiente', 'colacion', 'canje'].includes(currentMethod) && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`amount-${currentMethod}`}>Monto {getCurrentMethodConfig()?.display_name || currentMethod}</Label>
                    <Input
                      id={`amount-${currentMethod}`}
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  {getCurrentMethodConfig()?.requires_receipt && (
                    <div>
                      <Label htmlFor={`receipt-${currentMethod}`}>N° de boleta</Label>
                      <Input
                        id={`receipt-${currentMethod}`}
                        placeholder="Número de boleta"
                        value={currentReceiptNumber}
                        onChange={(e) => setCurrentReceiptNumber(e.target.value)}
                      />
                    </div>
                  )}
                  {getCurrentMethodConfig()?.requires_operation_number && (
                    <div>
                      <Label htmlFor={`operation-${currentMethod}`}>N° de operación</Label>
                      <Input
                        id={`operation-${currentMethod}`}
                        placeholder="Número de operación"
                        value={currentOperationNumber}
                        onChange={(e) => setCurrentOperationNumber(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}



              {currentMethod === 'runas' && (
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Cliente tiene <strong>{customer.cantidad_runas || 0} runas</strong> disponibles
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Valor: 1 runa = {formatPrice(runaRewardValue)}</span>
                      {getRemainingBalance() > 0 && (
                        <span className="text-primary font-medium">
                          Se necesitan: {Math.ceil(getRemainingBalance() / runaRewardValue)} runas
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="runas">Cantidad de runas a usar</Label>
                    <Input
                      id="runas"
                      type="number"
                      placeholder="0"
                      max={customer.cantidad_runas || 0}
                      value={currentRunas}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (val <= (customer.cantidad_runas || 0)) {
                          setCurrentRunas(e.target.value);
                          setCurrentAmount((val * runaRewardValue).toString());
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor total: {formatPrice(parseInt(currentRunas || '0') * runaRewardValue)}
                    </p>
                  </div>
                </div>
              )}

              {currentMethod === 'pendiente' && (
                <div className="space-y-3">
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      <strong>Pago Pendiente:</strong> El pedido irá a cocina sin pago inmediato. 
                      Podrás cobrarlo posteriormente desde el indicador de "Pagos Pendientes" en la barra superior.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleAddPayment}
                disabled={!currentAmount && !currentRunas && currentMethod !== 'pendiente'}
              >
                <Plus className="h-4 w-4 mr-2" />
                {payments.length > 0 ? 'Agregar otro método de pago' : 'Agregar método de pago (para pago mixto)'}
              </Button>
            </CardContent>
          </Card>

          {/* Order Notes - Collapsible */}
          <Card>
            <Collapsible defaultOpen={!!notes}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Comentarios del Pedido</CardTitle>
                    {notes && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        1
                      </span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Textarea
                    id="order-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agregar comentarios especiales para el pedido..."
                    className="min-h-[80px]"
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t px-6 py-4 flex gap-3 bg-background">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValidPayment() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Procesando...' : (payments.length === 0 ? 'Confirmar Pago' : `Confirmar Pago Mixto (${payments.length} métodos)`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
