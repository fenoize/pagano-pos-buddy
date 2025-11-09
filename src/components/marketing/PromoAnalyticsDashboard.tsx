import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePromoMetrics } from '@/hooks/usePromoMetrics';
import { Eye, MousePointerClick, ShoppingCart, TrendingUp } from 'lucide-react';

export function PromoAnalyticsDashboard() {
  const { data: metrics, isLoading } = usePromoMetrics();

  const totalViews = metrics?.reduce((sum, m) => sum + m.total_views, 0) || 0;
  const totalClicks = metrics?.reduce((sum, m) => sum + m.total_clicks, 0) || 0;
  const totalConversions = metrics?.reduce((sum, m) => sum + m.total_conversions, 0) || 0;
  const avgClickRate = metrics?.length 
    ? metrics.reduce((sum, m) => sum + m.click_rate, 0) / metrics.length 
    : 0;

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* KPIs Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vistas</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalViews.toLocaleString('es-CL')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalClicks.toLocaleString('es-CL')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversiones</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalConversions.toLocaleString('es-CL')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CTR Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{formatPercent(avgClickRate)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Promoción</CardTitle>
          <CardDescription>
            Métricas detalladas de cada promoción activa o pasada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !metrics || metrics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay datos de analytics aún. Los datos comenzarán a aparecer cuando los clientes interactúen con las promociones.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promoción</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Conversiones</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">CVR</TableHead>
                  <TableHead className="text-right">Usuarios Únicos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.promo_id}>
                    <TableCell className="font-medium">{metric.promo_title}</TableCell>
                    <TableCell className="text-right">
                      {metric.total_views.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.total_clicks.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.total_conversions.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={metric.click_rate > 10 ? 'default' : 'secondary'}>
                        {formatPercent(metric.click_rate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={metric.conversion_rate > 5 ? 'default' : 'secondary'}>
                        {formatPercent(metric.conversion_rate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm">
                        <div>{metric.unique_viewers} vistas</div>
                        <div className="text-muted-foreground">
                          {metric.unique_clickers} clicks
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
