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
