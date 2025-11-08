import { FinancialClosure } from '@/types/finance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export function exportClosureToPDF(closure: FinancialClosure): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Colores del tema
  const primaryColor: [number, number, number] = [59, 130, 246]; // blue-500
  const mutedColor: [number, number, number] = [148, 163, 184]; // slate-400
  const successColor: [number, number, number] = [34, 197, 94]; // green-500
  const errorColor: [number, number, number] = [239, 68, 68]; // red-500

  // Helper para agregar línea divisoria
  const addDivider = () => {
    yPos += 3;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
  };

  // Helper para agregar sección con título
  const addSectionTitle = (title: string) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(title, margin, yPos);
    yPos += 8;
  };

  // === ENCABEZADO ===
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CIERRE FINANCIERO', margin, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const startDate = format(new Date(closure.date_start), 'dd MMM', { locale: es });
  const endDate = format(new Date(closure.date_end), 'dd MMM yyyy', { locale: es });
  doc.text(`${startDate} - ${endDate}`, margin, 30);
  
  doc.setFontSize(10);
  doc.text(getPeriodLabel(closure.period_type), pageWidth - margin, 30, { align: 'right' });

  yPos = 50;

  // === RESUMEN GENERAL ===
  addSectionTitle('Resumen General');
  
  const summaryData = [
    ['Total Órdenes', closure.totals.orders.toString()],
    ['Ventas Brutas', formatCurrency(closure.totals.sales.gross)],
    ['Descuentos', formatCurrency(closure.totals.sales.discounts)],
    ['Ventas Netas', formatCurrency(closure.totals.sales.net)],
    ['Ticket Promedio', formatCurrency(closure.totals.sales.aov)],
    ['Fee Delivery', formatCurrency(closure.totals.sales.delivery_fee)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.5, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: contentWidth * 0.5, halign: 'right', textColor: [15, 23, 42] }
    },
    styles: {
      fontSize: 11,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.row.index === 3) { // Ventas Netas
        data.cell.styles.textColor = primaryColor;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;
  addDivider();

  // === MÉTODOS DE PAGO ===
  addSectionTitle('Métodos de Pago');

  const totalNet = closure.totals.sales.net;
  const calculatePercent = (amount: number): string => {
    if (totalNet === 0) return '0.0%';
    return ((amount / totalNet) * 100).toFixed(1) + '%';
  };

  const paymentData = [
    ['Efectivo', formatCurrency(closure.total_cash), calculatePercent(closure.total_cash)],
    ['POS/Transbank', formatCurrency(closure.total_pos), calculatePercent(closure.total_pos)],
    ['Transferencia/MP', formatCurrency(closure.total_transfer), calculatePercent(closure.total_transfer)],
    ['App/Delivery', formatCurrency(closure.total_app), calculatePercent(closure.total_app)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Método', 'Monto', '%']],
    body: paymentData,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.4, fontStyle: 'bold' },
      1: { cellWidth: contentWidth * 0.35, halign: 'right' },
      2: { cellWidth: contentWidth * 0.25, halign: 'right', textColor: mutedColor }
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;
  addDivider();

  // === EGRESOS ===
  addSectionTitle('Egresos');

  const expensesData = [
    ['Gastos Fijos', formatCurrency(closure.fixed_expenses)],
    ['Gastos Variables', formatCurrency(closure.variable_expenses)],
    ['Total Egresos', formatCurrency(closure.total_expenses)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: expensesData,
    theme: 'plain',
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.5, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: contentWidth * 0.5, halign: 'right', textColor: errorColor }
    },
    styles: {
      fontSize: 11,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.row.index === 2) { // Total
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;
  addDivider();

  // === MARGEN Y RESULTADO ===
  addSectionTitle('Margen y Resultado');

  const marginData = [
    ['Ventas Netas', formatCurrency(closure.totals.sales.net)],
    ['- Egresos', '-' + formatCurrency(closure.total_expenses)],
    ['- COGS', '-' + formatCurrency(closure.totals.costs.cogs)],
    ['', ''],
    ['Margen Bruto', formatCurrency(closure.margin_amount)],
    ['Margen %', closure.margin_percent + '%']
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: marginData,
    theme: 'plain',
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.5, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: contentWidth * 0.5, halign: 'right' }
    },
    styles: {
      fontSize: 11,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.row.index === 1 || data.row.index === 2) {
        data.cell.styles.textColor = errorColor;
      }
      if (data.row.index === 4) { // Margen Bruto
        data.cell.styles.fontSize = 13;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = closure.margin_amount >= 0 ? successColor : errorColor;
      }
      if (data.row.index === 5) { // Margen %
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = closure.margin_percent >= 20 ? successColor : errorColor;
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // === NOTAS ===
  if (closure.notes) {
    if (yPos > 240) {
      doc.addPage();
      yPos = margin;
    }
    addDivider();
    addSectionTitle('Notas');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    const splitNotes = doc.splitTextToSize(closure.notes, contentWidth);
    doc.text(splitNotes, margin, yPos);
    yPos += splitNotes.length * 5;
  }

  // === PIE DE PÁGINA ===
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  // Guardar PDF
  const fileName = `cierre_${closure.period_type}_${closure.date_start}.pdf`;
  doc.save(fileName);
}
