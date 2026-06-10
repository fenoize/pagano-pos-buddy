import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { getOrderDisplayName } from '@/lib/orderDisplay';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RefreshCw, Loader2, Banknote, CreditCard, Smartphone, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { OrderSourceBadge } from '@/components/sales/OrderSourceBadge';

interface RecentOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getPaymentIcon = (method: string) => {
  switch (method?.toLowerCase()) {
    case 'efectivo':
      return <Banknote className="w-4 h-4" />;
    case 'pos':
      return <CreditCard className="w-4 h-4" />;
    case 'mp':
    case 'aplicacion':
      return <Smartphone className="w-4 h-4" />;
    case 'runas':
      return <Coins className="w-4 h-4" />;
    default:
      return <Banknote className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pendiente':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    case 'En preparación':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    case 'Listo':
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case 'En camino':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
    case 'Entregado':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    case 'Cancelado':
      return 'bg-red-500/10 text-red-700 dark:text-red-400';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  }
};

export function RecentOrdersModal({ isOpen, onClose }: RecentOrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentOrders = async () => {
    setLoading(true);
    try {
      // Determinar el inicio del rango: sesión de caja activa del local actual,
      // o fallback a las últimas 24h si no hay sesión activa.
      const branchId = typeof window !== 'undefined'
        ? localStorage.getItem('paganos_active_branch_id')
        : null;

      let sessionQuery = supabase
        .from('cash_sessions')
        .select('opened_at')
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1);

      if (branchId) {
        sessionQuery = sessionQuery.eq('branch_id', branchId);
      }

      const { data: activeSession } = await sessionQuery.maybeSingle();

      const fromDate = activeSession?.opened_at
        ? new Date(activeSession.opened_at)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(
            name,
            apellido,
            nombres,
            apellidos,
            phone
          )
        `)
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const ordersWithItems = (data || []).map(order => ({
        ...order,
        items: order.items as any,
        customer: order.customer ? {
          ...order.customer,
          id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } : undefined
      })) as Order[];

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentOrders();
    }
  }, [isOpen]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Últimas Órdenes</DialogTitle>
              <DialogDescription>
                Órdenes del día actual (últimas 30)
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentOrders}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay órdenes registradas hoy
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {orders.map((order) => {
                const customerName = getOrderDisplayName(order, undefined, 'Sin cliente');
                const customerPhone = order.customer?.phone || '';

                return (
                  <AccordionItem key={order.id} value={order.id} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full text-left">
                        <div className="flex items-center gap-3">
                          <div className="font-mono font-semibold text-lg">
                            #{order.order_number}
                          </div>
                          <div>
                            <div className="font-medium">{customerName}</div>
                            {customerPhone && (
                              <div className="text-xs text-muted-foreground">{customerPhone}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mr-2">
                          <OrderSourceBadge
                            source={(order as any).source}
                            channelSlug={(order as any).sales_channel_slug}
                            externalOrderId={(order as any).external_order_id}
                          />
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getPaymentIcon(order.payment_method)}
                            <span className="font-semibold">{formatPrice(order.total)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {/* Info básica */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Entrega:</span>
                            <Badge variant="outline" className="ml-2 capitalize">
                              {order.fulfillment}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Método de pago:</span>
                            <Badge variant="outline" className="ml-2 capitalize">
                              {order.payment_method}
                            </Badge>
                          </div>
                        </div>

                        {/* Items */}
                        <div>
                          <div className="text-sm font-medium mb-2">Items:</div>
                          <div className="space-y-2">
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx} className="bg-muted/50 p-3 rounded space-y-1">
                                <div className="flex justify-between">
                                  <span className="font-medium">{item.quantity}x {item.productName}</span>
                                  <span className="font-medium">{formatPrice(item.basePrice * item.quantity)}</span>
                                </div>
                                
                                {/* Variante */}
                                {item.variant_name && (
                                  <div className="text-xs text-muted-foreground">
                                    Variante: {item.variant_name}
                                  </div>
                                )}
                                
                                {/* Combo items */}
                                {item.is_combo_item && item.combo_selections?.map((sel: any, i: number) => (
                                  <div key={i} className="ml-3 text-xs border-l-2 border-primary/30 pl-2 py-1">
                                    <span className="font-medium">
                                      {sel.quantity || 1}x {sel.selectedProduct?.name || 'Producto'}
                                    </span>
                                    {sel.selectedVariant?.variant?.name && (
                                      <span className="text-muted-foreground"> - {sel.selectedVariant.variant.name}</span>
                                    )}
                                    {/* Extras del combo item */}
                                    {sel.extras && sel.extras.length > 0 && (
                                      <div className="text-muted-foreground">
                                        + {sel.extras.map((e: any) => `${e.quantity || 1}x ${e.label || e.name}`).join(', ')}
                                      </div>
                                    )}
                                    {/* Modificadores del combo item */}
                                    {sel.modifiers && sel.modifiers.length > 0 && (
                                      <div className="text-muted-foreground italic">
                                        Mod: {sel.modifiers.map((m: any) => typeof m === 'string' ? m : m.name).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                
                                {/* Extras normales (no combo) */}
                                {!item.is_combo_item && item.extras && item.extras.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    + {item.extras.map((e: any) => `${e.quantity || 1}x ${e.label || e.name}`).join(', ')}
                                  </div>
                                )}
                                
                                {/* Modificadores normales (no combo) */}
                                {!item.is_combo_item && item.modifiers && item.modifiers.length > 0 && (
                                  <div className="text-xs text-muted-foreground italic">
                                    Mod: {item.modifiers.map((m: any) => typeof m === 'string' ? m : m.name).join(', ')}
                                  </div>
                                )}
                                
                                {/* Notas */}
                                {item.notes && (
                                  <div className="text-xs italic text-amber-600">📝 {item.notes}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Totales */}
                        <div className="border-t pt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Descuento:</span>
                              <span>-{formatPrice(order.discount)}</span>
                            </div>
                          )}
                          {order.delivery_fee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Delivery:</span>
                              <span>{formatPrice(order.delivery_fee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base border-t pt-1">
                            <span>Total:</span>
                            <span>{formatPrice(order.total)}</span>
                          </div>
                        </div>

                        {/* Notas */}
                        {order.notes && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Notas:</span>
                            <p className="mt-1 text-foreground">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
