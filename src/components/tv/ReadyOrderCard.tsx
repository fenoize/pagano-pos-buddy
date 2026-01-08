import { Store, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface ReadyOrderCardProps {
  order: Order;
  isRecent?: boolean;
}

export function ReadyOrderCard({ order, isRecent = false }: ReadyOrderCardProps) {
  const customerName = order.customer?.name || order.nombre_resumen || null;
  
  return (
    <Card className={cn(
      "min-h-[220px] flex flex-col items-center justify-center p-6 transition-all duration-300",
      "bg-card border-2",
      isRecent && "animate-pulse ring-4 ring-green-500 ring-opacity-75 border-green-500"
    )}>
      {/* Order number - very prominent */}
      <div className="text-6xl md:text-7xl font-black text-primary">
        #{order.order_number}
      </div>
      
      {/* Fulfillment type */}
      <div className="mt-4 flex items-center gap-2 text-xl md:text-2xl font-medium text-foreground">
        {order.fulfillment === 'delivery' ? (
          <>
            <Truck className="w-7 h-7 md:w-8 md:h-8 text-orange-500" />
            <span>Delivery</span>
          </>
        ) : (
          <>
            <Store className="w-7 h-7 md:w-8 md:h-8 text-blue-500" />
            <span>Retiro</span>
          </>
        )}
      </div>
      
      {/* Customer name */}
      {customerName && (
        <div className="mt-3 text-lg md:text-xl text-muted-foreground truncate max-w-full px-2">
          {customerName}
        </div>
      )}
      
      {/* Pickup mode badge - only for retiro */}
      {order.fulfillment === 'retiro' && order.pickup_mode && (
        <Badge 
          variant="outline"
          className={cn(
            "mt-3 text-base md:text-lg px-4 py-1 font-semibold",
            order.pickup_mode === 'servir' 
              ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
              : "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700"
          )}
        >
          {order.pickup_mode === 'servir' ? 'SERVIR' : 'LLEVAR'}
        </Badge>
      )}
    </Card>
  );
}
