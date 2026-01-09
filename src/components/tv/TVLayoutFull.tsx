import { ReadyOrderCard } from './ReadyOrderCard';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';

interface TVLayoutFullProps {
  orders: Order[];
  recentlyReady: Set<string>;
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

export function TVLayoutFull({ orders, recentlyReady, columns = 4, fontSize = 'medium' }: TVLayoutFullProps) {
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
      <div className={cn("grid gap-6", getGridCols(columns))}>
        {orders.map(order => (
          <ReadyOrderCard 
            key={order.id} 
            order={order}
            isRecent={recentlyReady.has(order.id)}
            fontSize={fontSize}
          />
        ))}
      </div>
    </div>
  );
}