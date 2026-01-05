import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { ChartInterval } from '@/hooks/useProductSalesAnalytics';

interface ChartDataPoint {
  date: string;
  label: string;
  quantity: number;
  revenue: number;
}

interface ProductSalesChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  chartInterval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
}

const chartConfig = {
  quantity: {
    label: 'Cantidad',
    color: 'hsl(var(--primary))'
  },
  revenue: {
    label: 'Ingresos',
    color: 'hsl(var(--chart-2))'
  }
};

export function ProductSalesChart({ 
  data, 
  loading = false,
  chartInterval,
  onIntervalChange
}: ProductSalesChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [metric, setMetric] = useState<'quantity' | 'revenue'>('quantity');

  if (loading) {
    return (
      <Card>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Cargando gráfico...</p>
        </CardContent>
      </Card>
    );
  }

  const formatYAxis = (value: number) => {
    if (metric === 'revenue') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value}`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {metric === 'quantity' ? 'Cantidad: ' : 'Ingresos: '}
            <span className="font-semibold text-foreground">
              {metric === 'quantity' ? value.toLocaleString('es-CL') : formatCurrency(value)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Tendencia de Ventas</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric selector */}
            <Select value={metric} onValueChange={(v: 'quantity' | 'revenue') => setMetric(v)}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">Cantidad</SelectItem>
                <SelectItem value="revenue">Ingresos</SelectItem>
              </SelectContent>
            </Select>

            {/* Interval selector */}
            <Select value={chartInterval} onValueChange={(v: ChartInterval) => onIntervalChange(v)}>
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Por día</SelectItem>
                <SelectItem value="week">Por semana</SelectItem>
                <SelectItem value="month">Por mes</SelectItem>
              </SelectContent>
            </Select>

            {/* Chart type toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 rounded-none px-2"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 rounded-none px-2"
                onClick={() => setChartType('line')}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={metric} 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Line 
                type="monotone"
                dataKey={metric} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
