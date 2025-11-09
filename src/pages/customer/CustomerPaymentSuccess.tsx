import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { trackPromoConversion } from '@/hooks/usePromoAnalytics';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

export default function CustomerPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
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
      setOrder({
        ...data,
        items: data.items as any
      } as Order);

      // Track conversion if order was completed
      if (data && orderId) {
        await trackPromoConversion(orderId, customer?.id);
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
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              ¡Pago Exitoso!
            </h1>
            <p className="text-muted-foreground">
              Tu pedido ha sido confirmado y está siendo preparado
            </p>
          </div>

          {order && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Número de pedido:</span>
                <span className="font-semibold">#{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total pagado:</span>
                <span className="font-semibold">
                  ${order.total.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <span className="font-semibold text-green-600">
                  {order.status === 'Pendiente' ? 'En preparación' : order.status}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={() => navigate(`/track/${orderId}`)}
              className="w-full"
            >
              Ver Estado del Pedido
            </Button>
            <Button 
              onClick={() => navigate('/menu')}
              variant="outline"
              className="w-full"
            >
              Volver al Menú
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
