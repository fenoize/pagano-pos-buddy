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
  data: { hour: string; hourNum: number; revenue: number; orders: number }[];
  loading?: boolean;
}

export function SalesByHourChart({ data, loading }: Props) {
  // Trim trailing/leading zero hours to focus on operating window
  const firstNonZero = data.findIndex((d) => d.revenue > 0);
  const lastNonZero =
    data.length -
    1 -
    [...data].reverse().findIndex((d) => d.revenue > 0);
  const trimmed =
    firstNonZero === -1
      ? data.slice(8, 24)
      : data.slice(Math.max(0, firstNonZero - 1), Math.min(24, lastNonZero + 2));
  const maxRevenue = Math.max(...trimmed.map((d) => d.revenue), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ventas por horario</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Cargando...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trimmed}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                labelFormatter={(l) => `Hora ${l}`}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {trimmed.map((entry, index) => (
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
