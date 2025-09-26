import React, { useEffect, useState } from 'react';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { useKitchenConfig } from '@/hooks/useKitchenConfig';
import { useKitchenExpanded } from '@/hooks/useKitchenExpanded';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrderCard } from '@/components/kitchen/OrderCard';
import { KitchenSounds } from '@/components/kitchen/KitchenSounds';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Maximize2, Minimize2, X, RefreshCw } from 'lucide-react';

export default function Kitchen() {
  const { orders, updateOrderStatus, loading, refetch } = useKitchenOrders();
  const { config } = useKitchenConfig();
  const { isExpanded, toggleExpanded, exitExpanded } = useKitchenExpanded();
  const isMobile = useIsMobile();
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

  // Calculate responsive columns based on screen size and expanded mode
  const getColumnsCount = () => {
    if (isMobile) {
      return isExpanded ? 2 : 1;
    }
    // Tablet
    if (window.innerWidth <= 1024) {
      return isExpanded ? 3 : 2;
    }
    // Desktop - use config or default
    return config.columns || 4;
  };

  // If expanded mode, render full-screen view
  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Compact header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-primary">KDS</h1>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{activeOrders.length}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={exitExpanded}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Orders Grid - Full Screen */}
        <div className="p-4">
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
              className="grid gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${getColumnsCount()}, minmax(0, 1fr))`,
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
                    compact={isMobile}
                  />
                ))}
            </div>
          )}
        </div>

        <KitchenSounds 
          orders={orders}
          soundEnabled={config.soundEnabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Cocina - KDS</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpanded}
            className="flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            {isMobile ? "Expandir" : "Modo Pantalla Completa"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>
        
        {/* Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            <span className="text-sm md:text-base font-medium">{activeOrders.length} pedidos activos</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              Pendientes: {pendingOrders.length}
            </Badge>
            <Badge variant="default" className="text-xs">
              En preparación: {inProgressOrders.length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              En pausa: {pausedOrders.length}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              Listos: {readyOrders.length}
            </Badge>
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
          className="grid gap-3 md:gap-4"
          style={{ 
            gridTemplateColumns: `repeat(${getColumnsCount()}, minmax(0, 1fr))`,
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
                compact={isMobile}
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