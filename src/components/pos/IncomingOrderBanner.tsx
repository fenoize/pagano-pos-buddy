 import { useEffect, useRef, useState } from 'react';
 import { Package, Truck, Bell, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { useIncomingOrders, IncomingOrder } from '@/hooks/useIncomingOrders';
 import { IncomingOrderModal } from './IncomingOrderModal';
 import { IncomingOrderSound } from './IncomingOrderSound';
 import { formatCurrency } from '@/lib/utils';
 import { cn } from '@/lib/utils';
 
 export function IncomingOrderBanner() {
   const {
     orders,
     loading,
     accepting,
     acceptOrder,
     deliveryPersons,
     deliveryAssignmentMode,
     canAcceptAppOrders,
     newOrderArrived,
     clearNewOrderFlag
   } = useIncomingOrders();
 
  const [selectedOrder, setSelectedOrder] = useState<IncomingOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [soundKey, setSoundKey] = useState(0);
  // Track how many orders the cashier has already dismissed (minimized).
  // Auto-open the modal only when orders.length exceeds this threshold,
  // so minimizing keeps the modal closed until a NEW pending order arrives.
  const dismissedCountRef = useRef(0);

  // Clamp dismissed count if orders were accepted/decreased
  if (dismissedCountRef.current > orders.length) {
    dismissedCountRef.current = orders.length;
  }

  // Cuando el hook detecta un pedido nuevo → forzar remount del sonido
  useEffect(() => {
    if (newOrderArrived) {
      setSoundKey(k => k + 1);
      clearNewOrderFlag();
    }
  }, [newOrderArrived, clearNewOrderFlag]);

  // Auto-open modal whenever there are more pending orders than dismissed
  useEffect(() => {
    if (!canAcceptAppOrders) return;
    if (orders.length > dismissedCountRef.current && !modalOpen) {
      setSelectedOrder(orders[0]);
      setModalOpen(true);
    }
  }, [orders, canAcceptAppOrders, modalOpen]);

  // Don't render if no active session or no orders
  if (!canAcceptAppOrders || orders.length === 0) {
    return null;
  }

  const handleViewDetails = (order: IncomingOrder) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
    // Remember current pending count so we don't immediately reopen
    dismissedCountRef.current = orders.length;
  };
 
   const handleQuickAccept = async (order: IncomingOrder) => {
     // Quick accept only for pickup orders or delivery in pool mode
     if (order.fulfillment === 'delivery' && deliveryAssignmentMode === 'assigned') {
       handleViewDetails(order);
       return;
     }
     await acceptOrder(order.id);
   };
 
   const getCustomerName = (order: IncomingOrder) => {
     if (order.customer?.nombres) {
       return `${order.customer.nombres} ${order.customer.apellidos || ''}`.trim();
     }
     return order.customer?.name || 'Cliente';
   };
 
   const getItemCount = (order: IncomingOrder) => {
     return order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
   };
 
   // Show latest order in banner
   const latestOrder = orders[0];
   const additionalCount = orders.length - 1;
 
   return (
     <>
       {/* Sound component */}
        <IncomingOrderSound
          enabled={soundEnabled}
          newOrderArrived={orders.length > 0}
          onSoundPlayed={clearNewOrderFlag}
          persistent
        />
 
       {/* Banner */}
       <div
         className={cn(
           "bg-primary text-primary-foreground border-b transition-all",
           "animate-pulse-slow"
         )}
         style={{
           animation: newOrderArrived ? 'pulse 1s ease-in-out 3' : undefined
         }}
       >
         {/* Header with collapse toggle */}
         <div className="flex items-center justify-between px-4 py-2">
           <div className="flex items-center gap-2">
             <Bell className="h-5 w-5" />
             <span className="font-semibold">
               {orders.length} pedido{orders.length > 1 ? 's' : ''} pendiente{orders.length > 1 ? 's' : ''}
             </span>
           </div>
           <div className="flex items-center gap-2">
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
               onClick={() => setSoundEnabled(!soundEnabled)}
               title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
             >
               {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
             </Button>
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
               onClick={() => setCollapsed(!collapsed)}
             >
               {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
             </Button>
           </div>
         </div>
 
         {/* Order cards (collapsible) */}
         {!collapsed && (
           <div className="px-4 pb-3 space-y-2">
             {orders.slice(0, 3).map((order) => (
               <div
                 key={order.id}
                 className="bg-primary-foreground/10 rounded-lg p-3 flex items-center justify-between gap-3"
               >
                 {/* Order info */}
                 <div className="flex items-center gap-3 flex-1 min-w-0">
                   {/* Fulfillment icon */}
                   <div className={cn(
                     "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                     order.fulfillment === 'delivery' 
                       ? "bg-accent/50" 
                       : "bg-secondary/50"
                   )}>
                     {order.fulfillment === 'delivery' ? (
                       <Truck className="h-5 w-5" />
                     ) : (
                       <Package className="h-5 w-5" />
                     )}
                   </div>
 
                   {/* Order details */}
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                       <span className="font-bold">#{order.order_number}</span>
                       <Badge variant="outline" className="text-xs border-primary-foreground/30">
                         {order.fulfillment === 'delivery' ? 'Delivery' : 'Retiro'}
                       </Badge>
                     </div>
                     <div className="text-sm opacity-90 truncate">
                       {getCustomerName(order)} • {getItemCount(order)} item{getItemCount(order) > 1 ? 's' : ''} • {formatCurrency(order.total)}
                     </div>
                   </div>
                 </div>
 
                 {/* Actions */}
                 <div className="flex items-center gap-2 flex-shrink-0">
                   <Button
                     variant="outline"
                     size="sm"
                     className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
                     onClick={() => handleViewDetails(order)}
                   >
                     Ver
                   </Button>
                   {/* Quick accept button - only for pickup or pool mode */}
                   {(order.fulfillment === 'retiro' || deliveryAssignmentMode === 'pool') && (
                     <Button
                       size="sm"
                       className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                       onClick={() => handleQuickAccept(order)}
                       disabled={accepting}
                     >
                       Aceptar
                     </Button>
                   )}
                   {/* For delivery with assigned mode, show "Asignar" button */}
                   {order.fulfillment === 'delivery' && deliveryAssignmentMode === 'assigned' && (
                     <Button
                       size="sm"
                       className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                       onClick={() => handleViewDetails(order)}
                       disabled={accepting}
                     >
                       Asignar
                     </Button>
                   )}
                 </div>
               </div>
             ))}
 
             {/* Show more indicator */}
             {additionalCount > 2 && (
               <div className="text-center text-sm opacity-75">
                 +{additionalCount - 2} pedido{additionalCount > 3 ? 's' : ''} más
               </div>
             )}
           </div>
         )}
       </div>
 
       {/* Order details modal */}
       <IncomingOrderModal
         order={selectedOrder}
         open={modalOpen}
         onClose={handleCloseModal}
         onAccept={acceptOrder}
         deliveryPersons={deliveryPersons}
         deliveryAssignmentMode={deliveryAssignmentMode}
         accepting={accepting}
       />
     </>
   );
 }