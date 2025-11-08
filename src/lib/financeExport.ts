import { FinancialClosure } from '@/types/finance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPeriodLabel(type: string): string {
  const labels: Record<string, string> = {
    weekly: 'Semanal',
    monthly: 'Mensual',
    custom: 'Personalizado'
  };
  return labels[type] || type;
}

export function exportClosureToCSV(closure: FinancialClosure): void {
  const startDate = format(new Date(closure.date_start), 'dd/MM/yyyy', { locale: es });
  const endDate = format(new Date(closure.date_end), 'dd/MM/yyyy', { locale: es });

  // Calcular porcentajes para métodos de pago
  const totalNet = closure.totals.sales.net;
  const cashPercent = totalNet > 0 ? ((closure.total_cash / totalNet) * 100).toFixed(1) : '0';
  const posPercent = totalNet > 0 ? ((closure.total_pos / totalNet) * 100).toFixed(1) : '0';
  const transferPercent = totalNet > 0 ? ((closure.total_transfer / totalNet) * 100).toFixed(1) : '0';
  const appPercent = totalNet > 0 ? ((closure.total_app / totalNet) * 100).toFixed(1) : '0';

  const rows = [
    ['CIERRE FINANCIERO - PAGANOS BURGER'],
    [''],
    ['Período', `${startDate} - ${endDate}`],
    ['Tipo', getPeriodLabel(closure.period_type)],
    ['Fecha de Generación', format(new Date(closure.created_at), 'dd/MM/yyyy HH:mm', { locale: es })],
    [''],
    ['RESUMEN GENERAL'],
    ['Total Órdenes', closure.totals.orders.toString()],
    ['Ventas Brutas', formatCurrency(closure.totals.sales.gross)],
    ['Descuentos', formatCurrency(closure.totals.sales.discounts)],
    ['Ventas Netas', formatCurrency(closure.totals.sales.net)],
    ['Ticket Promedio', formatCurrency(closure.totals.sales.aov)],
    ['Fee de Delivery', formatCurrency(closure.totals.sales.delivery_fee)],
    ['Pago con Runas', formatCurrency(closure.totals.sales.payment_runas)],
    [''],
    ['MÉTODOS DE PAGO'],
    ['Método', 'Monto', 'Porcentaje'],
    ['Efectivo', formatCurrency(closure.total_cash), `${cashPercent}%`],
    ['POS/Transbank', formatCurrency(closure.total_pos), `${posPercent}%`],
    ['Transferencia/MP', formatCurrency(closure.total_transfer), `${transferPercent}%`],
    ['App/Delivery', formatCurrency(closure.total_app), `${appPercent}%`],
    [''],
    ['EGRESOS'],
    ['Gastos Fijos', formatCurrency(closure.fixed_expenses)],
    ['Gastos Variables', formatCurrency(closure.variable_expenses)],
    ['Total Egresos', formatCurrency(closure.total_expenses)],
    [''],
    ['COSTOS Y MARGEN'],
    ['COGS (Costo de Ventas)', formatCurrency(closure.totals.costs.cogs)],
    ['Total Costos', formatCurrency(closure.totals.costs.cogs + closure.total_expenses)],
    ['Margen Bruto', formatCurrency(closure.margin_amount)],
    ['Margen %', `${closure.margin_percent}%`],
    ['Balance Total', formatCurrency(closure.total_balance)],
    [''],
    ['NOTAS'],
    [closure.notes || 'Sin notas adicionales']
  ];

  const csv = rows.map(row => row.join(',')).join('\n');
  
  // Agregar BOM para soporte de caracteres especiales en Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cierre_${closure.period_type}_${closure.date_start}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
