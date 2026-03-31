import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Package, 
  Truck,
  XCircle,
  ArrowLeft,
  Store,
  AlertCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  Star
} from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { OrderFeedbackModal } from '@/components/customer/OrderFeedbackModal';
import { DeliveryTrackingMap } from '@/components/customer/DeliveryTrackingMap';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useRunasConfig } from '@/hooks/useRunasConfig';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOrderFeedback } from '@/hooks/useOrderFeedback';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

type OrderStatus = 'PendientePago' | 'Pendiente' | 'En preparación' | 'En pausa' | 'Listo' | 'En camino' | 'Entregado' | 'Cancelado';
type FulfillmentType = 'retiro' | 'delivery';

interface OrderData {
  id: string;
  order_number: number;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  total: number;
  created_at: string;
  updated_at: string;
  items: any;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  delivery_address?: string;
  delivery_comuna?: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  notes?: string;
  payment_method?: string;
  payment_runas?: number;
}

const STEPS_RETIRO = ['Pendiente', 'En preparación', 'Listo'] as const;
const STEPS_DELIVERY = ['Pendiente', 'En preparación', 'Listo', 'En camino'] as const;

function getStepIndex(status: OrderStatus, fulfillment: FulfillmentType): number {
  const steps = fulfillment === 'delivery' ? STEPS_DELIVERY : STEPS_RETIRO;
  // En pausa counts as "En preparación" step
  const mapped = status === 'En pausa' ? 'En preparación' : status;
  const idx = steps.indexOf(mapped as any);
  return idx >= 0 ? idx : -1;
}

export default function CustomerOrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get('status');
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasFeedback, setHasFeedback] = useState<boolean | null>(null);
  const { getFeedbackForOrder } = useOrderFeedback();
  const { customer } = useCustomerAuth();
  const { runaRedemptionValue } = useRunasConfig();

  useEffect(() => {
    const fetchToken = async () => {
      const { data, error } = await (supabase as any).rpc('get_mapbox_token');
      if (!error && data) setMapboxToken(data as string);
    };
    fetchToken();
  }, []);

  const checkExistingFeedback = useCallback(async () => {
    if (!orderId) return;
    const feedback = await getFeedbackForOrder(orderId);
    setHasFeedback(!!feedback);
    const shownKey = `feedback_shown_${orderId}`;
    if (!feedback && !localStorage.getItem(shownKey)) {
      setShowFeedbackModal(true);
      localStorage.setItem(shownKey, 'true');
    }
  }, [orderId, getFeedbackForOrder]);

  useEffect(() => {
    if (!orderId) {
      setError('No se especificó un ID de pedido');
      setLoading(false);
      return;
    }
    fetchOrder();
    setupRealtimeSubscription();
  }, [orderId]);

  useEffect(() => {
    if (order?.status === 'Entregado' && hasFeedback === null) {
      checkExistingFeedback();
    }
  }, [order?.status, hasFeedback, checkExistingFeedback]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('app_orders_kitchen')
        .select('*')
        .eq('id', orderId)
        .single();
      if (fetchError) throw fetchError;
      if (!data) { setError('Pedido no encontrado'); return; }
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
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'app_orders_kitchen',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        setOrder(payload.new as unknown as OrderData);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const isCompleted = (status: OrderStatus) => status === 'Entregado' || status === 'Cancelado';

  const getStatusEmoji = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': return '🕐';
      case 'En preparación': return '🔥';
      case 'En pausa': return '⏸️';
      case 'Listo': return '✅';
      case 'En camino': return '🛵';
      case 'Entregado': return '🎉';
      case 'Cancelado': return '❌';
      default: return '📦';
    }
  };

  const getStatusMessage = (status: OrderStatus, fulfillment: FulfillmentType) => {
    switch (status) {
      case 'Pendiente': return 'Tu pedido fue recibido';
      case 'En preparación': return 'Estamos cocinando tu pedido';
      case 'En pausa': return 'Tu pedido está en pausa';
      case 'Listo':
        return fulfillment === 'retiro' 
          ? '¡Listo para retirar!' 
          : '¡Listo! Pronto sale a entrega';
      case 'En camino': return 'Tu pedido va en camino 🛵';
      case 'Entregado': return '¡Que lo disfrutes!';
      case 'Cancelado': return 'Pedido cancelado';
      default: return 'Procesando...';
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': return 'bg-amber-500';
      case 'En preparación': return 'bg-orange-500';
      case 'En pausa': return 'bg-yellow-500';
      case 'Listo': return 'bg-emerald-500';
      case 'En camino': return 'bg-blue-500';
      case 'Entregado': return 'bg-emerald-500';
      case 'Cancelado': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="customer-app min-h-screen pb-20 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Cargando pedido...</p>
        </div>
        <CustomerBottomNav />
      </div>
    );
  }

  // Error
  if (error || !order) {
    return (
      <div className="customer-app min-h-screen pb-20 bg-background">
        <div className="max-w-lg mx-auto p-6 pt-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-lg font-semibold">{error || 'Pedido no encontrado'}</p>
          <Button variant="outline" onClick={() => navigate('/my-orders')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ver mis pedidos
          </Button>
        </div>
        <CustomerBottomNav />
      </div>
    );
  }

  const steps = order.fulfillment === 'delivery' ? STEPS_DELIVERY : STEPS_RETIRO;
  const currentStepIdx = getStepIndex(order.status, order.fulfillment);
  const completed = isCompleted(order.status);

  const stepIcons = {
    'Pendiente': Clock,
    'En preparación': ChefHat,
    'Listo': Package,
    'En camino': Truck,
  };

  const stepLabels: Record<string, string> = {
    'Pendiente': 'Recibido',
    'En preparación': 'Preparando',
    'Listo': order.fulfillment === 'retiro' ? 'Listo' : 'Listo',
    'En camino': 'En camino',
  };

  return (
    <div className="customer-app min-h-screen pb-20 bg-background">
      {/* Compact header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate('/my-orders')} 
            className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-bold text-sm tracking-tight">Pedido #{order.order_number}</span>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-5">

        {/* Payment Status Alerts */}
        {paymentStatus === 'success' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-foreground">¡Pago confirmado!</p>
          </div>
        )}
        {paymentStatus === 'pending' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-foreground">Pago pendiente de confirmación</p>
          </div>
        )}
        {paymentStatus === 'failure' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-foreground">Hubo un problema con el pago</p>
          </div>
        )}

        {/* Hero status section */}
        <div className="text-center space-y-3 py-2">
          <div className="text-5xl">{getStatusEmoji(order.status)}</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {getStatusMessage(order.status, order.fulfillment)}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)} ${!completed ? 'animate-pulse' : ''}`} />
              <span className="text-sm text-muted-foreground font-medium">{order.status}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">
                {order.fulfillment === 'delivery' ? '🚚 Delivery' : '🏪 Retiro'}
              </span>
            </div>
          </div>
        </div>

        {/* Step progress bar — horizontal */}
        {!completed && (
          <div className="px-2">
            {/* Progress bar track */}
            <div className="relative flex items-center justify-between mb-3">
              {/* Background line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted rounded-full -translate-y-1/2" />
              {/* Active line */}
              <div 
                className="absolute top-1/2 left-0 h-1 bg-primary rounded-full -translate-y-1/2 transition-all duration-700 ease-out"
                style={{ width: `${Math.max(0, (currentStepIdx / (steps.length - 1)) * 100)}%` }}
              />
              
              {steps.map((step, i) => {
                const Icon = stepIcons[step];
                const isActive = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                      ${isCurrent 
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110' 
                        : isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {isActive && i < currentStepIdx ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className={`h-5 w-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Labels row */}
            <div className="flex items-start justify-between">
              {steps.map((step, i) => {
                const isActive = i <= currentStepIdx;
                return (
                  <span 
                    key={step} 
                    className={`text-[11px] font-medium text-center w-12 leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`}
                  >
                    {stepLabels[step]}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed states */}
        {order.status === 'Entregado' && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-emerald-300 font-medium">Tu pedido fue entregado exitosamente</p>
            {hasFeedback === false && customer && (
              <Button 
                size="sm"
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setShowFeedbackModal(true)}
              >
                <Star className="h-4 w-4" />
                Calificar pedido
              </Button>
            )}
            {hasFeedback === true && (
              <p className="text-xs text-muted-foreground">✅ Ya calificaste este pedido</p>
            )}
          </div>
        )}
        {order.status === 'Cancelado' && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5 text-center">
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-300 font-medium">Este pedido fue cancelado</p>
          </div>
        )}

        {/* Delivery Tracking Map */}
        {order.fulfillment === 'delivery' && order.status === 'En camino' && mapboxToken && (
          <DeliveryTrackingMap
            orderId={order.id}
            destinationLat={order.delivery_lat || null}
            destinationLng={order.delivery_lng || null}
            mapboxToken={mapboxToken}
          />
        )}

        {/* Delivery address chip */}
        {order.fulfillment === 'delivery' && order.delivery_address && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{order.delivery_address}</p>
              {order.delivery_comuna && (
                <p className="text-xs text-muted-foreground">{order.delivery_comuna}</p>
              )}
            </div>
          </div>
        )}

        {/* Order details — collapsible */}
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Detalle del pedido</span>
              <Badge variant="outline" className="text-xs font-normal">
                {order.items?.length || 0} {order.items?.length === 1 ? 'ítem' : 'ítems'}
              </Badge>
            </div>
            {detailsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          
          {detailsOpen && (
            <div className="px-4 pb-4 space-y-2.5 border-t border-border/50 pt-3">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start text-sm gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="bg-muted text-muted-foreground text-xs font-bold rounded-md w-6 h-6 flex items-center justify-center flex-shrink-0">
                      {item.quantity}
                    </span>
                    <span className="truncate">{item.productName}</span>
                  </div>
                  <span className="font-medium text-muted-foreground flex-shrink-0">{formatCurrency(item.basePrice * item.quantity)}</span>
                </div>
              ))}
              
              {order.notes && (
                <>
                  <Separator className="my-2" />
                  <div className="text-xs bg-muted/40 rounded-lg p-2.5 italic text-muted-foreground">
                    📝 {order.notes}
                  </div>
                </>
              )}

              <Separator className="my-2" />
              <div className="flex justify-between items-center font-bold text-base">
                <span>Total</span>
                <span>
                  {order.payment_method === 'runas'
                    ? `${Math.ceil((order.payment_runas || 0) / runaRedemptionValue)} Runas ✨`
                    : formatCurrency(order.total)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-center text-xs text-muted-foreground/60">
          Pedido realizado el {format(new Date(order.created_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
        </p>

        {/* Completed actions */}
        {completed && (
          <div className="space-y-2.5 pt-2">
            <Button className="w-full h-12 font-semibold" onClick={() => navigate('/menu')}>
              Hacer otro pedido
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/my-orders')}>
              Ver todos mis pedidos
            </Button>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {order && customer && (
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
      <CustomerBottomNav />
    </div>
  );
}
