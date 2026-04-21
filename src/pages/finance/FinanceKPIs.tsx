import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, TrendingUp, DollarSign, ShoppingCart, Truck, Percent, Receipt } from 'lucide-react';
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { KPICard } from '@/components/finance/KPICard';
import { DashboardCharts } from '@/components/finance/DashboardCharts';
import { useFinanceKPIs } from '@/hooks/useFinanceKPIs';
import { useFinanceDailyData } from '@/hooks/useFinanceDailyData';
import { DateRangePreset } from '@/types/finance';
import { cn } from '@/lib/utils';

export default function FinanceKPIs() {
  const [preset, setPreset] = useState<DateRangePreset>('this_week');
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  const { kpis, loading } = useFinanceKPIs(startDate, endDate);
  const { dailyData, loading: loadingDaily } = useFinanceDailyData(startDate, endDate);

  // Comparación con período anterior (misma duración)
  const [compareEnabled, setCompareEnabled] = useState(false);
  const { previousStart, previousEnd } = useMemo(() => {
    const days = differenceInCalendarDays(endDate, startDate) + 1;
    const prevEnd = subDays(startDate, 1);
    const prevStart = subDays(prevEnd, days - 1);
    return { previousStart: prevStart, previousEnd: prevEnd };
  }, [startDate, endDate]);
  const { dailyData: previousDailyData, loading: loadingPrevious } = useFinanceDailyData(
    compareEnabled ? previousStart : startDate,
    compareEnabled ? previousEnd : endDate
  );

  const handlePresetChange = (value: DateRangePreset) => {
    setPreset(value);
    const today = new Date();

    switch (value) {
      case 'this_week':
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'last_week':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        setStartDate(lastWeekStart);
        setEndDate(endOfWeek(lastWeekStart, { weekStartsOn: 1 }));
        break;
      case 'this_month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case 'last_month':
        const lastMonth = subDays(startOfMonth(today), 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Escritorio</h1>
        </div>

        {/* Filtros de rango */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_week">Esta Semana</SelectItem>
                  <SelectItem value="last_week">Semana Pasada</SelectItem>
                  <SelectItem value="this_month">Este Mes</SelectItem>
                  <SelectItem value="last_month">Mes Pasado</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {preset === 'custom' && (
                <>
                  <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full md:w-[200px] justify-start text-left font-normal')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, 'PPP', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          if (date) setStartDate(date);
                          setStartCalendarOpen(false);
                        }}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full md:w-[200px] justify-start text-left font-normal')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, 'PPP', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          if (date) setEndDate(date);
                          setEndCalendarOpen(false);
                        }}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="text-center py-12">Cargando indicadores...</div>
      ) : kpis ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Ventas Brutas"
              value={formatCurrency(kpis.sales.gross)}
              icon={DollarSign}
              subtitle={`${kpis.orders} órdenes`}
            />
            <KPICard
              title="Descuentos"
              value={formatCurrency(kpis.sales.discounts)}
              icon={Percent}
              subtitle="Cupones y descuentos aplicados"
            />
            <KPICard
              title="Ventas Netas"
              value={formatCurrency(kpis.sales.net)}
              icon={Receipt}
              subtitle="Después de descuentos"
            />
            <KPICard
              title="Ticket Promedio"
              value={formatCurrency(kpis.sales.aov)}
              icon={ShoppingCart}
              subtitle="AOV (Average Order Value)"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KPICard
              title="Delivery Cobrado"
              value={formatCurrency(kpis.sales.delivery_fee)}
              icon={Truck}
              subtitle="Tarifas de envío"
            />
            <KPICard
              title="COGS"
              value={formatCurrency(kpis.costs.cogs)}
              icon={Receipt}
              subtitle="Costo de productos vendidos"
            />
            <KPICard
              title="Margen Bruto"
              value={`${kpis.costs.gross_margin_pct}%`}
              icon={TrendingUp}
              subtitle={`${formatCurrency(kpis.costs.gross_margin)} en ganancias`}
              trend={kpis.costs.gross_margin_pct > 60 ? 'up' : 'neutral'}
            />
          </div>

          {/* Dashboard Charts */}
          <DashboardCharts kpis={kpis} dailyData={dailyData} loading={loadingDaily} />
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No hay datos para el período seleccionado
        </div>
      )}
    </div>
  );
}
