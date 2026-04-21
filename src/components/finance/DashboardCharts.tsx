import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FinancialKPIs, FinanceDailyData } from '@/types/finance';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardChartsProps {
  kpis: FinancialKPIs | null;
  dailyData: FinanceDailyData[];
  previousDailyData?: FinanceDailyData[];
  loading: boolean;
  comparisonEnabled?: boolean;
  onToggleComparison?: (value: boolean) => void;
  comparisonLabel?: string;
  currentLabel?: string;
}

// Paleta explícita y de alto contraste (válida en dark y light)
const COLORS = {
  gross: 'hsl(217 91% 60%)', // azul
  net: 'hsl(142 71% 45%)', // verde
  discounts: 'hsl(0 84% 60%)', // rojo
  prevGross: 'hsl(217 91% 60% / 0.55)',
  prevNet: 'hsl(142 71% 45% / 0.55)',
  prevDiscounts: 'hsl(0 84% 60% / 0.55)',
  delivery: 'hsl(38 92% 50%)', // ámbar
  cogs: 'hsl(280 65% 60%)', // violeta
  margin: 'hsl(173 80% 40%)', // teal
};

export function DashboardCharts({
  kpis,
  dailyData,
  previousDailyData = [],
  loading,
  comparisonEnabled = false,
  onToggleComparison,
  comparisonLabel,
  currentLabel,
}: DashboardChartsProps) {
  const [internalCompare, setInternalCompare] = useState(false);
  const compare = onToggleComparison ? comparisonEnabled : internalCompare;
  const handleToggle = (v: boolean) => {
    if (onToggleComparison) onToggleComparison(v);
    else setInternalCompare(v);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);

  // Combinar serie actual + serie de comparación por índice (mismo nº de días)
  const lineChartData = useMemo(() => {
    const len = Math.max(dailyData.length, compare ? previousDailyData.length : 0);
    const rows: any[] = [];
    for (let i = 0; i < len; i++) {
      const cur = dailyData[i];
      const prev = previousDailyData[i];
      rows.push({
        date: cur ? format(parseISO(cur.day), 'dd/MM', { locale: es }) : prev ? format(parseISO(prev.day), 'dd/MM', { locale: es }) : '',
        prevDate: prev ? format(parseISO(prev.day), 'dd/MM', { locale: es }) : '',
        'Ventas Brutas': cur?.gross_sales ?? null,
        'Ventas Netas': cur?.net_sales ?? null,
        'Descuentos': cur?.discounts ?? null,
        'Ventas Brutas (anterior)': compare ? prev?.gross_sales ?? null : undefined,
        'Ventas Netas (anterior)': compare ? prev?.net_sales ?? null : undefined,
        'Descuentos (anterior)': compare ? prev?.discounts ?? null : undefined,
      });
    }
    return rows;
  }, [dailyData, previousDailyData, compare]);

  const pieChartData = kpis
    ? [
        { name: 'Ventas Netas', value: Math.max(kpis.sales.net - kpis.sales.delivery_fee, 0), fill: COLORS.net },
        { name: 'Delivery', value: kpis.sales.delivery_fee, fill: COLORS.delivery },
        { name: 'COGS', value: kpis.costs.cogs, fill: COLORS.cogs },
      ]
    : [];

  const barChartData = kpis
    ? [
        { name: 'Ventas Netas', value: kpis.sales.net, fill: COLORS.net },
        { name: 'COGS', value: kpis.costs.cogs, fill: COLORS.cogs },
        { name: 'Margen Bruto', value: kpis.costs.gross_margin, fill: COLORS.margin },
      ]
    : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">Cargando gráficos...</div>
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

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))',
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Análisis Visual</CardTitle>
        <div className="flex items-center gap-2">
          <Switch id="compare-toggle" checked={compare} onCheckedChange={handleToggle} />
          <Label htmlFor="compare-toggle" className="text-sm cursor-pointer">
            Comparar con período anterior
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        {compare && (currentLabel || comparisonLabel) && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
            {currentLabel && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5" style={{ backgroundColor: COLORS.gross }} />
                Actual: <strong className="text-foreground">{currentLabel}</strong>
              </span>
            )}
            {comparisonLabel && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 border-t border-dashed" style={{ borderColor: COLORS.gross }} />
                Anterior: <strong className="text-foreground">{comparisonLabel}</strong>
              </span>
            )}
          </div>
        )}

        <Tabs defaultValue="ventas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
            <TabsTrigger value="composicion">Composición</TabsTrigger>
            <TabsTrigger value="comparacion">Comparación</TabsTrigger>
          </TabsList>

          <TabsContent value="ventas" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Line type="monotone" dataKey="Ventas Brutas" stroke={COLORS.gross} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                  <Line type="monotone" dataKey="Ventas Netas" stroke={COLORS.net} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                  <Line type="monotone" dataKey="Descuentos" stroke={COLORS.discounts} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                  {compare && (
                    <>
                      <Line type="monotone" dataKey="Ventas Brutas (anterior)" stroke={COLORS.prevGross} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                      <Line type="monotone" dataKey="Ventas Netas (anterior)" stroke={COLORS.prevNet} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                      <Line type="monotone" dataKey="Descuentos (anterior)" stroke={COLORS.prevDiscounts} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                    </>
                  )}
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
                    outerRadius={130}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="comparacion" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
