import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CashierAgg } from '@/hooks/useReportsDashboard';

export function TopCashiersTable({
  data,
  loading,
}: {
  data: CashierAgg[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Mejor vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">Sin datos.</div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left font-normal py-2 px-2">#</th>
                  <th className="text-left font-normal py-2 px-2">Cajero</th>
                  <th className="text-right font-normal py-2 px-2">Turnos</th>
                  <th className="text-right font-normal py-2 px-2">Pedidos</th>
                  <th className="text-right font-normal py-2 px-2">Ventas</th>
                  <th className="text-right font-normal py-2 px-2">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c, idx) => (
                  <tr
                    key={c.userId}
                    className={`border-b border-border/50 last:border-0 ${
                      idx === 0 ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-2 px-2 text-muted-foreground">
                      {idx === 0 ? '🏆' : idx + 1}
                    </td>
                    <td className="py-2 px-2 font-medium">{c.name}</td>
                    <td className="py-2 px-2 text-right">{c.shifts}</td>
                    <td className="py-2 px-2 text-right">{c.orders}</td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {formatCurrency(c.revenue)}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {formatCurrency(c.avgTicket)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
