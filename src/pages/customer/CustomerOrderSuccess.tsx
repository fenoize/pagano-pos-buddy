import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShoppingBag, Home, Coins, Star } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatRunas } from '@/lib/utils';
import { useRunasConfig } from '@/hooks/useRunasConfig';

export default function CustomerOrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { runaRedemptionValue } = useRunasConfig();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        navigate('/cart');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, customers(name, cantidad_runas)')
          .eq('order_number', parseInt(orderId))
          .single();

        if (error) throw error;
        setOrderDetails(data);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="customer-app min-h-screen pb-20 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="customer-app min-h-screen pb-20 bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">No se encontró la orden</p>
            <Button onClick={() => navigate('/menu')}>
              Volver al Menú
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaidWithRunas = orderDetails.payment_method === 'runas';
  const runasUsed = isPaidWithRunas ? Math.ceil((orderDetails.payment_runas || 0) / runaRedemptionValue) : 0;

  const hasDiscount = (orderDetails.discount || 0) > 0;
  const runasEarned = !isPaidWithRunas && !hasDiscount ? Math.floor(orderDetails.total / 5000) : 0;
  const pointsEarned = Math.floor(orderDetails.total / 100);
  const showRewards = orderDetails.customer_id && (runasEarned > 0 || pointsEarned > 0);

  return (
    <div className="customer-app min-h-screen pb-20 bg-background">
      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        {/* Success Icon */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">¡Pedido Confirmado!</h1>
          <p className="text-muted-foreground">
            Tu pedido ha sido recibido y está siendo preparado
          </p>
        </div>

        {/* Rewards Block */}
        {showRewards && (
          <Card className="bg-slate-900/60 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="text-center font-semibold text-primary mb-4 text-sm uppercase tracking-wider">
                Recompensas ganadas en esta compra
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {runasEarned > 0 && (
                  <div className="flex flex-col items-center p-3 bg-background/40 rounded-lg border border-primary/10">
                    <Coins className="h-6 w-6 text-primary mb-1" />
                    <span className="text-xl font-bold text-primary">+{formatRunas(runasEarned)}</span>
                    <span className="text-xs text-muted-foreground">Runas</span>
                  </div>
                )}
                {pointsEarned > 0 && (
                  <div className="flex flex-col items-center p-3 bg-background/40 rounded-lg border border-yellow-500/10">
                    <Star className="h-6 w-6 text-yellow-400 mb-1" />
                    <span className="text-xl font-bold text-yellow-400">+{formatRunas(pointsEarned)}</span>
                    <span className="text-xs text-muted-foreground">Puntos</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}


        {/* Order Details */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center pb-4 border-b">
              <p className="text-sm text-muted-foreground mb-1">Número de pedido</p>
              <p className="text-3xl font-bold text-primary">#{orderDetails.order_number}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total pagado:</span>
                <span className="font-bold">
                  {isPaidWithRunas ? `${runasUsed} Runas ✨` : formatCurrency(orderDetails.total)}
                </span>
              </div>

              {isPaidWithRunas && (
                <>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Coins className="h-4 w-4 text-primary" />
                      Runas utilizadas:
                    </span>
                    <span className="font-bold text-primary">
                      {formatRunas(runasUsed)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Runas restantes:</span>
                    <span className="font-semibold">
                      {formatRunas(orderDetails.customers?.cantidad_runas || 0)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de entrega:</span>
                <span className="font-semibold capitalize">{orderDetails.fulfillment === 'pickup' ? 'Retiro en local' : 'Delivery'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {orderDetails.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Tu pedido está en preparación</p>
              <p>✓ Recibirás una notificación cuando esté listo</p>
              <p>✓ Podrás rastrear el estado en tiempo real</p>
              {isPaidWithRunas && (
                <p className="text-primary font-medium">
                  ✓ Pago procesado con runas exitosamente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate(`/track/${orderDetails.id}`)}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Ver Estado del Pedido
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => navigate('/menu')}
          >
            <Home className="h-4 w-4 mr-2" />
            Volver al Menú
          </Button>
        </div>
      </div>
      <CustomerBottomNav />
    </div>
  );
}
