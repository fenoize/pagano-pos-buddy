import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Props {
  data: { day: string; revenue: number; orders: number }[];
  loading?: boolean;
}

export function SalesByWeekdayChart({ data, loading }: Props) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ventas por día de la semana</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Cargando...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'revenue'
                    ? [formatCurrency(value), 'Ingresos']
                    : [value, 'Pedidos']
                }
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.revenue === maxRevenue && maxRevenue > 0
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted-foreground) / 0.4)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
