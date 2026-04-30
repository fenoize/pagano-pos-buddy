import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { PaymentMethodAgg } from '@/hooks/useReportsDashboard';

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  pos: 'POS',
  mp: 'Mercado Pago',
  app: 'App',
  mixto: 'Mixto',
  aplicacion: 'Aplicación',
  runas: 'Runas',
  colacion: 'Colación',
  canje: 'Canje',
  desconocido: 'Sin método',
};

const COLORS = [
  'bg-primary',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
];

export function PaymentMethodBreakdown({
  data,
  loading,
}: {
  data: PaymentMethodAgg[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Métodos de pago</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">Sin datos.</div>
        ) : (
          <div className="space-y-3">
            {data.map((m, idx) => (
              <div key={m.method}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">
                    {METHOD_LABELS[m.method] || m.method}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {m.count} pedidos · {m.percent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${COLORS[idx % COLORS.length]}`}
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-24 text-right">
                    {formatCurrency(m.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
