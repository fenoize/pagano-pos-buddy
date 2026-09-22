import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RefreshCw, ShieldCheck } from 'lucide-react';
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
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const run = async () => {
      const paid = await fetchOrder();
      attempts += 1;
      // Esperar hasta ~12s por si el webhook de MercadoPago aún no confirma el pago
      if (!paid && !cancelled && attempts < 6) {
        setTimeout(run, 2000);
      }
    };
    run();

    return () => { cancelled = true; };
  }, [orderId]);

  const fetchOrder = async (): Promise<boolean> => {
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

      // Si el pago sí se acreditó, no mostrar error: llevar al seguimiento
      const pagado = data.status !== 'PendientePago' && data.status !== 'Cancelado';
      if (pagado) {
        toast.success('Tu pago fue confirmado');
        navigate(`/track/${orderId}`, { replace: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching order:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!orderId) return;
    setVerifying(true);
    try {
      const pagado = await fetchOrder();
      if (!pagado) {
        toast.info('Aún no recibimos la confirmación de Mercado Pago. Si el dinero ya fue descontado de tu cuenta, espera unos segundos y vuelve a presionar Verificar Pago.');
      }
    } finally {
      setVerifying(false);
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
            <XCircle className="h-20 w-20 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Pago No Completado
            </h1>
            <p className="text-muted-foreground">
              No pudimos confirmar tu pago. Si el cobro aparece en tu banco, no vuelvas a pagar: contáctanos y lo revisamos. También puedes reintentar el pago.
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
                <span className="font-semibold text-destructive">
                  {order.status === 'Cancelado' ? 'Cancelado' : 'Pago no confirmado'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleVerifyPayment}
              disabled={verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando con el banco...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verificar Pago
                </>
              )}
            </Button>
            <Button 
              onClick={handleRetryPayment}
              disabled={paymentLoading}
              variant="outline"
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
              onClick={async () => {
                // Solo cancelar si realmente sigue sin pagarse
                if (orderId) {
                  await supabase
                    .from('orders')
                    .update({ status: 'Cancelado' })
                    .eq('id', orderId)
                    .eq('status', 'PendientePago');
                }
                navigate('/menu');
              }}
              variant="ghost"
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
