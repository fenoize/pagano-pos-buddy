import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProductSalesAnalytics } from '@/hooks/useProductSalesAnalytics';
import { ReportDatePicker } from '@/components/reports/ReportDatePicker';
import { SalesSummaryCards } from '@/components/reports/SalesSummaryCards';
import { ProductSalesChart } from '@/components/reports/ProductSalesChart';
import { ProductSalesTable } from '@/components/reports/ProductSalesTable';

export default function ProductSalesReport() {
  const {
    filteredData,
    chartData,
    summary,
    loading,
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    categories,
    limit,
    setLimit,
    chartInterval,
    setChartInterval,
    exportCSV,
    refetch
  } = useProductSalesAnalytics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reporte de Productos</h1>
              <p className="text-sm text-muted-foreground">Análisis detallado de ventas por producto</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Date Picker */}
        <ReportDatePicker
          periodPreset={periodPreset}
          onPresetChange={setPeriodPreset}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
        />
      </div>

      {/* Summary Cards */}
      <SalesSummaryCards
        totalProducts={summary.totalProducts}
        totalUnits={summary.totalUnits}
        totalRevenue={summary.totalRevenue}
        avgPerUnit={summary.avgPerUnit}
        loading={loading}
      />

      {/* Chart */}
      <ProductSalesChart
        data={chartData}
        loading={loading}
        chartInterval={chartInterval}
        onIntervalChange={setChartInterval}
      />

      {/* Table */}
      <ProductSalesTable
        data={filteredData}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories}
        limit={limit}
        onLimitChange={setLimit}
        onExport={exportCSV}
      />
    </div>
  );
}
