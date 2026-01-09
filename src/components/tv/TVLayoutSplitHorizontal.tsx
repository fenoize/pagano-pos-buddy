import { ReadyOrderCard } from './ReadyOrderCard';
import { PromoSlider } from './PromoSlider';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';

interface TVLayoutSplitHorizontalProps {
  orders: Order[];
  recentlyReady: Set<string>;
  recentlyDelivered?: Set<string>;
  sliderInterval: number;
  columns?: number;
  fontSize?: 'small' | 'medium' | 'large';
}

const getGridCols = (columns: number) => {
  const effectiveCols = Math.max(2, columns - 1);
  switch (effectiveCols) {
    case 2: return 'grid-cols-1 md:grid-cols-2';
    case 3: return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    case 4: return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
    default: return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  }
};

export function TVLayoutSplitHorizontal({ 
  orders, 
  recentlyReady, 
  recentlyDelivered = new Set(),
  sliderInterval,
  columns = 4,
  fontSize = 'medium'
}: TVLayoutSplitHorizontalProps) {
  return (
    <div className="flex-1 flex">
      {/* Left side: Orders */}
      <div className="w-1/2 p-4 overflow-auto border-r border-border/50">
        {orders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-3xl mb-2">🍔</p>
              <p className="text-xl font-medium">No hay pedidos listos</p>
            </div>
          </div>
        ) : (
          <div className={cn("grid gap-4", getGridCols(columns))}>
            {orders.map(order => (
              <ReadyOrderCard 
                key={order.id} 
                order={order}
                isRecent={recentlyReady.has(order.id) || recentlyDelivered.has(order.id)}
                compact
                fontSize={fontSize}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right side: Promotions */}
      <div className="w-1/2">
        <PromoSlider interval={sliderInterval} className="h-full" />
      </div>
    </div>
  );
}