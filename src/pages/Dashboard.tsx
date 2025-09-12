import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, ShoppingCart, Clock, DollarSign } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { CajeroDashboard } from '@/components/dashboard/CajeroDashboard';

interface DashboardStats {
  totalSales: number;
  salesCount: number;
  averageTicket: number;
  pendingOrders: number;
  cashSales: number;
  mpSales: number;
  posSales: number;
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
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) throw error;

      const completedOrders = orders?.filter(order => 
        order.status === 'Entregado'
      ) || [];

      const pendingOrders = orders?.filter(order => 
        ['Pendiente', 'En preparación', 'En pausa', 'Listo'].includes(order.status)
      ) || [];

      const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0);
      const salesCount = completedOrders.length;
      const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

      // Calculate payment method totals
      const cashSales = completedOrders.reduce((sum, order) => sum + order.payment_efectivo, 0);
      const mpSales = completedOrders.reduce((sum, order) => sum + order.payment_mp, 0);
      const posSales = completedOrders.reduce((sum, order) => sum + order.payment_pos, 0);

      setStats({
        totalSales,
        salesCount,
        averageTicket,
        pendingOrders: pendingOrders.length,
        cashSales,
        mpSales,
        posSales,
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
      title: 'Ticket Promedio',
      value: formatCurrency(stats.averageTicket),
      description: 'Promedio por venta',
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      title: 'Pedidos Pendientes',
      value: stats.pendingOrders.toString(),
      description: 'En cocina y preparación',
      icon: Clock,
      color: 'text-warning',
    },
    {
      title: 'Total Órdenes',
      value: stats.salesCount.toString(),
      description: 'Completadas hoy',
      icon: ShoppingCart,
      color: 'text-primary',
    },
  ];

  const paymentMethods = [
    {
      name: 'Efectivo',
      amount: stats.cashSales,
      color: 'bg-primary',
    },
    {
      name: 'MercadoPago/Transfer',
      amount: stats.mpSales,
      color: 'bg-secondary',
    },
    {
      name: 'POS',
      amount: stats.posSales,
      color: 'bg-accent',
    },
  ];

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

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Método de Pago</CardTitle>
          <CardDescription>
            Distribución de pagos del día
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.map((method, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${method.color}`} />
                <span className="font-medium">{method.name}</span>
              </div>
              <span className="font-semibold currency">
                {loading ? '...' : formatCurrency(method.amount)}
              </span>
            </div>
          ))}
          <div className="border-t pt-4 flex items-center justify-between font-bold">
            <span>Total</span>
            <span className="currency">
              {loading ? '...' : formatCurrency(stats.totalSales)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}