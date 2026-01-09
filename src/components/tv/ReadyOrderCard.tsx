import { Store, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface ReadyOrderCardProps {
  order: Order;
  isRecent?: boolean;
  compact?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

const fontSizeClasses = {
  small: {
    orderNumber: 'text-3xl md:text-4xl',
    fulfillment: 'text-sm md:text-base',
    icon: 'w-4 h-4',
    customer: 'text-sm md:text-base',
    badge: 'text-xs md:text-sm',
    card: 'min-h-[120px] p-3',
  },
  medium: {
    orderNumber: 'text-4xl md:text-5xl',
    fulfillment: 'text-base md:text-lg',
    icon: 'w-5 h-5 md:w-6 md:h-6',
    customer: 'text-base md:text-lg',
    badge: 'text-sm md:text-base',
    card: 'min-h-[160px] p-4',
  },
  large: {
    orderNumber: 'text-6xl md:text-7xl',
    fulfillment: 'text-xl md:text-2xl',
    icon: 'w-7 h-7 md:w-8 md:h-8',
    customer: 'text-lg md:text-xl',
    badge: 'text-base md:text-lg',
    card: 'min-h-[220px] p-6',
  },
};

export function ReadyOrderCard({ order, isRecent = false, compact = false, fontSize = 'medium' }: ReadyOrderCardProps) {
  const customerName = order.customer?.name || order.nombre_resumen || null;
  
  // Use compact sizing for split layouts, but respect fontSize preference
  const effectiveSize = compact ? 'small' : fontSize;
  const sizes = fontSizeClasses[effectiveSize];
  
  return (
    <Card className={cn(
      "flex flex-col items-center justify-center transition-all duration-300",
      "bg-card border-2",
      sizes.card,
      isRecent && "animate-pulse ring-4 ring-green-500 ring-opacity-75 border-green-500"
    )}>
      {/* Order number - very prominent */}
      <div className={cn(
        "font-black text-primary",
        sizes.orderNumber
      )}>
        #{order.order_number}
      </div>
      
      {/* Fulfillment type */}
      <div className={cn(
        "mt-3 flex items-center gap-2 font-medium text-foreground",
        sizes.fulfillment
      )}>
        {order.fulfillment === 'delivery' ? (
          <>
            <Truck className={cn(sizes.icon, "text-orange-500")} />
            <span>Delivery</span>
          </>
        ) : (
          <>
            <Store className={cn(sizes.icon, "text-blue-500")} />
            <span>Retiro</span>
          </>
        )}
      </div>
      
      {/* Customer name */}
      {customerName && (
        <div className={cn(
          "mt-3 text-muted-foreground truncate max-w-full px-2",
          sizes.customer
        )}>
          {customerName}
        </div>
      )}
      
      {/* Pickup mode badge - only for retiro */}
      {order.fulfillment === 'retiro' && order.pickup_mode && (
        <Badge 
          variant="outline"
          className={cn(
            "mt-3 px-4 py-1 font-semibold",
            sizes.badge,
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