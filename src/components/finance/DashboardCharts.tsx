import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialKPIs, FinanceDailyData } from '@/types/finance';
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardChartsProps {
  kpis: FinancialKPIs | null;
  dailyData: FinanceDailyData[];
  loading: boolean;
}

export function DashboardCharts({ kpis, dailyData, loading }: DashboardChartsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Preparar datos para gráfico de línea
  const lineChartData = dailyData.map(d => ({
    date: format(new Date(d.day), 'dd/MM', { locale: es }),
    'Ventas Brutas': d.gross_sales,
    'Ventas Netas': d.net_sales,
    'Descuentos': d.discounts,
  }));

  // Preparar datos para gráfico de dona
  const pieChartData = kpis ? [
    { name: 'Ventas Netas', value: kpis.sales.net - kpis.sales.delivery_fee, fill: 'hsl(var(--chart-1))' },
    { name: 'Delivery', value: kpis.sales.delivery_fee, fill: 'hsl(var(--chart-2))' },
    { name: 'COGS', value: kpis.costs.cogs, fill: 'hsl(var(--chart-4))' },
  ] : [];

  // Preparar datos para gráfico de barras
  const barChartData = kpis ? [
    { name: 'Ventas Netas', value: kpis.sales.net },
    { name: 'COGS', value: kpis.costs.cogs },
    { name: 'Margen Bruto', value: kpis.costs.gross_margin },
  ] : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            Cargando gráficos...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpis || dailyData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            No hay datos suficientes para mostrar gráficos
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis Visual</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ventas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
            <TabsTrigger value="composicion">Composición</TabsTrigger>
            <TabsTrigger value="comparacion">Comparación</TabsTrigger>
          </TabsList>

          <TabsContent value="ventas" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Ventas Brutas" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Ventas Netas" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Descuentos" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="composicion" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="comparacion" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
