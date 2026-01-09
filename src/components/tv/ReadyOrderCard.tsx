import { Store, Truck, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface ReadyOrderCardProps {
  order: Order;
  isRecent?: boolean;
  compact?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  isDelivered?: boolean; // Nuevo: indica si el pedido está entregado
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

export function ReadyOrderCard({ order, isRecent = false, compact = false, fontSize = 'medium', isDelivered = false }: ReadyOrderCardProps) {
  const customerName = order.customer?.name || order.nombre_resumen || null;
  
  // Use compact sizing for split layouts, but respect fontSize preference
  const effectiveSize = compact ? 'small' : fontSize;
  const sizes = fontSizeClasses[effectiveSize];

  // Determinar estilo según estado
  const isEntregado = isDelivered || order.status === 'Entregado';
  const isEnPreparacion = order.status === 'En preparación';
  
  return (
    <Card className={cn(
      "flex flex-col items-center justify-center transition-all duration-300",
      "border-2",
      sizes.card,
      // Fondo según estado
      isEntregado 
        ? "bg-green-500 dark:bg-green-600 border-green-600" 
        : isEnPreparacion
          ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700"
          : "bg-card border-border",
      // Animación para recientes
      isRecent && !isEntregado && "animate-pulse ring-4 ring-green-500 ring-opacity-75 border-green-500",
      isRecent && isEntregado && "animate-pulse ring-4 ring-green-300 ring-opacity-75"
    )}>
      {/* Icono de entregado */}
      {isEntregado && (
        <div className="absolute top-2 right-2">
          <Check className={cn("text-white", sizes.icon)} strokeWidth={3} />
        </div>
      )}

      {/* Order number - very prominent */}
      <div className={cn(
        "font-black",
        sizes.orderNumber,
        isEntregado ? "text-white" : "text-primary"
      )}>
        #{order.order_number}
      </div>
      
      {/* Estado del pedido */}
      <Badge 
        variant={isEntregado ? "secondary" : isEnPreparacion ? "outline" : "default"}
        className={cn(
          "mt-2",
          sizes.badge,
          isEntregado && "bg-green-700 text-white border-green-800",
          isEnPreparacion && "bg-amber-200 text-amber-800 border-amber-400 dark:bg-amber-800 dark:text-amber-100"
        )}
      >
        {order.status}
      </Badge>
      
      {/* Fulfillment type - solo mostrar si es retiro */}
      <div className={cn(
        "mt-2 flex items-center gap-2 font-medium",
        sizes.fulfillment,
        isEntregado ? "text-green-100" : "text-foreground"
      )}>
        <Store className={cn(sizes.icon, isEntregado ? "text-green-100" : "text-blue-500")} />
        <span>Retiro</span>
      </div>
      
      {/* Customer name */}
      {customerName && (
        <div className={cn(
          "mt-2 truncate max-w-full px-2",
          sizes.customer,
          isEntregado ? "text-green-100" : "text-muted-foreground"
        )}>
          {customerName}
        </div>
      )}
      
      {/* Pickup mode badge - only for retiro */}
      {order.pickup_mode && (
        <Badge 
          variant="outline"
          className={cn(
            "mt-2 px-4 py-1 font-semibold",
            sizes.badge,
            isEntregado 
              ? "bg-green-700 text-green-100 border-green-500"
              : order.pickup_mode === 'servir' 
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