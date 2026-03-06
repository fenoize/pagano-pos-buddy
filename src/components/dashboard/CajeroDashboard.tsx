import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ShoppingCart, 
  Plus, 
  Minus,
  CalendarDays,
  AlertCircle,
  Banknote,
  CreditCard,
  Smartphone,
  AppWindow,
  Star,
  Wallet,
  CircleDollarSign,
  Receipt,
  LucideIcon
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/useCashSession';
import { CashSessionStatus } from '@/components/cash/CashSessionStatus';
import { CashSessionModal } from '@/components/cash/CashSessionModal';
import { DeliveryCashPendingWidget } from '@/components/cash/DeliveryCashPendingWidget';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentMethods, PaymentMethod } from '@/hooks/usePaymentMethods';
import { getNonRealSaleMethods, getOrderRealRevenue } from '@/lib/paymentMethodUtils';

// Mapeo de iconos dinámicos
const iconMap: Record<string, LucideIcon> = {
  Banknote,
  CreditCard,
  Smartphone,
  AppWindow,
  Sparkles: Star,
  Star,
  Wallet,
  CircleDollarSign,
  Receipt,
  DollarSign,
};

// Mapeo de colores por método
const colorMap: Record<string, string> = {
  efectivo: 'bg-green-500',
  pos: 'bg-purple-500',
  transferencia: 'bg-blue-500',
  aplicacion: 'bg-orange-500',
  runas: 'bg-amber-400',
};

// Mapeo de campos de pago en orders
const paymentFieldMap: Record<string, string> = {
  efectivo: 'payment_efectivo',
  pos: 'payment_pos',
  transferencia: 'payment_mp',
  aplicacion: 'payment_aplicacion',
  runas: 'payment_runas',
};

interface CashierStats {
  todaysSales: number;
  todaysOrders: number;
  sessionSales: number;
  sessionOrders: number;
  paymentTotals: Record<string, number>;
  pendingOrders: number;
}

export function CajeroDashboard() {
  const { user } = useAuthContext();
  const { currentSession, hasActiveSession, getSessionSummary } = useCashSession();
  const { paymentMethods } = usePaymentMethods();
  const [stats, setStats] = useState<CashierStats>({
    todaysSales: 0,
    todaysOrders: 0,
    sessionSales: 0,
    sessionOrders: 0,
    paymentTotals: {},
    pendingOrders: 0,
  });
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCashierStats();
  }, [currentSession, paymentMethods]);

  const loadCashierStats = async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's orders created by this user (only delivered = real sales)
      const { data: todaysOrders, error: todaysError } = await supabase
        .from('orders')
        .select('id, total, payment_efectivo, payment_mp, payment_pos, payment_aplicacion, payment_runas, payment_method, status')
        .eq('created_by_user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (todaysError) throw todaysError;

      // Get non-real payment methods
      const nonRealMethods = await getNonRealSaleMethods();

      // Filter for delivered orders (real sales) and exclude non-real methods from totals
      const deliveredOrders = todaysOrders?.filter(o => o.status === 'Entregado') || [];
      const pendingOrders = todaysOrders?.filter(o => 
        o.status !== 'Entregado' && o.status !== 'Cancelado'
      ).length || 0;

      // Calculate today's totals (excluding non-real payment methods)
      const todaysSales = deliveredOrders.reduce((sum, order) => {
        return sum + getOrderRealRevenue(order, nonRealMethods);
      }, 0);
      const todaysCount = deliveredOrders.filter(o => getOrderRealRevenue(o, nonRealMethods) > 0).length;

      let sessionSales = 0;
      let sessionCount = 0;
      let paymentTotals: Record<string, number> = {};

      // Initialize all payment methods with 0
      paymentMethods.forEach(method => {
        paymentTotals[method.name] = 0;
      });

      if (hasActiveSession() && currentSession) {
        // Get session summary
        const summary = await getSessionSummary();
        setSessionSummary(summary);
        
        // Filter only delivered orders from session
        const sessionDeliveredOrders = (summary?.orders || []).filter(
          (o: any) => o.status === 'Entregado'
        );
        
        // Calculate session sales excluding runas
        sessionSales = sessionDeliveredOrders.reduce((sum: number, order: any) => {
          const runasAmount = order.payment_runas || 0;
          return sum + (order.total - runasAmount);
        }, 0);
        sessionCount = sessionDeliveredOrders.length;
        
        // Calculate totals per payment method
        paymentTotals.efectivo = sessionDeliveredOrders.reduce((sum: number, o: any) => sum + (o.payment_efectivo || 0), 0);
        paymentTotals.transferencia = sessionDeliveredOrders.reduce((sum: number, o: any) => sum + (o.payment_mp || 0), 0);
        paymentTotals.pos = sessionDeliveredOrders.reduce((sum: number, o: any) => sum + (o.payment_pos || 0), 0);
        paymentTotals.aplicacion = sessionDeliveredOrders.reduce((sum: number, o: any) => sum + (o.payment_aplicacion || 0), 0);
        paymentTotals.runas = sessionDeliveredOrders.reduce((sum: number, o: any) => sum + (o.payment_runas || 0), 0);
      } else {
        // Calculate from today's orders if no active session
        paymentTotals.efectivo = deliveredOrders.reduce((sum, o) => sum + (o.payment_efectivo || 0), 0);
        paymentTotals.transferencia = deliveredOrders.reduce((sum, o) => sum + (o.payment_mp || 0), 0);
        paymentTotals.pos = deliveredOrders.reduce((sum, o) => sum + (o.payment_pos || 0), 0);
        paymentTotals.aplicacion = deliveredOrders.reduce((sum, o) => sum + (o.payment_aplicacion || 0), 0);
        paymentTotals.runas = deliveredOrders.reduce((sum, o) => sum + (o.payment_runas || 0), 0);
      }

      setStats({
        todaysSales,
        todaysOrders: todaysCount,
        sessionSales,
        sessionOrders: sessionCount,
        paymentTotals,
        pendingOrders,
      });
    } catch (error) {
      console.error('Error loading cashier stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total real sales (excluding runas)
  const totalRealSales = Object.entries(stats.paymentTotals)
    .filter(([key]) => key !== 'runas')
    .reduce((sum, [, value]) => sum + value, 0);

  // Get active payment methods for display
  const activePaymentMethods = paymentMethods.filter(m => m.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">
          Panel de Caja
        </h1>
        <p className="text-muted-foreground">
          Bienvenido/a, {user?.username}
        </p>
      </div>

      {/* Cash Session Status */}
      <CashSessionStatus />

      {/* Session Warning if no active session */}
      {!hasActiveSession() && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Sin turno activo
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Las estadísticas mostradas corresponden al día completo. Abre un turno para ver datos específicos de la sesión.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Turno</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatCurrency(hasActiveSession() ? stats.sessionSales : stats.todaysSales)}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasActiveSession() ? stats.sessionOrders : stats.todaysOrders} ventas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : (() => {
                const sales = hasActiveSession() ? stats.sessionSales : stats.todaysSales;
                const orders = hasActiveSession() ? stats.sessionOrders : stats.todaysOrders;
                return formatCurrency(orders > 0 ? sales / orders : 0);
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio por venta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.pendingOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              En cocina y preparación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ventas por Método de Pago */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Ventas por Método de Pago</CardTitle>
          <CardDescription>Desglose del día</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activePaymentMethods.map((method) => {
            const IconComponent = iconMap[method.icon] || DollarSign;
            const bgColor = colorMap[method.name] || 'bg-gray-500';
            const amount = stats.paymentTotals[method.name] || 0;
            const isRunas = method.name === 'runas';
            
            return (
              <div 
                key={method.id} 
                className={`flex items-center justify-between py-2 ${isRunas ? 'opacity-60 border-t pt-3 mt-2' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${bgColor}`} />
                  <span className="text-sm font-medium">{method.display_name}</span>
                </div>
                <span className={`font-semibold ${isRunas ? 'text-muted-foreground' : ''}`}>
                  {loading ? '...' : formatCurrency(amount)}
                </span>
              </div>
            );
          })}
          
          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <span className="font-bold">Total</span>
              <p className="text-xs text-muted-foreground">
                {stats.todaysOrders} ventas • {stats.pendingOrders} pendientes
              </p>
            </div>
            <span className="text-lg font-bold">
              {loading ? '...' : formatCurrency(totalRealSales)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Session Summary */}
      {hasActiveSession() && sessionSummary && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Resumen del Turno Actual</CardTitle>
                <CardDescription>
                  Iniciado el {formatDate(currentSession?.opened_at || '')}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMovementModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                <Minus className="w-4 h-4 mr-2" />
                Registrar Movimiento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Efectivo inicial</p>
                <p className="font-semibold">{formatCurrency(sessionSummary.session.opening_cash)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ventas efectivo</p>
                <p className="font-semibold text-green-600">{formatCurrency(sessionSummary.summary.totalCash)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ingresos adicionales</p>
                <p className="font-semibold text-green-600">+{formatCurrency(sessionSummary.summary.ingresos)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Egresos</p>
                <p className="font-semibold text-red-600">-{formatCurrency(sessionSummary.summary.egresos)}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Efectivo esperado en caja:</span>
                <span className="text-lg font-bold">{formatCurrency(sessionSummary.summary.expectedCash)}</span>
              </div>
            </div>

            {/* Recent movements */}
            {sessionSummary.movements.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Movimientos recientes</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sessionSummary.movements.slice(-5).map((movement: any) => (
                    <div key={movement.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        {movement.type === 'ingreso' ? (
                          <Plus className="w-3 h-3 text-green-600" />
                        ) : (
                          <Minus className="w-3 h-3 text-red-600" />
                        )}
                        <span className="capitalize">{movement.type}</span>
                        {movement.note && (
                          <span className="text-muted-foreground">- {movement.note}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={movement.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}>
                          {movement.type === 'ingreso' ? '+' : '-'}{formatCurrency(movement.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(movement.created_at).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Cash Pending Widget */}
      {hasActiveSession() && <DeliveryCashPendingWidget />}

      {/* Cash Movement Modal */}
      <CashSessionModal
        isOpen={showMovementModal}
        onClose={() => {
          setShowMovementModal(false);
          loadCashierStats(); // Refresh stats after movement
        }}
        type="movement"
      />
    </div>
  );
}