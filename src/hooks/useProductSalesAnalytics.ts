import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { getNonRealSaleMethods } from '@/lib/paymentMethodUtils';

export type PeriodPreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';
export type ChartInterval = 'day' | 'week' | 'month';

interface ProductSale {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  percentOfTotal: number;
}

interface ChartDataPoint {
  date: string;
  label: string;
  quantity: number;
  revenue: number;
}

interface SalesSummary {
  totalProducts: number;
  totalUnits: number;
  totalRevenue: number;
  avgPerUnit: number;
  // Comparison with previous period
  unitsChange?: number;
  revenueChange?: number;
}

interface UseProductSalesAnalyticsReturn {
  data: ProductSale[];
  filteredData: ProductSale[];
  chartData: ChartDataPoint[];
  summary: SalesSummary;
  loading: boolean;
  error: string | null;
  // Filters
  periodPreset: PeriodPreset;
  setPeriodPreset: (preset: PeriodPreset) => void;
  customDateRange: { start: Date | null; end: Date | null };
  setCustomDateRange: (range: { start: Date | null; end: Date | null }) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  limit: number;
  setLimit: (limit: number) => void;
  chartInterval: ChartInterval;
  setChartInterval: (interval: ChartInterval) => void;
  // Actions
  exportCSV: () => void;
  refetch: () => void;
  // Available categories
  categories: string[];
}

export function useProductSalesAnalytics(): UseProductSalesAnalyticsReturn {
  const [data, setData] = useState<ProductSale[]>([]);
  const [ordersRaw, setOrdersRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Filter states
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_week');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [limit, setLimit] = useState(25);
  const [chartInterval, setChartInterval] = useState<ChartInterval>('day');

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (periodPreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': {
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      }
      case 'this_week': {
        const start = startOfDay(subDays(now, 6));
        return { start, end: endOfDay(now) };
      }
      case 'last_week': {
        const end = endOfDay(subDays(now, 7));
        const start = startOfDay(subDays(now, 13));
        return { start, end };
      }
      case 'this_month':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case 'last_month': {
        const lastMonthEnd = subDays(startOfMonth(now), 1);
        return { start: startOfMonth(lastMonthEnd), end: endOfDay(lastMonthEnd) };
      }
      case 'custom':
        return {
          start: customDateRange.start ? startOfDay(customDateRange.start) : startOfDay(subDays(now, 7)),
          end: customDateRange.end ? endOfDay(customDateRange.end) : endOfDay(now),
        };
      default:
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    }
  }, [periodPreset, customDateRange]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startStr = dateRange.start.toISOString();
      const endStr = dateRange.end.toISOString();

      // Get non-real payment methods
      const nonRealMethods = await getNonRealSaleMethods();

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('items, total, created_at, payment_method, payment_runas')
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .neq('status', 'Cancelado');

      if (ordersError) throw ordersError;

      // Store raw orders for chart recalculation
      setOrdersRaw(orders || []);

      // Process orders to aggregate by product
      const productMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
      const categorySet = new Set<string>();
      let totalRevenue = 0;

      (orders || []).forEach((order: any) => {
        const itemsRaw = order.items;
        const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : (typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : []);

        items.forEach((item: any) => {
          const productId = item.productId || item.product_id || item.id || item.productName || 'unknown';
          const productName = item.productName || item.product_name || 'Sin nombre';

          const quantity = Number(item.quantity) || 1;
          const basePrice = Number(item.basePrice ?? item.base_price ?? 0);
          const extrasPrice = Array.isArray(item.extras)
            ? item.extras.reduce((sum: number, ext: any) => sum + (Number(ext?.price) || 0), 0)
            : 0;
          const unitPrice = basePrice + extrasPrice;
          const revenue = unitPrice * quantity;

          const category = item.categoryName || item.category || item.category_name || 'Sin categoría';

          categorySet.add(category);
          totalRevenue += revenue;

          const existing = productMap.get(String(productId));
          if (existing) {
            existing.quantity += quantity;
            existing.revenue += revenue;
          } else {
            productMap.set(String(productId), {
              name: productName,
              category,
              quantity,
              revenue,
            });
          }
        });
      });

      // Convert to array and calculate percentages
      const products: ProductSale[] = Array.from(productMap.entries())
        .map(([id, data]) => ({
          productId: id,
          productName: data.name,
          category: data.category,
          quantity: data.quantity,
          revenue: data.revenue,
          percentOfTotal: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.quantity - a.quantity);

      setData(products);
      setCategories(Array.from(categorySet).sort());
    } catch (err) {
      console.error('Error fetching product sales:', err);
      setError('Error al cargar los datos de ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Filtered data based on search and category
  const filteredData = useMemo(() => {
    let result = [...data];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.productName.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Apply limit
    if (limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }, [data, searchTerm, categoryFilter, limit]);

  // Chart data filtered by search term and category
  const chartData = useMemo((): ChartDataPoint[] => {
    const chartMap = new Map<string, { quantity: number; revenue: number }>();

    ordersRaw.forEach((order: any) => {
      const itemsRaw = order.items;
      const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : (typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : []);
      const orderDate = new Date(order.created_at);

      items.forEach((item: any) => {
        const productName = item.productName || item.product_name || 'Sin nombre';
        const category = item.categoryName || item.category || item.category_name || 'Sin categoría';

        // Apply search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          if (!productName.toLowerCase().includes(term) && !category.toLowerCase().includes(term)) {
            return;
          }
        }

        // Apply category filter
        if (categoryFilter && categoryFilter !== 'all') {
          if (category !== categoryFilter) {
            return;
          }
        }

        const quantity = Number(item.quantity) || 1;
        const basePrice = Number(item.basePrice ?? item.base_price ?? 0);
        const extrasPrice = Array.isArray(item.extras)
          ? item.extras.reduce((sum: number, ext: any) => sum + (Number(ext?.price) || 0), 0)
          : 0;
        const unitPrice = basePrice + extrasPrice;
        const revenue = unitPrice * quantity;

        // Chart aggregation
        let chartKey: string;
        if (chartInterval === 'day') {
          chartKey = format(orderDate, 'yyyy-MM-dd');
        } else if (chartInterval === 'week') {
          chartKey = format(startOfWeek(orderDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else {
          chartKey = format(startOfMonth(orderDate), 'yyyy-MM');
        }

        const existing = chartMap.get(chartKey);
        if (existing) {
          existing.quantity += quantity;
          existing.revenue += revenue;
        } else {
          chartMap.set(chartKey, { quantity, revenue });
        }
      });
    });

    // Generate chart data with all intervals
    let intervals: Date[];
    if (chartInterval === 'day') {
      intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    } else if (chartInterval === 'week') {
      intervals = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 });
    } else {
      intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    }

    return intervals.map(date => {
      let key: string;
      let label: string;
      
      if (chartInterval === 'day') {
        key = format(date, 'yyyy-MM-dd');
        label = format(date, 'dd/MM', { locale: es });
      } else if (chartInterval === 'week') {
        key = format(date, 'yyyy-MM-dd');
        label = `Sem ${format(date, 'dd/MM', { locale: es })}`;
      } else {
        key = format(date, 'yyyy-MM');
        label = format(date, 'MMM yyyy', { locale: es });
      }

      const existing = chartMap.get(key);
      return {
        date: key,
        label,
        quantity: existing?.quantity || 0,
        revenue: existing?.revenue || 0
      };
    });
  }, [ordersRaw, searchTerm, categoryFilter, chartInterval, dateRange]);

  // Calculate summary
  const summary = useMemo((): SalesSummary => {
    const totalUnits = filteredData.reduce((sum, p) => sum + p.quantity, 0);
    const totalRevenue = filteredData.reduce((sum, p) => sum + p.revenue, 0);
    
    return {
      totalProducts: filteredData.length,
      totalUnits,
      totalRevenue,
      avgPerUnit: totalUnits > 0 ? totalRevenue / totalUnits : 0
    };
  }, [filteredData]);

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Producto', 'Categoría', 'Cantidad', 'Ingresos', '% del Total'];
    const rows = filteredData.map(p => [
      p.productName,
      p.category,
      p.quantity.toString(),
      p.revenue.toString(),
      p.percentOfTotal.toFixed(1) + '%'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-productos-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    data,
    filteredData,
    chartData,
    summary,
    loading,
    error,
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    limit,
    setLimit,
    chartInterval,
    setChartInterval,
    exportCSV,
    refetch: fetchData,
    categories
  };
}
