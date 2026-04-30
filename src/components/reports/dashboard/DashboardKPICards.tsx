import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  PiggyBank,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { DashboardKPIs } from '@/hooks/useReportsDashboard';

export function DashboardKPICards({
  kpis,
  loading,
}: {
  kpis: DashboardKPIs;
  loading: boolean;
}) {
  const cards = [
    {
      label: 'Ticket Promedio',
      value: formatCurrency(kpis.avgTicket),
      icon: Receipt,
      color: 'text-primary',
    },
    {
      label: 'Ventas Totales',
      value: formatCurrency(kpis.totalRevenue),
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'Pedidos',
      value: kpis.totalOrders.toLocaleString('es-CL'),
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      label: 'Unidades',
      value: kpis.totalUnits.toLocaleString('es-CL'),
      icon: Package,
      color: 'text-amber-500',
    },
    {
      label: 'Gastos',
      value: formatCurrency(kpis.totalExpenses),
      icon: Wallet,
      color: 'text-red-500',
    },
    {
      label: 'Margen',
      value: formatCurrency(kpis.margin),
      icon: PiggyBank,
      color: kpis.margin >= 0 ? 'text-emerald-500' : 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground truncate">
                {c.label}
              </span>
            </div>
            <p className="text-lg font-bold truncate">
              {loading ? '...' : c.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
