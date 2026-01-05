import { Card, CardContent } from '@/components/ui/card';
import { Package, Hash, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SalesSummaryCardsProps {
  totalProducts: number;
  totalUnits: number;
  totalRevenue: number;
  avgPerUnit: number;
  loading?: boolean;
}

export function SalesSummaryCards({
  totalProducts,
  totalUnits,
  totalRevenue,
  avgPerUnit,
  loading = false
}: SalesSummaryCardsProps) {
  const cards = [
    {
      label: 'Productos Vendidos',
      value: totalProducts.toString(),
      icon: Package,
      color: 'text-blue-500'
    },
    {
      label: 'Unidades Totales',
      value: totalUnits.toLocaleString('es-CL'),
      icon: Hash,
      color: 'text-green-500'
    },
    {
      label: 'Ingresos',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-primary'
    },
    {
      label: 'Promedio por Unidad',
      value: formatCurrency(avgPerUnit),
      icon: TrendingUp,
      color: 'text-amber-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-xl font-bold">
              {loading ? '...' : card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
