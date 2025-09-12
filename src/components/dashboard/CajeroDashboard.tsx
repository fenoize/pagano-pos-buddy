import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ShoppingCart, 
  Plus, 
  Minus,
  CalendarDays,
  AlertCircle 
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/useCashSession';
import { CashSessionStatus } from '@/components/cash/CashSessionStatus';
import { CashSessionModal } from '@/components/cash/CashSessionModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CashierStats {
  todaysSales: number;
  todaysOrders: number;
  sessionSales: number;
  sessionOrders: number;
  cashTotal: number;
  mpTotal: number;
  posTotal: number;
}

export function CajeroDashboard() {
  const { user } = useAuthContext();
  const { currentSession, hasActiveSession, getSessionSummary } = useCashSession();
  const [stats, setStats] = useState<CashierStats>({
    todaysSales: 0,
    todaysOrders: 0,
    sessionSales: 0,
    sessionOrders: 0,
    cashTotal: 0,
    mpTotal: 0,
    posTotal: 0,
  });
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCashierStats();
  }, [currentSession]);

  const loadCashierStats = async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's orders created by this user
      const { data: todaysOrders, error: todaysError } = await supabase
        .from('orders')
        .select('*')
        .eq('created_by_user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .eq('status', 'Entregado');

      if (todaysError) throw todaysError;

      // Calculate today's totals
      const todaysSales = todaysOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const todaysCount = todaysOrders?.length || 0;

      let sessionSales = 0;
      let sessionCount = 0;
      let cashTotal = 0;
      let mpTotal = 0;
      let posTotal = 0;

      if (hasActiveSession() && currentSession) {
        // Get session summary
        const summary = await getSessionSummary();
        setSessionSummary(summary);
        
        sessionSales = summary?.summary.totalSales || 0;
        sessionCount = summary?.orders.length || 0;
        cashTotal = summary?.summary.totalCash || 0;
        mpTotal = summary?.summary.totalMP || 0;
        posTotal = summary?.summary.totalPOS || 0;
      } else {
        // Calculate from today's orders if no active session
        cashTotal = todaysOrders?.reduce((sum, order) => sum + order.payment_efectivo, 0) || 0;
        mpTotal = todaysOrders?.reduce((sum, order) => sum + order.payment_mp, 0) || 0;
        posTotal = todaysOrders?.reduce((sum, order) => sum + order.payment_pos, 0) || 0;
      }

      setStats({
        todaysSales,
        todaysOrders: todaysCount,
        sessionSales,
        sessionOrders: sessionCount,
        cashTotal,
        mpTotal,
        posTotal,
      });
    } catch (error) {
      console.error('Error loading cashier stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Ventas del Turno',
      value: formatCurrency(stats.sessionSales),
      description: `${stats.sessionOrders} pedidos en este turno`,
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Ventas del Día',
      value: formatCurrency(stats.todaysSales),
      description: `${stats.todaysOrders} pedidos hoy`,
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      title: 'Efectivo',
      value: formatCurrency(stats.cashTotal),
      description: 'En el turno actual',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Digital (MP + POS)',
      value: formatCurrency(stats.mpTotal + stats.posTotal),
      description: `MP: ${formatCurrency(stats.mpTotal)} | POS: ${formatCurrency(stats.posTotal)}`,
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
  ];

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold currency">
                {loading ? '...' : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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