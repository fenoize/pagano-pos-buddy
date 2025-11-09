import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { toast } from 'sonner';

export default function CustomerPaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { createPaymentAndRedirect, loading: paymentLoading } = useMercadoPago();
  const { customer } = useCustomerAuth();

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
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!order || !customer) {
      toast.error('No se pudo procesar el reintento');
      return;
    }

    try {
      // Usar los items de la orden original
      await createPaymentAndRedirect({
        items: order.items as any,
        customer_id: customer.id,
        notes: order.notes
      });
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Error al reintentar el pago');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-6 text-center">
          <div className="flex justify-center">
            <XCircle className="h-20 w-20 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Pago No Completado
            </h1>
            <p className="text-muted-foreground">
              No pudimos procesar tu pago. Tu pedido está reservado y puedes intentar nuevamente.
            </p>
          </div>

          {order && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Número de pedido:</span>
                <span className="font-semibold">#{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total a pagar:</span>
                <span className="font-semibold">
                  ${order.total.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <span className="font-semibold text-orange-600">
                  Esperando pago
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleRetryPayment}
              disabled={paymentLoading}
              className="w-full"
            >
              {paymentLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar Pago
                </>
              )}
            </Button>
            <Button 
              onClick={() => navigate('/menu')}
              variant="outline"
              className="w-full"
            >
              Cancelar y Volver al Menú
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Si sigues teniendo problemas, contacta con nosotros
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
