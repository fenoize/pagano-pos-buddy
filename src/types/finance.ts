export interface FinancialClosure {
  id: string;
  period_type: 'weekly' | 'monthly' | 'custom';
  date_start: string;
  date_end: string;
  tz: string;
  totals: FinancialKPIs;
  is_locked: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Nuevos campos PRO
  total_cash: number;
  total_pos: number;
  total_transfer: number;
  total_app: number;
  total_expenses: number;
  fixed_expenses: number;
  variable_expenses: number;
  margin_amount: number;
  margin_percent: number;
  total_tax: number;
  total_balance: number;
  filters?: Record<string, any>;
}

export interface FinancialKPIs {
  period: {
    start: string;
    end: string;
    tz: string;
  };
  orders: number;
  sales: {
    gross: number;
    discounts: number;
    net: number;
    delivery_fee: number;
    payment_runas: number;
    aov: number;
  };
  costs: {
    cogs: number;
    gross_margin: number;
    gross_margin_pct: number;
  };
}

export interface DeliveryExportRow {
  fecha_hora: string;
  numero_orden: string;
  direccion: string;
  monto_delivery: string;
  repartidor_id: string;
  repartidor_nombre: string;
}

export type DateRangePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export interface FinanceDailyData {
  day: string;
  gross_sales: number;
  net_sales: number;
  discounts: number;
  orders_count: number;
  cogs: number;
}

export interface FinanceAccount {
  id: string;
  name: string;
  code: string | null;
  type: 'Efectivo' | 'Banco' | 'Digital' | 'Otro';
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FinanceExpense {
  id: string;
  expense_date: string; // ISO date
  account_id: string;
  account?: {
    id: string;
    name: string;
    type: string;
  };
  amount: number;
  currency: string;
  expense_type: 'Fijo' | 'Variable' | 'Inversión' | 'Otro';
  category: string;
  supplier: string | null;
  payment_method: string | null;
  notes: string | null;
  attachment_url: string | null;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClosureFilters {
  fulfillment?: 'retiro' | 'delivery' | null;
  payment_method?: string | null;
  exclude_cancelled?: boolean;
}

export interface ClosureDetailExpense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  supplier: string | null;
  expense_type: string;
}
