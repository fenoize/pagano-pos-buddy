import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChefHat, Package, Truck, Pause, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveOrderBubbleProps {
  order: {
    id: string;
    order_number: number;
    status: string;
    fulfillment: string;
  };
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; pulse?: boolean }> = {
  'Pendiente': { icon: Clock, label: 'Pendiente' },
  'En preparacion': { icon: ChefHat, label: 'En preparación', pulse: true },
  'En pausa': { icon: Pause, label: 'En pausa' },
  'Listo': { icon: Package, label: 'Listo para retiro' },
  'En camino': { icon: Truck, label: 'En camino', pulse: true },
};

export function ActiveOrderBubble({ order }: ActiveOrderBubbleProps) {
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(false);

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['Pendiente'];
  const Icon = config.icon;
  const isDelivery = order.fulfillment === 'Delivery';

  const handleTap = () => {
    if (minimized) {
      setMinimized(false);
      return;
    }
    navigate(`/track/${order.id}`);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMinimized(true);
  };

  // Minimized: small circle
  if (minimized) {
    return (
      <button
        onClick={handleTap}
        className={cn(
          'fixed z-40 bottom-[5.5rem] right-4',
          'w-12 h-12 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-lg flex items-center justify-center',
          'animate-scale-in',
          config.pulse && 'animate-pulse'
        )}
        aria-label="Ver pedido activo"
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }

  // Expanded bubble
  return (
    <div
      onClick={handleTap}
      className={cn(
        'fixed z-40 bottom-[5.5rem] left-4 right-4',
        'bg-primary text-primary-foreground',
        'rounded-2xl shadow-xl',
        'px-4 py-3 cursor-pointer',
        'animate-scale-in',
        'max-w-md mx-auto'
      )}
    >
      {/* Close / minimize button */}
      <button
        onClick={handleMinimize}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
        aria-label="Minimizar"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center',
          config.pulse && 'animate-pulse'
        )}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">
            Pedido #{order.order_number}
          </p>
          <p className="text-xs opacity-80 leading-tight mt-0.5">
            {config.label} · {isDelivery ? 'Delivery' : 'Retiro'}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 flex-shrink-0 opacity-70" />
      </div>
    </div>
  );
}
