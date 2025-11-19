import React, { useEffect } from 'react';
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { DeliveryOrderCard } from '@/components/delivery/DeliveryOrderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TruckIcon, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DeliveryDashboard() {
  const { orders, loading, updatingOrders, markAsOnTheWay, markAsDelivered, refetch } = useDeliveryOrders();
  const { settings } = useDeliverySettings();

  // Separar pedidos por estado
  const inPreparationOrders = orders.filter(o => o.status === 'En preparación');
  const readyOrders = orders.filter(o => o.status === 'Listo');
  const onTheWayOrders = orders.filter(o => o.status === 'En camino');

  useEffect(() => {
    // Refrescar cada 30 segundos
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (loading && !settings) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TruckIcon className="w-8 h-8" />
            Mis Deliverys
          </h1>
          <p className="text-muted-foreground">
            {settings?.assignment_mode === 'pool' 
              ? 'Pedidos disponibles para todos los repartidores' 
              : 'Tus pedidos asignados'}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tabs para estado de pedidos */}
      <Tabs defaultValue="ready" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preparation" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            En cocina ({inPreparationOrders.length})
          </TabsTrigger>
          <TabsTrigger value="ready" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Por retirar ({readyOrders.length})
          </TabsTrigger>
          <TabsTrigger value="onTheWay" className="flex items-center gap-2">
            <TruckIcon className="w-4 h-4" />
            En camino ({onTheWayOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Pedidos En Preparación */}
        <TabsContent value="preparation" className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : inPreparationOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay pedidos en preparación</h3>
                <p className="text-muted-foreground text-center">
                  Los pedidos que están siendo preparados en cocina aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {inPreparationOrders.map(order => (
                <DeliveryOrderCard
                  key={order.id}
                  order={order}
                  isUpdating={updatingOrders.has(order.id)}
                  mapProvider={settings?.map_provider || 'google_maps'}
                  onMarkAsOnTheWay={markAsOnTheWay}
                  onMarkAsDelivered={markAsDelivered}
                  showInPreparation
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pedidos Listos para Retirar */}
        <TabsContent value="ready" className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : readyOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay pedidos listos para retirar</h3>
                <p className="text-muted-foreground text-center">
                  Cuando cocina marque un pedido como "Listo", aparecerá aquí para que lo retires
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {readyOrders.map(order => (
                <DeliveryOrderCard
                  key={order.id}
                  order={order}
                  isUpdating={updatingOrders.has(order.id)}
                  mapProvider={settings?.map_provider || 'google_maps'}
                  onMarkAsOnTheWay={markAsOnTheWay}
                  onMarkAsDelivered={markAsDelivered}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pedidos En Camino */}
        <TabsContent value="onTheWay" className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : onTheWayOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TruckIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay pedidos en camino</h3>
                <p className="text-muted-foreground text-center">
                  Los pedidos que marques como "En camino" aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {onTheWayOrders.map(order => (
                <DeliveryOrderCard
                  key={order.id}
                  order={order}
                  isUpdating={updatingOrders.has(order.id)}
                  mapProvider={settings?.map_provider || 'google_maps'}
                  onMarkAsOnTheWay={markAsOnTheWay}
                  onMarkAsDelivered={markAsDelivered}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info card para modo pool */}
      {settings?.assignment_mode === 'pool' && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TruckIcon className="w-5 h-5" />
              Modo Pool Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Los pedidos sin asignar están disponibles para todos. Al marcar un pedido como "En camino",
              se te asignará automáticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
