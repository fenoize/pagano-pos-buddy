 import React, { useState, useEffect } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Separator } from '@/components/ui/separator';
 import { 
   Banknote, 
   CreditCard, 
   Smartphone, 
   AppWindow,
   Package,
   CircleDollarSign
 } from 'lucide-react';
import { PendingPaymentOrder, PaymentCollectionData } from '@/hooks/usePendingPaymentOrders';
 import { formatCurrency } from '@/lib/utils';
 import { useToast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 
 interface CollectPaymentModalProps {
   isOpen: boolean;
   onClose: () => void;
   order: PendingPaymentOrder;
  onCollectPayment: (orderId: string, paymentData: PaymentCollectionData) => Promise<boolean>;
 }
 
 interface PaymentMethodOption {
   id: string;
   name: string;
   display_name: string;
   icon: string;
   requires_receipt?: boolean;
   requires_operation_number?: boolean;
 }
 
export function CollectPaymentModal({ isOpen, onClose, order, onCollectPayment }: CollectPaymentModalProps) {
   const [selectedMethod, setSelectedMethod] = useState('efectivo');
   const [amount, setAmount] = useState(order.total.toString());
   const [receiptNumber, setReceiptNumber] = useState('');
   const [operationNumber, setOperationNumber] = useState('');
   const [loading, setLoading] = useState(false);
   const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
   const { toast } = useToast();
 
   useEffect(() => {
     if (isOpen) {
       setAmount(order.total.toString());
       setSelectedMethod('efectivo');
       setReceiptNumber('');
       setOperationNumber('');
       fetchPaymentMethods();
     }
   }, [isOpen, order.total]);
 
   const fetchPaymentMethods = async () => {
     const { data } = await supabase
       .from('payment_methods')
       .select('*')
       .eq('is_active', true)
       .neq('name', 'pendiente') // Excluir "Pendiente" de las opciones
       .neq('name', 'runas') // Excluir "Runas" (requiere cliente)
       .order('display_order');
 
     if (data) {
       setPaymentMethods(data);
     }
   };
 
   const getMethodIcon = (iconName: string) => {
     switch (iconName) {
       case 'Banknote': return <Banknote className="h-5 w-5" />;
       case 'CreditCard': return <CreditCard className="h-5 w-5" />;
       case 'Smartphone': return <Smartphone className="h-5 w-5" />;
       case 'AppWindow': return <AppWindow className="h-5 w-5" />;
       default: return <CircleDollarSign className="h-5 w-5" />;
     }
   };
 
   const getCurrentMethodConfig = () => {
     return paymentMethods.find(m => m.name === selectedMethod);
   };
 
   const handleConfirm = async () => {
     const amountValue = parseFloat(amount) || 0;
     
     if (amountValue < order.total) {
       toast({
         title: 'Error',
         description: 'El monto debe cubrir el total del pedido',
         variant: 'destructive'
       });
       return;
     }
 
     const methodConfig = getCurrentMethodConfig();
     
     if (methodConfig?.requires_receipt && !receiptNumber.trim()) {
       toast({
         title: 'Error',
         description: 'Ingrese el número de boleta',
         variant: 'destructive'
       });
       return;
     }
 
     if (methodConfig?.requires_operation_number && !operationNumber.trim()) {
       toast({
         title: 'Error',
         description: 'Ingrese el número de operación',
         variant: 'destructive'
       });
       return;
     }
 
     setLoading(true);
     
    const success = await onCollectPayment(order.id, {
       method: methodConfig?.display_name || selectedMethod,
       amount: order.total,
       receiptNumber: receiptNumber || undefined,
       operationNumber: operationNumber || undefined
     });
 
     setLoading(false);
 
     if (success) {
       onClose();
     }
   };
 
   const change = Math.max(0, (parseFloat(amount) || 0) - order.total);
 
   return (
     <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <CircleDollarSign className="h-5 w-5 text-primary" />
             Cobrar Pedido #{order.order_number}
           </DialogTitle>
           <DialogDescription>
             Registra el pago para este pedido pendiente
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4">
           {/* Resumen del pedido */}
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center gap-2">
                 <Package className="h-4 w-4" />
                 Resumen
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-2 text-sm">
                {order.items.map((item, idx) => {
                  const name = item.product_name || item.productName || item.name || 'Producto';
                  const price = item.unit_price ?? item.basePrice ?? item.price ?? 0;
                  return (
                    <div key={idx} className="flex justify-between">
                      <span>{item.quantity}x {name}</span>
                      <span>{formatCurrency(price * item.quantity)}</span>
                    </div>
                  );
                })}
               <Separator />
               <div className="flex justify-between font-bold">
                 <span>Total a cobrar:</span>
                 <span className="text-primary">{formatCurrency(order.total)}</span>
               </div>
             </CardContent>
           </Card>
 
           {/* Selección de método de pago */}
           <div className="space-y-2">
             <Label>Método de pago</Label>
             <div className="grid grid-cols-2 gap-2">
               {paymentMethods.map((method) => (
                 <Button
                   key={method.id}
                   type="button"
                   variant={selectedMethod === method.name ? 'default' : 'outline'}
                   className="h-14 flex flex-col gap-1"
                   onClick={() => setSelectedMethod(method.name)}
                 >
                   {getMethodIcon(method.icon)}
                   <span className="text-xs">{method.display_name}</span>
                 </Button>
               ))}
             </div>
           </div>
 
           {/* Campo de monto (para efectivo, mostrar vuelto) */}
           {selectedMethod === 'efectivo' && (
             <div className="space-y-2">
               <Label htmlFor="amount">Con cuánto paga</Label>
               <Input
                 id="amount"
                 type="number"
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 placeholder="0"
               />
               {change > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                   <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">Vuelto:</span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(change)}</span>
                   </div>
                 </div>
               )}
             </div>
           )}
 
           {/* Campos adicionales según método */}
           {getCurrentMethodConfig()?.requires_receipt && (
             <div className="space-y-2">
               <Label htmlFor="receipt">N° de boleta</Label>
               <Input
                 id="receipt"
                 value={receiptNumber}
                 onChange={(e) => setReceiptNumber(e.target.value)}
                 placeholder="Número de boleta"
               />
             </div>
           )}
 
           {getCurrentMethodConfig()?.requires_operation_number && (
             <div className="space-y-2">
               <Label htmlFor="operation">N° de operación</Label>
               <Input
                 id="operation"
                 value={operationNumber}
                 onChange={(e) => setOperationNumber(e.target.value)}
                 placeholder="Número de operación"
               />
             </div>
           )}
         </div>
 
         <DialogFooter className="gap-2">
           <Button variant="outline" onClick={onClose} disabled={loading}>
             Cancelar
           </Button>
           <Button onClick={handleConfirm} disabled={loading}>
             {loading ? 'Procesando...' : `Cobrar ${formatCurrency(order.total)}`}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }