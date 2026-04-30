import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { ExpenseCategoryAgg } from '@/hooks/useReportsDashboard';

export function ExpensesByCategoryCompact({
  data,
  loading,
}: {
  data: ExpenseCategoryAgg[];
  loading?: boolean;
}) {
  const total = data.reduce((s, e) => s + e.total, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Gastos por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            Sin gastos en el período.
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((e) => {
              const pct = total > 0 ? (e.total / total) * 100 : 0;
              return (
                <div
                  key={e.category}
                  className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.count} mov · {pct.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(e.total)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
