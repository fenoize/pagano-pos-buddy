import { ReadyOrderCard } from './ReadyOrderCard';
import type { Order } from '@/types';

interface TVLayoutFullProps {
  orders: Order[];
  recentlyReady: Set<string>;
}

export function TVLayoutFull({ orders, recentlyReady }: TVLayoutFullProps) {
  if (orders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-4xl mb-2">🍔</p>
          <p className="text-2xl font-medium">No hay pedidos listos</p>
          <p className="text-lg">Los pedidos aparecerán aquí cuando estén listos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {orders.map(order => (
          <ReadyOrderCard 
            key={order.id} 
            order={order}
            isRecent={recentlyReady.has(order.id)}
          />
        ))}
      </div>
    </div>
  );
}
