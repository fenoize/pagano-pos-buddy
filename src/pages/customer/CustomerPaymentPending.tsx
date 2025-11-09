import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';

export default function CustomerPaymentPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      
      // Poll order status every 10 seconds
      const interval = setInterval(fetchOrder, 10000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      const orderData = {
        ...data,
        items: data.items as any
      } as Order;
      setOrder(orderData);
      
      // Si el pago fue confirmado, redirigir a success
      if (orderData.status === 'Pendiente') {
        navigate(`/payment-success?order=${orderId}`, { replace: true });
      }
      // Si fue cancelado, redirigir a failure
      else if (orderData.status === 'Cancelado') {
        navigate(`/payment-failure?order=${orderId}`, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-app min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="customer-app min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="pt-6 space-y-6 text-center">
          <div className="flex justify-center">
            <Clock className="h-20 w-20 text-warning animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Pago Pendiente
            </h1>
            <p className="text-muted-foreground">
              Estamos esperando la confirmación de tu pago
            </p>
          </div>

          {order && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Número de pedido:</span>
                <span className="font-semibold">#{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">
                  ${order.total.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <span className="font-semibold text-warning">
                  Verificando pago...
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={fetchOrder}
              variant="outline"
              className="w-full"
            >
              Actualizar Estado
            </Button>
            <Button 
              onClick={() => navigate('/my-orders')}
              variant="ghost"
              className="w-full"
            >
              Ver Mis Pedidos
            </Button>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Algunos métodos de pago pueden tardar unos minutos en confirmarse.
            </p>
            <p>
              Te notificaremos cuando tu pago sea confirmado.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
