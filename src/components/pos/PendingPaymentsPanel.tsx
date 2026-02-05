 import React, { useState } from 'react';
 import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent } from '@/components/ui/card';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { 
   CircleDollarSign, 
   Clock, 
   MapPin, 
   Package, 
   User,
   AlertTriangle
 } from 'lucide-react';
 import { usePendingPaymentOrders, PendingPaymentOrder } from '@/hooks/usePendingPaymentOrders';
 import { CollectPaymentModal } from './CollectPaymentModal';
 import { formatCurrency } from '@/lib/utils';
 
 interface PendingPaymentsPanelProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function PendingPaymentsPanel({ open, onOpenChange }: PendingPaymentsPanelProps) {
   const { 
     currentSessionOrders, 
     inheritedOrders, 
     count, 
     totalAmount, 
     loading 
   } = usePendingPaymentOrders();
   const [selectedOrder, setSelectedOrder] = useState<PendingPaymentOrder | null>(null);
   const [showCollectModal, setShowCollectModal] = useState(false);
 
   const handleCollect = (order: PendingPaymentOrder) => {
     setSelectedOrder(order);
     setShowCollectModal(true);
   };
 
   const formatTime = (dateString: string) => {
     return new Date(dateString).toLocaleTimeString('es-CL', {
       hour: '2-digit',
       minute: '2-digit'
     });
   };
 
   const OrderCard = ({ order, isInherited = false }: { order: PendingPaymentOrder; isInherited?: boolean }) => (
     <Card className={`mb-3 ${isInherited ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
       <CardContent className="p-4">
         <div className="flex items-start justify-between mb-3">
           <div>
             <div className="flex items-center gap-2">
               <span className="font-bold text-lg">#{order.order_number}</span>
               {isInherited && (
                 <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                   <AlertTriangle className="h-3 w-3 mr-1" />
                   Heredado
                 </Badge>
               )}
             </div>
             <div className="flex items-center gap-1 text-sm text-muted-foreground">
               <Clock className="h-3 w-3" />
               <span>{formatTime(order.created_at)}</span>
             </div>
           </div>
           <div className="text-right">
             <div className="font-bold text-lg text-primary">
               {formatCurrency(order.total)}
             </div>
             <Badge variant="secondary" className="text-xs">
               {order.fulfillment === 'delivery' ? 'Delivery' : 'Retiro'}
             </Badge>
           </div>
         </div>
 
         {(order.customer_name || order.nombre_resumen) && (
           <div className="flex items-center gap-2 text-sm mb-2">
             <User className="h-4 w-4 text-muted-foreground" />
             <span>{order.customer_name || order.nombre_resumen}</span>
           </div>
         )}
 
         {order.fulfillment === 'delivery' && order.delivery_address && (
           <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
             <MapPin className="h-4 w-4" />
             <span className="truncate">{order.delivery_address}</span>
           </div>
         )}
 
         <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
           <Package className="h-4 w-4" />
           <span>{order.items.length} producto(s)</span>
         </div>
 
         {order.items.length > 0 && (
           <div className="text-xs text-muted-foreground mb-3 pl-6 space-y-1">
             {order.items.slice(0, 3).map((item, idx) => (
               <div key={idx}>
                 {item.quantity}x {item.product_name}
                 {item.variant_name && ` (${item.variant_name})`}
               </div>
             ))}
             {order.items.length > 3 && (
               <div className="text-muted-foreground">
                 +{order.items.length - 3} más...
               </div>
             )}
           </div>
         )}
 
         <Button 
           onClick={() => handleCollect(order)} 
           className="w-full"
           size="sm"
         >
           <CircleDollarSign className="h-4 w-4 mr-2" />
           Cobrar {formatCurrency(order.total)}
         </Button>
       </CardContent>
     </Card>
   );
 
   return (
     <>
       <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent className="w-full sm:max-w-md">
           <SheetHeader>
             <SheetTitle className="flex items-center gap-2">
               <CircleDollarSign className="h-5 w-5 text-amber-500" />
               Pedidos Pendientes de Pago
             </SheetTitle>
             <SheetDescription>
               {count > 0 
                 ? `${count} pedido(s) por cobrar - Total: ${formatCurrency(totalAmount)}`
                 : 'No hay pedidos pendientes de pago'
               }
             </SheetDescription>
           </SheetHeader>
 
           {loading ? (
             <div className="flex items-center justify-center h-40">
               <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
             </div>
           ) : count === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
               <CircleDollarSign className="h-12 w-12 mb-3 opacity-30" />
               <p>No hay pedidos pendientes</p>
             </div>
           ) : (
             <Tabs defaultValue="current" className="mt-4">
               <TabsList className="grid w-full grid-cols-2">
                 <TabsTrigger value="current" className="relative">
                   Mi Turno
                   {currentSessionOrders.length > 0 && (
                     <Badge className="ml-2 h-5 min-w-5 px-1">{currentSessionOrders.length}</Badge>
                   )}
                 </TabsTrigger>
                 <TabsTrigger value="inherited" className="relative">
                   Heredados
                   {inheritedOrders.length > 0 && (
                     <Badge variant="outline" className="ml-2 h-5 min-w-5 px-1 text-amber-600 border-amber-300">
                       {inheritedOrders.length}
                     </Badge>
                   )}
                 </TabsTrigger>
               </TabsList>
 
               <TabsContent value="current" className="mt-4">
                 <ScrollArea className="h-[calc(100vh-280px)]">
                   {currentSessionOrders.length === 0 ? (
                     <div className="text-center text-muted-foreground py-8">
                       Sin pedidos pendientes en este turno
                     </div>
                   ) : (
                     currentSessionOrders.map(order => (
                       <OrderCard key={order.id} order={order} />
                     ))
                   )}
                 </ScrollArea>
               </TabsContent>
 
               <TabsContent value="inherited" className="mt-4">
                 <ScrollArea className="h-[calc(100vh-280px)]">
                   {inheritedOrders.length === 0 ? (
                     <div className="text-center text-muted-foreground py-8">
                       Sin pedidos heredados de turnos anteriores
                     </div>
                   ) : (
                     <>
                       <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                         <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                           <AlertTriangle className="h-4 w-4" />
                           <span>
                             Estos pedidos fueron creados en turnos anteriores y aún no han sido cobrados.
                           </span>
                         </div>
                       </div>
                       {inheritedOrders.map(order => (
                         <OrderCard key={order.id} order={order} isInherited />
                       ))}
                     </>
                   )}
                 </ScrollArea>
               </TabsContent>
             </Tabs>
           )}
         </SheetContent>
       </Sheet>
 
       {selectedOrder && (
         <CollectPaymentModal
           isOpen={showCollectModal}
           onClose={() => {
             setShowCollectModal(false);
             setSelectedOrder(null);
           }}
           order={selectedOrder}
         />
       )}
     </>
   );
 }