import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HRPayrollRun, HRPayrollItem } from '@/types/hr';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Types for shifts summary export
interface ShiftSummaryItem {
  employee_id: string;
  employee_name: string;
  employee_rut: string | null;
  total_shifts: number;
  pending_shifts: number;
  approved_shifts: number;
  estimated_pay: number;
}

interface ShiftSummaryTotals {
  total_shifts: number;
  total_employees: number;
  total_pending: number;
  total_approved: number;
  total_estimated_pay: number;
}

interface DateRange {
  from: string;
  to: string;
}

const formatCLP = (amount: number) => {
  return new Intl.NumberFormat('es-CL', { 
    style: 'currency', 
    currency: 'CLP', 
    maximumFractionDigits: 0 
  }).format(amount);
};

// =============================================
// PAYROLL EXPORTS
// =============================================

export function exportPayrollCSV(payroll: HRPayrollRun, items: HRPayrollItem[]) {
  const headers = ['Empleado', 'RUT', 'Turnos', 'Base', 'Bonos', 'Adelantos', 'Descuentos', 'Neto'];
  const rows = items.map(item => [
    item.employee?.full_name || '',
    item.employee?.rut || '',
    item.shifts_count,
    item.base_amount,
    item.bonuses,
    item.advances,
    item.discounts,
    item.net_pay,
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `liquidacion-${payroll.period_start}-${payroll.period_end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPayrollPDF(payroll: HRPayrollRun, items: HRPayrollItem[]) {
  const doc = new jsPDF();
  
  const periodStart = format(parseISO(payroll.period_start), 'dd/MM/yyyy', { locale: es });
  const periodEnd = format(parseISO(payroll.period_end), 'dd/MM/yyyy', { locale: es });
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Liquidación de Pagos', 14, 22);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${periodStart} - ${periodEnd}`, 14, 32);
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 38);
  
  // Summary
  const totals = payroll.totals || { employees_count: 0, shifts_count: 0, net_total: 0 };
  doc.setFontSize(10);
  doc.text(`Empleados: ${totals.employees_count}`, 14, 48);
  doc.text(`Turnos: ${totals.shifts_count}`, 60, 48);
  doc.text(`Total Neto: ${formatCLP(totals.net_total)}`, 100, 48);
  
  // Table
  const tableData = items.map(item => [
    item.employee?.full_name || '-',
    item.employee?.rut || '-',
    String(item.shifts_count),
    formatCLP(item.base_amount),
    formatCLP(item.bonuses),
    formatCLP(item.advances),
    formatCLP(item.discounts),
    formatCLP(item.net_pay),
  ]);
  
  autoTable(doc, {
    startY: 55,
    head: [['Empleado', 'RUT', 'Turnos', 'Base', 'Bonos', 'Adelantos', 'Descuentos', 'Neto']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 51, 51],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    foot: [[
      'TOTAL', '', String(totals.shifts_count), '', '', '', '', formatCLP(totals.net_total)
    ]],
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`liquidacion-${payroll.period_start}-${payroll.period_end}.pdf`);
}

// =============================================
// SHIFTS SUMMARY EXPORTS
// =============================================

export function exportShiftsSummaryCSV(items: ShiftSummaryItem[], totals: ShiftSummaryTotals, dateRange: DateRange) {
  const headers = ['Empleado', 'RUT', 'Turnos Totales', 'Pendientes', 'Aprobados', 'Monto Estimado'];
  const rows = items.map(item => [
    item.employee_name,
    item.employee_rut || '',
    item.total_shifts,
    item.pending_shifts,
    item.approved_shifts,
    item.estimated_pay,
  ]);
  
  // Add totals row
  rows.push([
    'TOTAL',
    '',
    totals.total_shifts,
    totals.total_pending,
    totals.total_approved,
    totals.total_estimated_pay,
  ]);
  
  const csv = [
    `Resumen de Turnos - Período: ${dateRange.from} a ${dateRange.to}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resumen-turnos-${dateRange.from.replace(/\//g, '-')}-${dateRange.to.replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportShiftsSummaryPDF(items: ShiftSummaryItem[], totals: ShiftSummaryTotals, dateRange: DateRange) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de Turnos y Pagos', 14, 22);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${dateRange.from} - ${dateRange.to}`, 14, 32);
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 38);
  
  // Summary KPIs
  doc.setFontSize(10);
  doc.text(`Total Empleados: ${totals.total_employees}`, 14, 48);
  doc.text(`Total Turnos: ${totals.total_shifts}`, 70, 48);
  doc.text(`Total Estimado: ${formatCLP(totals.total_estimated_pay)}`, 120, 48);
  
  // Table
  const tableData = items.map(item => [
    item.employee_name,
    item.employee_rut || '-',
    String(item.total_shifts),
    String(item.pending_shifts),
    String(item.approved_shifts),
    formatCLP(item.estimated_pay),
  ]);
  
  autoTable(doc, {
    startY: 55,
    head: [['Empleado', 'RUT', 'Turnos', 'Pend.', 'Aprob.', 'Monto Est.']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 51, 51],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    foot: [[
      'TOTAL',
      `${totals.total_employees} empleados`,
      String(totals.total_shifts),
      String(totals.total_pending),
      String(totals.total_approved),
      formatCLP(totals.total_estimated_pay)
    ]],
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
  });
  
  // Note
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    '* El monto estimado se calcula en base a las reglas de pago activas. Los ajustes se aplican en las liquidaciones.',
    14,
    finalY + 10
  );
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`resumen-turnos-${dateRange.from.replace(/\//g, '-')}-${dateRange.to.replace(/\//g, '-')}.pdf`);
}
