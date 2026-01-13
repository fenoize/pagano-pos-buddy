import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Store, Truck, RefreshCw, MapPin, Eye, Star, CheckCircle } from 'lucide-react';
import { formatCLP } from '@/lib/utils';
import { formatDateTime } from '@/lib/dateUtils';
import { OrderFeedbackModal } from './OrderFeedbackModal';
import { useOrderFeedback } from '@/hooks/useOrderFeedback';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  base_price: number;
  total: number;
  variant?: string;
  extras?: Array<{ name: string; price: number }>;
  modifiers?: string[];
  notes?: string;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  created_at: string;
  fulfillment: string;
  total: number;
  items: OrderItem[];
  delivery_address?: string | null;
  delivery_number?: string | null;
  delivery_comuna?: string | null;
  delivery_reference?: string | null;
  payment_runas?: number;
}

interface CustomerOrderCardProps {
  order: Order;
  onReorder: (orderId: string) => void;
}

const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'Pendiente':
      return 'secondary';
    case 'En preparación':
      return 'default';
    case 'Listo':
      return 'outline';
    case 'Entregado':
      return 'secondary';
    case 'Cancelado':
      return 'destructive';
    default:
      return 'default';
  }
};

export function CustomerOrderCard({ order, onReorder }: CustomerOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasFeedback, setHasFeedback] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { getFeedbackForOrder } = useOrderFeedback();
  const { customer } = useCustomerAuth();

  const isOrderActive = !['Entregado', 'Cancelado'].includes(order.status);
  const isDelivered = order.status === 'Entregado';

  // Check if order has feedback when it's delivered
  useEffect(() => {
    if (isDelivered && hasFeedback === null) {
      getFeedbackForOrder(order.id).then((feedback) => {
        setHasFeedback(!!feedback);
      });
    }
  }, [isDelivered, order.id, hasFeedback, getFeedbackForOrder]);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-lg text-foreground">#{order.order_number}</h4>
            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
          </div>
          <Badge variant="outline">
            {order.fulfillment === 'retiro' ? (
              <>
                <Store className="w-3 h-3 mr-1" />
                Retiro
              </>
            ) : (
              <>
                <Truck className="w-3 h-3 mr-1" />
                Delivery
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
          <p className="text-2xl font-bold text-foreground">{formatCLP(order.total)}</p>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full mt-4">
              Ver detalles
              <ChevronDown
                className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-4 space-y-4">
              {/* Items del pedido */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm text-foreground">Productos:</h5>
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {item.quantity}x {item.name}
                      </p>
                      {item.variant && (
                        <p className="text-xs text-muted-foreground">{item.variant}</p>
                      )}
                      {item.extras && item.extras.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {item.extras.map((e) => e.name).join(', ')}
                        </p>
                      )}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          {item.modifiers.join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          Nota: {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-medium text-foreground">{formatCLP(item.total)}</span>
                  </div>
                ))}
              </div>

              {/* Dirección snapshot (si es delivery) */}
              {order.delivery_address && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Dirección de entrega:</p>
                      <p className="text-sm text-muted-foreground">
                        {order.delivery_address} {order.delivery_number}
                        <br />
                        {order.delivery_comuna}
                        {order.delivery_reference && (
                          <>
                            <br />
                            Ref: {order.delivery_reference}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Runas usadas */}
              {order.payment_runas && order.payment_runas > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-primary font-medium">
                    ✨ Usaste {order.payment_runas} runas en este pedido
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex flex-col gap-2">
                {/* Feedback button for delivered orders */}
                {isDelivered && hasFeedback === false && customer && (
                  <Button
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10"
                    onClick={() => setShowFeedbackModal(true)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Calificar pedido
                  </Button>
                )}
                
                {/* Show badge if already rated */}
                {isDelivered && hasFeedback === true && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Ya calificaste este pedido
                  </div>
                )}
                
                <div className="flex gap-2">
                  {isOrderActive && (
                    <Button
                      className="flex-1"
                      onClick={() => navigate(`/track/${order.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver seguimiento
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className={isOrderActive ? 'flex-1' : 'w-full'}
                    onClick={() => onReorder(order.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Volver a pedir
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Feedback Modal */}
      {customer && (
        <OrderFeedbackModal
          open={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setHasFeedback(true);
          }}
          orderId={order.id}
          customerId={customer.id}
          orderNumber={String(order.order_number)}
        />
      )}
    </Card>
  );
}
