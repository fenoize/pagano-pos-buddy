import React, { useEffect, useState } from 'react';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { useKitchenConfig } from '@/hooks/useKitchenConfig';
import { OrderCard } from '@/components/kitchen/OrderCard';
import { KitchenSounds } from '@/components/kitchen/KitchenSounds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';

export default function Kitchen() {
  const { orders, updateOrderStatus, loading } = useKitchenOrders();
  const { config } = useKitchenConfig();
  const [lastOrderCount, setLastOrderCount] = useState(0);

  useEffect(() => {
    if (orders.length > lastOrderCount) {
      // New order arrived
      setLastOrderCount(orders.length);
    }
  }, [orders.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando pedidos...</div>
      </div>
    );
  }

  const activeOrders = orders.filter(order => 
    !['Entregado', 'Cancelado'].includes(order.status)
  );

  const pendingOrders = activeOrders.filter(order => order.status === 'Pendiente');
  const inProgressOrders = activeOrders.filter(order => order.status === 'En preparación');
  const pausedOrders = activeOrders.filter(order => order.status === 'En pausa');
  const readyOrders = activeOrders.filter(order => order.status === 'Listo');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cocina - KDS</h1>
        
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{activeOrders.length} pedidos activos</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">Pendientes: {pendingOrders.length}</Badge>
            <Badge variant="default">En preparación: {inProgressOrders.length}</Badge>
            <Badge variant="outline">En pausa: {pausedOrders.length}</Badge>
            <Badge variant="destructive">Listos: {readyOrders.length}</Badge>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {activeOrders.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay pedidos pendientes</h3>
              <p className="text-sm text-muted-foreground">
                Los nuevos pedidos aparecerán aquí automáticamente
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div 
          className={`grid gap-4`}
          style={{ 
            gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
          }}
        >
          {activeOrders
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                config={config}
                onStatusChange={updateOrderStatus}
              />
            ))}
        </div>
      )}

      {/* Sound Management */}
      <KitchenSounds 
        orders={orders}
        soundEnabled={config.soundEnabled}
      />
    </div>
  );
}