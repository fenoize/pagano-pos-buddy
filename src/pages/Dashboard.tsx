import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, ShoppingCart, Clock, DollarSign, Calendar, Package, Star } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { CajeroDashboard } from '@/components/dashboard/CajeroDashboard';
import { ActiveShiftWidget } from '@/components/dashboard/ActiveShiftWidget';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalSales: number;
  salesCount: number;
  averageTicket: number;
  pendingOrders: number;
  cashSales: number;
  mpSales: number;
  posSales: number;
  runasSales: number;
  appSales: number;
  weeklySales: number;
  weeklySalesCount: number;
  topProducts: Array<{
    name: string;
    quantity: number;
  }>;
}

export default function Dashboard() {
  const { user } = useAuthContext();

  // Show role-specific dashboard
  if (user?.role === 'Cajero') {
    return <CajeroDashboard />;
  }

  // Default dashboard for other roles
  return <DefaultDashboard />;
}

function DefaultDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    salesCount: 0,
    averageTicket: 0,
    pendingOrders: 0,
    cashSales: 0,
    mpSales: 0,
    posSales: 0,
    runasSales: 0,
    appSales: 0,
    weeklySales: 0,
    weeklySalesCount: 0,
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();

  useEffect(() => {
    loadDashboardStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekStart = sevenDaysAgo.toISOString().split('T')[0];
      
      // Get today's orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) throw error;

      // Get weekly orders
      const { data: weeklyOrders, error: weekError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${weekStart}T00:00:00`)
        .neq('status', 'Cancelado');

      if (weekError) throw weekError;

      const completedOrders = orders?.filter(order => 
        order.status !== 'Cancelado'
      ) || [];

      const pendingOrders = orders?.filter(order => 
        ['Pendiente', 'En preparación', 'En pausa', 'Listo'].includes(order.status)
      ) || [];

      const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0);
      const salesCount = completedOrders.length;
      const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

      // Calculate payment method totals
      const cashSales = completedOrders.reduce((sum, order) => sum + (order.payment_efectivo || 0), 0);
      const mpSales = completedOrders.reduce((sum, order) => sum + (order.payment_mp || 0), 0);
      const posSales = completedOrders.reduce((sum, order) => sum + (order.payment_pos || 0), 0);
      const runasSales = completedOrders.reduce((sum, order) => sum + (order.payment_runas || 0), 0);
      const appSales = completedOrders.reduce((sum, order) => sum + (order.payment_aplicacion || 0), 0);

      // Weekly stats
      const weeklySales = (weeklyOrders || []).reduce((sum, order) => sum + order.total, 0);
      const weeklySalesCount = (weeklyOrders || []).length;

      // Calculate top products from WEEKLY data
      const productCounts = new Map<string, { name: string; quantity: number }>();
      
      (weeklyOrders || []).forEach(order => {
        const items = order.items as any[];
        items.forEach(item => {
          const key = item.productId || item.productName;
          const existing = productCounts.get(key);
          
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            productCounts.set(key, {
              name: item.productName || 'Sin nombre',
              quantity: item.quantity,
            });
          }
        });
      });

      // Get top 10 products sorted by quantity
      const topProducts = Array.from(productCounts.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setStats({
        totalSales,
        salesCount,
        averageTicket,
        pendingOrders: pendingOrders.length,
        cashSales,
        mpSales,
        posSales,
        runasSales,
        appSales,
        weeklySales,
        weeklySalesCount,
        topProducts,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Ventas del Día',
      value: formatCurrency(stats.totalSales),
      description: `${stats.salesCount} ventas realizadas`,
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Ventas Semanales',
      value: formatCurrency(stats.weeklySales),
      description: `${stats.weeklySalesCount} ventas (últimos 7 días)`,
      icon: Calendar,
      color: 'text-blue-500',
    },
    {
      title: 'Ticket Promedio',
      value: formatCurrency(stats.averageTicket),
      description: 'Promedio por venta',
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      title: 'Pedidos Pendientes',
      value: stats.pendingOrders.toString(),
      description: 'En cocina y preparación',
      icon: Clock,
      color: 'text-amber-500',
    },
  ];

  const paymentMethods = [
    {
      name: 'Efectivo',
      amount: stats.cashSales,
      color: 'bg-green-500',
      count: 0,
    },
    {
      name: 'Transferencia/MP',
      amount: stats.mpSales,
      color: 'bg-blue-500',
      count: 0,
    },
    {
      name: 'POS (Débito/Crédito)',
      amount: stats.posSales,
      color: 'bg-purple-500',
      count: 0,
    },
    {
      name: 'Aplicación',
      amount: stats.appSales,
      color: 'bg-orange-500',
      count: 0,
    },
  ];

  // Calculate total WITHOUT runas
  const totalPayments = stats.cashSales + stats.mpSales + stats.posSales + stats.appSales;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">
          Escritorio
        </h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.username} ({user?.role})
        </p>
      </div>

      {/* Active Shift Widget */}
      <ActiveShiftWidget />

      {/* KPIs Grid */}
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

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Productos Más Vendidos
          </CardTitle>
          <CardDescription>
            Últimos 7 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : stats.topProducts.length > 0 ? (
            <div className="space-y-2">
              {stats.topProducts.map((product, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1">
                    {product.quantity} pedidos
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay ventas esta semana</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Método de Pago</CardTitle>
          <CardDescription>
            Desglose detallado de pagos del día (actualizado cada 30 seg)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.map((method, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${method.color}`} />
                <span className="font-medium">{method.name}</span>
              </div>
              <span className="font-semibold currency">
                {loading ? '...' : formatCurrency(method.amount)}
              </span>
            </div>
          ))}
          
          {/* Runas - Shown but not in total */}
          <div className="flex items-center justify-between p-2 rounded-lg border border-dashed">
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-muted-foreground">Runas (no monetario)</span>
            </div>
            <span className="font-semibold text-muted-foreground">
              {loading ? '...' : formatCurrency(stats.runasSales)}
            </span>
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Subtotal Monetario</span>
              <span className="font-semibold currency">
                {loading ? '...' : formatCurrency(totalPayments)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 text-lg">
              <span className="font-bold">Total General</span>
              <span className="font-bold currency">
                {loading ? '...' : formatCurrency(stats.totalSales)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.salesCount} ventas completadas • {stats.pendingOrders} pendientes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}