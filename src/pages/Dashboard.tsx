import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, ShoppingCart, Clock, DollarSign, Calendar, Package, Star, CalendarIcon, ArrowRight } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { CajeroDashboard } from '@/components/dashboard/CajeroDashboard';
import { RepartoDashboard } from '@/components/dashboard/RepartoDashboard';
import { ActiveShiftWidget } from '@/components/dashboard/ActiveShiftWidget';
import { AllActiveShiftsWidget } from '@/components/dashboard/AllActiveShiftsWidget';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
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

  if (user?.role === 'Reparto') {
    return <RepartoDashboard />;
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
  
  // Filtros de período para productos más vendidos
  const [periodFilter, setPeriodFilter] = useState<'this_week' | 'this_month' | 'this_year' | 'custom'>('this_week');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadDashboardStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [periodFilter, customStartDate, customEndDate]);

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

      // Calculate date range for top products based on filter
      let productsStartDate: string;
      let productsEndDate: string = new Date().toISOString().split('T')[0];
      
      if (periodFilter === 'custom' && customStartDate && customEndDate) {
        productsStartDate = customStartDate.toISOString().split('T')[0];
        productsEndDate = customEndDate.toISOString().split('T')[0];
      } else if (periodFilter === 'this_month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        productsStartDate = monthStart.toISOString().split('T')[0];
      } else if (periodFilter === 'this_year') {
        const yearStart = new Date();
        yearStart.setMonth(0, 1);
        productsStartDate = yearStart.toISOString().split('T')[0];
      } else {
        // this_week (default)
        productsStartDate = weekStart;
      }

      // Get weekly orders (for weekly stats)
      const { data: weeklyOrders, error: weekError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${weekStart}T00:00:00`)
        .neq('status', 'Cancelado');

      if (weekError) throw weekError;

      // Get orders for top products based on selected period
      const { data: productOrders, error: productError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${productsStartDate}T00:00:00`)
        .lte('created_at', `${productsEndDate}T23:59:59`)
        .neq('status', 'Cancelado');

      if (productError) throw productError;

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

      // Calculate top products from selected period data
      const productCounts = new Map<string, { name: string; quantity: number }>();
      
      (productOrders || []).forEach(order => {
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

      // Get top 5 products sorted by quantity (compact widget)
      const topProducts = Array.from(productCounts.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

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

      {/* Active Shift Widget - Own shift */}
      <ActiveShiftWidget />

      {/* All Active Shifts Widget - For admins to see all team shifts */}
      {user?.role === 'Administrador' && <AllActiveShiftsWidget />}

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

      {/* Top Products - Compact Widget */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top 5 Productos</CardTitle>
              <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                <SelectTrigger className="w-[130px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_week">Esta semana</SelectItem>
                  <SelectItem value="this_month">Este mes</SelectItem>
                  <SelectItem value="this_year">Este año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to="/pos/reportes/productos">
                Ver reporte
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : stats.topProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stats.topProducts.map((product, index) => {
                const maxQty = stats.topProducts[0]?.quantity || 1;
                const barWidth = (product.quantity / maxQty) * 100;
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs font-bold text-primary w-4">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div 
                          className="bg-primary h-1 rounded-full transition-all" 
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {product.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay ventas en este período</p>
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