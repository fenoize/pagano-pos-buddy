import React, { useEffect, useState } from 'react';
import { useKDSHistory } from '@/hooks/useKDSHistory';
import { usePermissions } from '@/hooks/usePermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Package, RotateCcw, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Order, OrderItem } from '@/types';

interface KitchenHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KitchenHistory({ open, onOpenChange }: KitchenHistoryProps) {
  const { historyOrders, loadingHistory, fetchHistoryOrders, reopenOrder } = useKDSHistory();
  const { canEditOrders } = usePermissions();
  const [selectedTab, setSelectedTab] = useState<'entregado' | 'cancelado'>('entregado');
  const [reopening, setReopening] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchHistoryOrders(24);
    }
  }, [open]);

  const entregadoOrders = historyOrders.filter(order => order.status === 'Entregado');
  const canceladoOrders = historyOrders.filter(order => order.status === 'Cancelado');

  const handleReopen = async (orderId: string, orderNumber: number) => {
    if (!canEditOrders) {
      toast.error('No tienes permisos para re-abrir pedidos');
      return;
    }

    setReopening(orderId);
    const success = await reopenOrder(orderId);
    
    if (success) {
      toast.success(`Pedido #${orderNumber} re-abierto exitosamente`);
      // Refrescar historial
      fetchHistoryOrders(24);
    } else {
      toast.error('Error al re-abrir el pedido');
    }
    
    setReopening(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getCustomerName = (order: Order) => {
    if (order.customer) {
      return `${order.customer.nombres || order.customer.name || ''} ${order.customer.apellidos || order.customer.apellido || ''}`.trim() || 'Cliente';
    }
    return order.nombre_resumen || 'Cliente';
  };

  const renderOrderCard = (order: Order) => (
    <Card key={order.id} className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">Pedido #{order.order_number}</CardTitle>
              <Badge variant={order.status === 'Entregado' ? 'default' : 'destructive'}>
                {order.status}
              </Badge>
              <Badge variant="outline">
                {order.fulfillment === 'retiro' ? 'Retiro' : 'Delivery'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(order.created_at), "HH:mm", { locale: es })}
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {getCustomerName(order)}
              </div>
            </div>
          </div>
          {canEditOrders && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReopen(order.id, order.order_number)}
              disabled={reopening === order.id}
              className="flex items-center gap-2"
            >
              {reopening === order.id ? (
                <>
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Re-abriendo...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3" />
                  Re-abrir
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Items */}
        <div className="space-y-1">
          {order.items.map((item: OrderItem, idx: number) => {
            const itemSubtotal = (item.basePrice * item.quantity) + 
              item.extras.reduce((sum, extra) => sum + (extra.price * (extra.quantity || 1)), 0);
            
            return (
              <div key={idx} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.productName}
                  {item.variant_group_selections && item.variant_group_selections.length > 0 && 
                    ` [${item.variant_group_selections.map((s: any) => s.option_name).join('/')}]`}
                  {item.variant_name && ` (${item.variant_name})`}
                </span>
                <span className="font-medium">{formatPrice(itemSubtotal)}</span>
              </div>
            );
          })}
        </div>
        
        {/* Total */}
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>

        {/* Payment Method */}
        <div className="text-xs text-muted-foreground">
          Método de pago: {order.payment_method}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historial de Pedidos (Últimas 24 horas)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entregado" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Entregados ({entregadoOrders.length})
            </TabsTrigger>
            <TabsTrigger value="cancelado" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Cancelados ({canceladoOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entregado" className="mt-4">
            <ScrollArea className="h-[50vh]">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Cargando historial...</p>
                  </div>
                </div>
              ) : entregadoOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay pedidos entregados en las últimas 24 horas</p>
                </div>
              ) : (
                <div className="pr-4">
                  {entregadoOrders.map(renderOrderCard)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="cancelado" className="mt-4">
            <ScrollArea className="h-[50vh]">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Cargando historial...</p>
                  </div>
                </div>
              ) : canceladoOrders.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay pedidos cancelados en las últimas 24 horas</p>
                </div>
              ) : (
                <div className="pr-4">
                  {canceladoOrders.map(renderOrderCard)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
