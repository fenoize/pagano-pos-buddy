import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ProductAgg } from '@/hooks/useReportsDashboard';

export function TopProductsCompact({
  data,
  loading,
}: {
  data: ProductAgg[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Top productos vendidos</CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
          <Link to="/pos/reportes/productos">
            Ver completo <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">Sin ventas en el período.</div>
        ) : (
          <div className="space-y-2">
            {data.map((p, idx) => (
              <div
                key={p.productId}
                className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0"
              >
                <span className="text-xs text-muted-foreground w-5 text-right">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.productName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{p.quantity}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(p.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
