import { LayoutDashboard, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReportsDashboard } from '@/hooks/useReportsDashboard';
import { ReportDatePicker } from '@/components/reports/ReportDatePicker';
import { DashboardKPICards } from '@/components/reports/dashboard/DashboardKPICards';
import { SalesByWeekdayChart } from '@/components/reports/dashboard/SalesByWeekdayChart';
import { SalesByHourChart } from '@/components/reports/dashboard/SalesByHourChart';
import { TopProductsCompact } from '@/components/reports/dashboard/TopProductsCompact';
import { TopCashiersTable } from '@/components/reports/dashboard/TopCashiersTable';
import { PaymentMethodBreakdown } from '@/components/reports/dashboard/PaymentMethodBreakdown';
import { ExpensesByCategoryCompact } from '@/components/reports/dashboard/ExpensesByCategoryCompact';
import { CashierFilter } from '@/components/reports/dashboard/CashierFilter';
import { BranchFilter } from '@/components/branches/BranchFilter';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function ReportsDashboard() {
  const {
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    cashierFilter,
    setCashierFilter,
    cashiers,
    branchFilter,
    setBranchFilter,
    kpis,
    salesByWeekday,
    salesByHour,
    topProducts,
    cashierRanking,
    paymentBreakdown,
    expensesByCategory,
    loading,
    refetch,
  } = useReportsDashboard();

  const exportCSV = () => {
    const lines: string[] = [];
    lines.push('Indicador,Valor');
    lines.push(`Ticket Promedio,${kpis.avgTicket.toFixed(0)}`);
    lines.push(`Ventas Totales,${kpis.totalRevenue.toFixed(0)}`);
    lines.push(`Pedidos,${kpis.totalOrders}`);
    lines.push(`Unidades,${kpis.totalUnits}`);
    lines.push(`Gastos,${kpis.totalExpenses.toFixed(0)}`);
    lines.push(`Margen,${kpis.margin.toFixed(0)}`);
    lines.push('');
    lines.push('Ranking de Cajeros');
    lines.push('Cajero,Turnos,Pedidos,Ventas,Ticket Promedio');
    cashierRanking.forEach((c) => {
      lines.push(
        `${c.name},${c.shifts},${c.orders},${c.revenue.toFixed(0)},${c.avgTicket.toFixed(0)}`
      );
    });
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escritorio-reportes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Escritorio de Reportes
              </h1>
              <p className="text-sm text-muted-foreground">
                Análisis completo de ventas, cajeros y rentabilidad
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <ReportDatePicker
            periodPreset={periodPreset}
            onPresetChange={setPeriodPreset}
            customDateRange={customDateRange}
            onCustomDateChange={setCustomDateRange}
          />
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cajero:</span>
              <CashierFilter
                value={cashierFilter}
                onChange={setCashierFilter}
                cashiers={cashiers}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <DashboardKPICards kpis={kpis} loading={loading} />

      {/* Insight banners */}
      {!loading && kpis.totalOrders > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            📅 Día con más ventas:{' '}
            <span className="font-semibold text-foreground">
              {salesByWeekday.reduce((a, b) => (b.revenue > a.revenue ? b : a)).day}
            </span>{' '}
            ({formatCurrency(
              salesByWeekday.reduce((a, b) => (b.revenue > a.revenue ? b : a)).revenue
            )})
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            ⏰ Hora pico:{' '}
            <span className="font-semibold text-foreground">
              {salesByHour.reduce((a, b) => (b.revenue > a.revenue ? b : a)).hour}
            </span>{' '}
            ({formatCurrency(
              salesByHour.reduce((a, b) => (b.revenue > a.revenue ? b : a)).revenue
            )})
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesByWeekdayChart data={salesByWeekday} loading={loading} />
        <SalesByHourChart data={salesByHour} loading={loading} />
      </div>

      {/* Cashiers ranking - full width */}
      <TopCashiersTable data={cashierRanking} loading={loading} />

      {/* Mid row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsCompact data={topProducts} loading={loading} />
        <PaymentMethodBreakdown data={paymentBreakdown} loading={loading} />
      </div>

      {/* Expenses */}
      <ExpensesByCategoryCompact data={expensesByCategory} loading={loading} />
    </div>
  );
}
