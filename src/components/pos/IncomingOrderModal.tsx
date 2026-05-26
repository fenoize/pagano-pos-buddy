 import { useState } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Label } from '@/components/ui/label';
 import { Separator } from '@/components/ui/separator';
 import { Package, Truck, User, Phone, MapPin, Clock } from 'lucide-react';
 import { IncomingOrder, DeliveryPerson } from '@/hooks/useIncomingOrders';
 import { formatCurrency } from '@/lib/utils';
 import { format } from 'date-fns';
 import { es } from 'date-fns/locale';
 
 interface IncomingOrderModalProps {
   order: IncomingOrder | null;
   open: boolean;
   onClose: () => void;
   onAccept: (orderId: string, deliveryPersonId?: string) => Promise<boolean>;
   deliveryPersons: DeliveryPerson[];
   deliveryAssignmentMode: 'assigned' | 'pool';
   accepting: boolean;
 }
 
 export function IncomingOrderModal({
   order,
   open,
   onClose,
   onAccept,
   deliveryPersons,
   deliveryAssignmentMode,
   accepting
 }: IncomingOrderModalProps) {
   const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<string>('');
 
   if (!order) return null;
 
   const isDelivery = order.fulfillment === 'delivery';
   const requiresDeliveryPerson = isDelivery && deliveryAssignmentMode === 'assigned';
   
  const customerName = order.customer?.nombres 
    ? `${order.customer.nombres} ${order.customer.apellidos || ''}`.trim()
    : order.customer?.name || order.nombre_resumen || 'Cliente';
 
   const handleAccept = async () => {
     const success = await onAccept(
       order.id, 
       requiresDeliveryPerson ? selectedDeliveryPerson : undefined
     );
     if (success) {
       setSelectedDeliveryPerson('');
       onClose();
     }
   };
 
   const getPaymentMethodLabel = () => {
     if (order.payment_mp > 0) return 'MercadoPago';
     if (order.payment_runas > 0) return 'Runas';
     if (order.payment_efectivo > 0) return 'Efectivo';
     if (order.payment_pos > 0) return 'POS';
     return 'Mixto';
   };
 
   return (
     <Dialog open={open} onOpenChange={onClose}>
       <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="text-center text-xl">
             Nuevo Pedido #{order.order_number}
           </DialogTitle>
         </DialogHeader>
 
         {/* Fulfillment Type Badge */}
         <div className={`
           p-4 rounded-lg text-center font-bold text-2xl flex items-center justify-center gap-3
           ${isDelivery 
             ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
             : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}
         `}>
           {isDelivery ? (
             <>
               <Truck className="h-8 w-8" />
               DELIVERY
             </>
           ) : (
             <>
               <Package className="h-8 w-8" />
               RETIRO
             </>
           )}
         </div>
 
         {/* Delivery Address */}
         {isDelivery && order.delivery_address && (
           <div className="flex items-start gap-2 text-sm bg-muted p-3 rounded-lg">
             <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
             <span>{order.delivery_address}</span>
           </div>
         )}
 
         {/* Customer Info */}
         <div className="space-y-2">
           <div className="flex items-center gap-2 text-sm">
             <User className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium">{customerName}</span>
           </div>
           {order.customer?.phone && (
             <div className="flex items-center gap-2 text-sm">
               <Phone className="h-4 w-4 text-muted-foreground" />
               <span>{order.customer.phone}</span>
             </div>
           )}
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Clock className="h-4 w-4" />
             <span>
               {format(new Date(order.created_at), "HH:mm 'hrs'", { locale: es })}
             </span>
           </div>
         </div>
 
         <Separator />
 
         {/* Order Items */}
         <div className="space-y-2">
           <h4 className="font-semibold text-sm text-muted-foreground">Productos</h4>
           <div className="space-y-2 max-h-48 overflow-y-auto">
             {order.items.map((item, index) => (
               <div key={index} className="text-sm space-y-1">
                 <div className="flex justify-between">
                   <span className="font-medium">
                     {item.quantity}x {item.productName}
                     {item.variant_name && <span className="text-muted-foreground"> ({item.variant_name})</span>}
                   </span>
                   <span>{formatCurrency(item.basePrice * item.quantity)}</span>
                 </div>
                 {/* Extras */}
                 {item.extras && item.extras.length > 0 && (
                   <div className="pl-4 text-xs text-muted-foreground">
                     {item.extras.map((extra, i) => (
                       <div key={i} className="flex justify-between">
                         <span>+ {extra.label}</span>
                         <span>{formatCurrency(extra.price)}</span>
                       </div>
                     ))}
                   </div>
                 )}
                 {/* Modifiers */}
                 {item.modifiers && item.modifiers.length > 0 && (
                   <div className="pl-4 text-xs text-muted-foreground">
                     {item.modifiers.map((mod, i) => (
                       <span key={i}>- {mod.name} </span>
                     ))}
                   </div>
                 )}
                 {/* Notes */}
                 {item.notes && (
           <div className="pl-4 text-xs text-accent-foreground">
                     📝 {item.notes}
                   </div>
                 )}
               </div>
             ))}
           </div>
         </div>
 
         <Separator />
 
         {/* Totals */}
         <div className="space-y-1 text-sm">
           <div className="flex justify-between">
             <span>Subtotal</span>
             <span>{formatCurrency(order.subtotal)}</span>
           </div>
           {order.delivery_fee > 0 && (
             <div className="flex justify-between">
               <span>Delivery {order.delivery_zone_name && `(${order.delivery_zone_name})`}</span>
               <span>{formatCurrency(order.delivery_fee)}</span>
             </div>
           )}
           {order.discount > 0 && (
             <div className="flex justify-between text-primary">
               <span>Descuento</span>
               <span>-{formatCurrency(order.discount)}</span>
             </div>
           )}
           <div className="flex justify-between font-bold text-lg pt-2 border-t">
             <span>Total</span>
             <span>{formatCurrency(order.total)}</span>
           </div>
           <div className="text-xs text-muted-foreground text-right">
             Pago: {getPaymentMethodLabel()} ✓
           </div>
         </div>
 
         {/* Delivery Person Selector (only for delivery with 'assigned' mode) */}
         {requiresDeliveryPerson && (
           <>
             <Separator />
             <div className="space-y-2">
               <Label htmlFor="delivery-person" className="text-sm font-medium">
                 Asignar Repartidor
               </Label>
               <Select
                 value={selectedDeliveryPerson}
                 onValueChange={setSelectedDeliveryPerson}
               >
                 <SelectTrigger id="delivery-person">
                   <SelectValue placeholder="Seleccionar repartidor..." />
                 </SelectTrigger>
                 <SelectContent>
                   {deliveryPersons.map((person) => (
                     <SelectItem key={person.id} value={person.id}>
                       {person.full_name || person.username}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </>
         )}
 
         {/* Notes */}
         {order.notes && (
           <div className="bg-muted p-3 rounded-lg text-sm">
             <span className="font-medium">Notas:</span> {order.notes}
           </div>
         )}
 
         {/* Actions */}
         <div className="flex gap-2 pt-2">
           <Button
             variant="outline"
             className="flex-1"
             onClick={onClose}
             disabled={accepting}
           >
             Minimizar
           </Button>
           <Button
             className="flex-1 bg-primary hover:bg-primary/90"
             onClick={handleAccept}
             disabled={accepting || (requiresDeliveryPerson && !selectedDeliveryPerson)}
           >
             {accepting ? 'Aceptando...' : requiresDeliveryPerson ? 'Aceptar y Asignar' : 'Aceptar'}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }