import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  startOfWeek,
  startOfMonth,
  subDays,
  startOfDay,
  endOfDay,
  getDay,
  getHours,
} from 'date-fns';
import { getNonRealSaleMethods } from '@/lib/paymentMethodUtils';

export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface CashierOption {
  id: string;
  name: string;
}

export interface ProductAgg {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  percentOfTotal: number;
}

export interface CashierAgg {
  userId: string;
  name: string;
  shifts: number;
  orders: number;
  revenue: number;
  avgTicket: number;
}

export interface PaymentMethodAgg {
  method: string;
  total: number;
  count: number;
  percent: number;
}

export interface ExpenseCategoryAgg {
  category: string;
  total: number;
  count: number;
}

export interface DashboardKPIs {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  avgTicket: number;
  totalExpenses: number;
  margin: number;
}

export function useReportsDashboard() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_week');
  const [customDateRange, setCustomDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [cashierFilter, setCashierFilter] = useState<string>('all');

  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashiers, setCashiers] = useState<CashierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodPreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': {
        const y = subDays(now, 1);
        return { start: startOfDay(y), end: endOfDay(y) };
      }
      case 'this_week':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case 'last_week':
        return {
          start: startOfDay(subDays(now, 13)),
          end: endOfDay(subDays(now, 7)),
        };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case 'last_month': {
        const lastEnd = subDays(startOfMonth(now), 1);
        return { start: startOfMonth(lastEnd), end: endOfDay(lastEnd) };
      }
      case 'custom':
        return {
          start: customDateRange.start
            ? startOfDay(customDateRange.start)
            : startOfDay(subDays(now, 7)),
          end: customDateRange.end ? endOfDay(customDateRange.end) : endOfDay(now),
        };
      default:
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    }
  }, [periodPreset, customDateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const startStr = dateRange.start.toISOString();
      const endStr = dateRange.end.toISOString();
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      const nonRealMethods = await getNonRealSaleMethods();

      let ordersQuery = supabase
        .from('orders')
        .select(
          'id, total, items, created_at, status, payment_method, payment_runas, created_by_user_id, cash_session_id'
        )
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .neq('status', 'Cancelado');

      if (cashierFilter && cashierFilter !== 'all') {
        ordersQuery = ordersQuery.eq('created_by_user_id', cashierFilter);
      }

      const [ordersRes, expensesRes, usersRes] = await Promise.all([
        ordersQuery,
        supabase
          .from('finance_expenses')
          .select('id, expense_date, category, amount')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate),
        supabase
          .from('users')
          .select('id, username, full_name')
          .eq('active', true),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (usersRes.error) throw usersRes.error;

      const realOrders = (ordersRes.data || []).filter((o: any) => {
        if (o.payment_method === 'mixto') return true;
        return !nonRealMethods.has(o.payment_method);
      });

      setOrders(realOrders);
      setExpenses(expensesRes.data || []);

      const userMap = new Map<string, string>();
      (usersRes.data || []).forEach((u: any) => {
        userMap.set(u.id, u.full_name || u.username || 'Sin nombre');
      });

      const cashierIds = new Set<string>();
      realOrders.forEach((o: any) => {
        if (o.created_by_user_id) cashierIds.add(o.created_by_user_id);
      });
      const cashierList: CashierOption[] = Array.from(cashierIds).map((id) => ({
        id,
        name: userMap.get(id) || 'Usuario',
      }));
      cashierList.sort((a, b) => a.name.localeCompare(b.name));

      // Always merge with current selected cashier list (so dropdown isn't empty when filtering)
      const { data: allUsersData } = await supabase
        .from('users')
        .select('id, username, full_name')
        .eq('active', true);
      const allCashiers: CashierOption[] = (allUsersData || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || u.username || 'Sin nombre',
      }));
      allCashiers.sort((a, b) => a.name.localeCompare(b.name));
      setCashiers(allCashiers);
    } catch (err: any) {
      console.error('Error loading reports dashboard:', err);
      setError('Error al cargar datos del escritorio de reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, cashierFilter]);

  // ---- KPIs
  const kpis = useMemo<DashboardKPIs>(() => {
    const totalRevenue = orders.reduce(
      (s, o) => s + (Number(o.total) || 0) - (Number(o.payment_runas) || 0),
      0
    );
    const totalOrders = orders.length;
    let totalUnits = 0;
    orders.forEach((o) => {
      const items = Array.isArray(o.items)
        ? o.items
        : typeof o.items === 'string'
        ? JSON.parse(o.items)
        : [];
      items.forEach((it: any) => {
        totalUnits += Number(it.quantity) || 1;
      });
    });
    const totalExpenses = expenses.reduce(
      (s, e) => s + (Number(e.amount) || 0),
      0
    );
    return {
      totalRevenue,
      totalOrders,
      totalUnits,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalExpenses,
      margin: totalRevenue - totalExpenses,
    };
  }, [orders, expenses]);

  // ---- By weekday
  const salesByWeekday = useMemo(() => {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const buckets = labels.map((label) => ({
      day: label,
      revenue: 0,
      orders: 0,
    }));
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const idx = getDay(d);
      buckets[idx].revenue +=
        (Number(o.total) || 0) - (Number(o.payment_runas) || 0);
      buckets[idx].orders += 1;
    });
    // Reorder Mon-Sun
    const reordered = [
      buckets[1],
      buckets[2],
      buckets[3],
      buckets[4],
      buckets[5],
      buckets[6],
      buckets[0],
    ];
    return reordered;
  }, [orders]);

  // ---- By hour
  const salesByHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}h`,
      hourNum: h,
      revenue: 0,
      orders: 0,
    }));
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const h = getHours(d);
      buckets[h].revenue +=
        (Number(o.total) || 0) - (Number(o.payment_runas) || 0);
      buckets[h].orders += 1;
    });
    return buckets;
  }, [orders]);

  // ---- Top products
  const topProducts = useMemo<ProductAgg[]>(() => {
    const map = new Map<
      string,
      { name: string; category: string; quantity: number; revenue: number }
    >();
    let total = 0;
    orders.forEach((o) => {
      const items = Array.isArray(o.items)
        ? o.items
        : typeof o.items === 'string'
        ? JSON.parse(o.items)
        : [];
      items.forEach((it: any) => {
        const id = String(
          it.productId || it.product_id || it.id || it.productName || 'unknown'
        );
        const name = it.productName || it.product_name || 'Sin nombre';
        const category =
          it.categoryName || it.category || it.category_name || 'Sin categoría';
        const qty = Number(it.quantity) || 1;
        const base = Number(it.basePrice ?? it.base_price ?? 0);
        const extras = Array.isArray(it.extras)
          ? it.extras.reduce(
              (s: number, e: any) => s + (Number(e?.price) || 0),
              0
            )
          : 0;
        const rev = (base + extras) * qty;
        total += rev;
        const ex = map.get(id);
        if (ex) {
          ex.quantity += qty;
          ex.revenue += rev;
        } else {
          map.set(id, { name, category, quantity: qty, revenue: rev });
        }
      });
    });
    return Array.from(map.entries())
      .map(([id, d]) => ({
        productId: id,
        productName: d.name,
        category: d.category,
        quantity: d.quantity,
        revenue: d.revenue,
        percentOfTotal: total > 0 ? (d.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [orders]);

  // ---- Cashiers ranking
  const cashierRanking = useMemo<CashierAgg[]>(() => {
    const map = new Map<
      string,
      { orders: number; revenue: number; sessions: Set<string> }
    >();
    const userMap = new Map<string, string>();
    cashiers.forEach((c) => userMap.set(c.id, c.name));

    orders.forEach((o) => {
      const uid = o.created_by_user_id || 'sin_asignar';
      const ex = map.get(uid) || {
        orders: 0,
        revenue: 0,
        sessions: new Set<string>(),
      };
      ex.orders += 1;
      ex.revenue +=
        (Number(o.total) || 0) - (Number(o.payment_runas) || 0);
      if (o.cash_session_id) ex.sessions.add(o.cash_session_id);
      map.set(uid, ex);
    });

    return Array.from(map.entries())
      .map(([userId, d]) => ({
        userId,
        name:
          userId === 'sin_asignar'
            ? 'Sin asignar'
            : userMap.get(userId) || 'Usuario',
        shifts: d.sessions.size,
        orders: d.orders,
        revenue: d.revenue,
        avgTicket: d.orders > 0 ? d.revenue / d.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, cashiers]);

  // ---- Payment methods
  const paymentBreakdown = useMemo<PaymentMethodAgg[]>(() => {
    const map = new Map<string, { total: number; count: number }>();
    let total = 0;
    orders.forEach((o) => {
      const m = o.payment_method || 'desconocido';
      const v = (Number(o.total) || 0) - (Number(o.payment_runas) || 0);
      total += v;
      const ex = map.get(m) || { total: 0, count: 0 };
      ex.total += v;
      ex.count += 1;
      map.set(m, ex);
    });
    return Array.from(map.entries())
      .map(([method, d]) => ({
        method,
        total: d.total,
        count: d.count,
        percent: total > 0 ? (d.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [orders]);

  // ---- Expenses by category
  const expensesByCategory = useMemo<ExpenseCategoryAgg[]>(() => {
    const map = new Map<string, { total: number; count: number }>();
    expenses.forEach((e) => {
      const cat = e.category || 'Sin categoría';
      const ex = map.get(cat) || { total: 0, count: 0 };
      ex.total += Number(e.amount) || 0;
      ex.count += 1;
      map.set(cat, ex);
    });
    return Array.from(map.entries())
      .map(([category, d]) => ({ category, total: d.total, count: d.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [expenses]);

  return {
    // filters
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    cashierFilter,
    setCashierFilter,
    cashiers,
    // data
    kpis,
    salesByWeekday,
    salesByHour,
    topProducts,
    cashierRanking,
    paymentBreakdown,
    expensesByCategory,
    // state
    loading,
    error,
    refetch: fetchData,
  };
}
