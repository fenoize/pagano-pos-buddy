import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Package, 
  Truck,
  XCircle,
  ArrowLeft,
  Store,
  AlertCircle
} from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type OrderStatus = 'Pendiente' | 'En preparación' | 'En pausa' | 'Listo' | 'En camino' | 'Entregado' | 'Cancelado';
type FulfillmentType = 'retiro' | 'delivery';

interface OrderData {
  id: string;
  order_number: number;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  total: number;
  created_at: string;
  updated_at: string;
  items: any; // jsonb field from database
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  delivery_comuna?: string;
  notes?: string;
}

export default function CustomerOrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get('status');
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No se especificó un ID de pedido');
      setLoading(false);
      return;
    }

    fetchOrder();
    setupRealtimeSubscription();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('app_orders_kitchen')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Pedido no encontrado');
        return;
      }

      setOrder(data as unknown as OrderData);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError('Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('order-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_orders_kitchen',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Order updated:', payload);
          setOrder(payload.new as unknown as OrderData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente':
        return <Clock className="h-8 w-8 text-orange-500" />;
      case 'En preparación':
        return <ChefHat className="h-8 w-8 text-blue-500 animate-pulse" />;
      case 'En pausa':
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
      case 'Listo':
        return <Package className="h-8 w-8 text-green-500" />;
      case 'En camino':
        return <Truck className="h-8 w-8 text-purple-500" />;
      case 'Entregado':
        return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case 'Cancelado':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8" />;
    }
  };

  const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pendiente':
        return 'secondary';
      case 'En preparación':
        return 'default';
      case 'Listo':
        return 'default';
      case 'Entregado':
        return 'default';
      case 'Cancelado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusMessage = (status: OrderStatus, fulfillment: FulfillmentType) => {
    switch (status) {
      case 'Pendiente':
        return 'Tu pedido ha sido recibido y está en la cola';
      case 'En preparación':
        return 'Estamos preparando tu pedido con mucho cariño';
      case 'En pausa':
        return 'Tu pedido está temporalmente en pausa';
      case 'Listo':
        return fulfillment === 'retiro' 
          ? '¡Tu pedido está listo para retirar en el local!'
          : '¡Tu pedido está listo y pronto saldrá a entrega!';
      case 'En camino':
        return 'Tu pedido va en camino';
      case 'Entregado':
        return '¡Disfruta tu pedido!';
      case 'Cancelado':
        return 'Este pedido ha sido cancelado';
      default:
        return 'Procesando tu pedido...';
    }
  };

  const isCompleted = (status: OrderStatus) => {
    return status === 'Entregado' || status === 'Cancelado';
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-16 w-16 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando pedido...</p>
        </div>
        <CustomerBottomNav />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <div className="max-w-screen-xl mx-auto p-4">
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Pedido no encontrado'}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/my-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ver mis pedidos
          </Button>
        </div>
        <CustomerBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/my-orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Pedido #{order.order_number}</h1>
          <div className="w-10" />
        </div>

        {/* Payment Status Alert */}
        {paymentStatus === 'success' && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              ¡Pago confirmado! Tu pedido ha sido recibido y se está preparando.
            </AlertDescription>
          </Alert>
        )}
        
        {paymentStatus === 'pending' && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Tu pago está pendiente de confirmación. Te notificaremos cuando se confirme.
            </AlertDescription>
          </Alert>
        )}
        
        {paymentStatus === 'failure' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Hubo un problema con el pago. Por favor intenta nuevamente o contacta con nosotros.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Card */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Status Icon */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {getStatusIcon(order.status)}
              </div>

              {/* Status Badge */}
              <Badge variant={getStatusBadgeVariant(order.status)} className="text-lg px-4 py-2">
                {order.status}
              </Badge>

              {/* Status Message */}
              <p className="text-muted-foreground max-w-md">
                {getStatusMessage(order.status, order.fulfillment)}
              </p>

              {/* Fulfillment Type */}
              <div className="flex items-center gap-2 text-sm">
                {order.fulfillment === 'retiro' ? (
                  <>
                    <Store className="h-4 w-4" />
                    <span>Retiro en local</span>
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4" />
                    <span>Delivery</span>
                  </>
                )}
              </div>

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                Pedido realizado el {format(new Date(order.created_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress Timeline */}
        {!isCompleted(order.status) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progreso del pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pendiente */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${['Pendiente', 'En preparación', 'En pausa', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? 'text-primary' : 'text-muted-foreground'}`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Pedido recibido</p>
                    <p className="text-xs text-muted-foreground">Tu pedido está en la cola</p>
                  </div>
                </div>

                <div className="ml-2.5 h-8 border-l-2 border-dashed border-muted" />

                {/* En preparación */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${['En preparación', 'En pausa', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? 'text-primary' : 'text-muted-foreground'}`}>
                    <ChefHat className={`h-5 w-5 ${order.status === 'En preparación' ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Preparando</p>
                    <p className="text-xs text-muted-foreground">Tu pedido se está cocinando</p>
                  </div>
                </div>

                <div className="ml-2.5 h-8 border-l-2 border-dashed border-muted" />

                {/* Listo */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${['Listo', 'En camino', 'Entregado'].includes(order.status) ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {order.fulfillment === 'retiro' ? 'Listo para retirar' : 'Listo para envío'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.fulfillment === 'retiro' 
                        ? 'Puedes recoger tu pedido' 
                        : 'Tu pedido saldrá pronto'}
                    </p>
                  </div>
                </div>

                {order.fulfillment === 'delivery' && (
                  <>
                    <div className="ml-2.5 h-8 border-l-2 border-dashed border-muted" />
                    
                    {/* En camino */}
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${['En camino', 'Entregado'].includes(order.status) ? 'text-primary' : 'text-muted-foreground'}`}>
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">En camino</p>
                        <p className="text-xs text-muted-foreground">Tu pedido va hacia ti</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.productName}</span>
                <span className="font-medium">{formatCurrency(item.basePrice * item.quantity)}</span>
              </div>
            ))}
            
            {order.notes && (
              <>
                <Separator />
                <div className="text-sm">
                  <p className="font-medium mb-1">Notas:</p>
                  <p className="text-muted-foreground italic">{order.notes}</p>
                </div>
              </>
            )}

            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        {order.fulfillment === 'delivery' && order.delivery_address && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dirección de entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.delivery_address}</p>
              {order.delivery_comuna && (
                <p className="text-sm text-muted-foreground">{order.delivery_comuna}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {isCompleted(order.status) && (
          <div className="space-y-2">
            <Button className="w-full" onClick={() => navigate('/menu')}>
              Hacer otro pedido
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/my-orders')}>
              Ver todos mis pedidos
            </Button>
          </div>
        )}
      </div>
      <CustomerBottomNav />
    </div>
  );
}
