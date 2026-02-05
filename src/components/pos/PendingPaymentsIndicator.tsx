 import React, { useState } from 'react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { CircleDollarSign } from 'lucide-react';
 import { usePendingPaymentOrders } from '@/hooks/usePendingPaymentOrders';
 import { PendingPaymentsPanel } from './PendingPaymentsPanel';
 import { formatCurrency } from '@/lib/utils';
 
 export function PendingPaymentsIndicator() {
   const { count, totalAmount, loading } = usePendingPaymentOrders();
   const [showPanel, setShowPanel] = useState(false);
 
   if (loading) return null;
   
   const hasOrders = count > 0;
 
   return (
     <>
       <Button
         variant="ghost"
         size="sm"
         className="relative"
         onClick={() => setShowPanel(true)}
         title={hasOrders ? `${count} pedidos pendientes por ${formatCurrency(totalAmount)}` : 'Sin pedidos pendientes de pago'}
       >
         <CircleDollarSign 
           className={`h-5 w-5 ${hasOrders ? 'text-amber-500' : 'text-muted-foreground'}`} 
         />
         {hasOrders && (
           <Badge 
             variant="destructive" 
             className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center animate-pulse"
           >
             {count}
           </Badge>
         )}
       </Button>
 
       <PendingPaymentsPanel
         open={showPanel}
         onOpenChange={setShowPanel}
       />
     </>
   );
 }