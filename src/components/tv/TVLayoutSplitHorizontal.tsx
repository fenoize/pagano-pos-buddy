import { ReadyOrderCard } from './ReadyOrderCard';
import { PromoSlider } from './PromoSlider';
import type { Order } from '@/types';

interface TVLayoutSplitHorizontalProps {
  orders: Order[];
  recentlyReady: Set<string>;
  sliderInterval: number;
}

export function TVLayoutSplitHorizontal({ orders, recentlyReady, sliderInterval }: TVLayoutSplitHorizontalProps) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map(order => (
              <ReadyOrderCard 
                key={order.id} 
                order={order}
                isRecent={recentlyReady.has(order.id)}
                compact
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
