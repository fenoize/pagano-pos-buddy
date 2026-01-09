import { ReadyOrderCard } from './ReadyOrderCard';
import { PromoSlider } from './PromoSlider';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';

interface TVLayoutSplitVerticalProps {
  orders: Order[];
  recentlyReady: Set<string>;
  sliderInterval: number;
  columns?: number;
  fontSize?: 'small' | 'medium' | 'large';
}

const getGridCols = (columns: number) => {
  switch (columns) {
    case 2: return 'grid-cols-2';
    case 3: return 'grid-cols-2 md:grid-cols-3';
    case 4: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    default: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }
};

export function TVLayoutSplitVertical({ 
  orders, 
  recentlyReady, 
  sliderInterval,
  columns = 4,
  fontSize = 'medium'
}: TVLayoutSplitVerticalProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Top: Promotions */}
      <div className="h-2/5">
        <PromoSlider interval={sliderInterval} className="h-full" />
      </div>

      {/* Bottom: Orders */}
      <div className="h-3/5 p-4 overflow-auto border-t border-border/50">
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
                isRecent={recentlyReady.has(order.id)}
                compact
                fontSize={fontSize}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}