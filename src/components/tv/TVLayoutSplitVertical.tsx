import { ReadyOrderCard } from './ReadyOrderCard';
import { PromoSlider } from './PromoSlider';
import type { Order } from '@/types';

interface TVLayoutSplitVerticalProps {
  orders: Order[];
  recentlyReady: Set<string>;
  sliderInterval: number;
}

export function TVLayoutSplitVertical({ orders, recentlyReady, sliderInterval }: TVLayoutSplitVerticalProps) {
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
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
    </div>
  );
}
