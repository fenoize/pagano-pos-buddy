import { PurchaseRequest } from '@/types/purchaseRequests';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente de Aprobación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

export function exportPurchaseRequestToPDF(request: PurchaseRequest): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colores oficiales de Paganos
  const primaryColor: [number, number, number] = [167, 17, 17]; // Rojo Paganos #a71111
  const mutedColor: [number, number, number] = [100, 100, 100];
  const successColor: [number, number, number] = [34, 139, 34];
  const errorColor: [number, number, number] = [167, 17, 17];

  // Helper para agregar línea divisoria
  const addDivider = () => {
    yPos += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
  };

  // Helper para agregar sección con título
  const addSectionTitle = (title: string) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin, yPos);
    yPos += 8;
  };

  // === ENCABEZADO ===
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLICITUD DE COMPRA', margin, 18);

  doc.setFontSize(16);
  doc.text(request.pr_number, margin, 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    format(new Date(request.created_at), 'dd MMM yyyy', { locale: es }),
    margin,
    36
  );

  // Status badge en la esquina superior derecha
  const statusLabel = STATUS_LABELS[request.status] || request.status;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const statusWidth = doc.getTextWidth(statusLabel) + 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - statusWidth, 15, statusWidth, 10, 2, 2, 'F');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(statusLabel, pageWidth - margin - statusWidth / 2, 22, { align: 'center' });

  yPos = 55;

  // === INFORMACIÓN GENERAL ===
  addSectionTitle('Información General');

  const infoData = [
    ['Creado por', request.creator?.full_name || request.creator?.username || '-'],
    [
      'Fecha de Creación',
      format(new Date(request.created_at), "dd MMM yyyy, HH:mm", { locale: es }),
    ],
    ['Almacén', request.warehouse?.name || 'Por defecto'],
  ];

  if (request.status === 'approved' && request.approver) {
    infoData.push([
      'Aprobado por',
      request.approver.full_name || request.approver.username || '-',
    ]);
    if (request.approved_at) {
      infoData.push([
        'Fecha de Aprobación',
        format(new Date(request.approved_at), "dd MMM yyyy, HH:mm", { locale: es }),
      ]);
    }
  }

  if (request.status === 'rejected' && request.rejection_reason) {
    infoData.push(['Motivo de Rechazo', request.rejection_reason]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: infoData,
    theme: 'plain',
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.35, fontStyle: 'bold', textColor: [60, 60, 60] },
      1: { cellWidth: contentWidth * 0.65, textColor: [30, 30, 30] },
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;
  addDivider();

  // === ITEMS AGRUPADOS POR PROVEEDOR ===
  const itemsBySupplier =
    request.items?.reduce(
      (acc, item) => {
        const supplierName = item.supplier?.name || 'Sin proveedor';
        if (!acc[supplierName]) {
          acc[supplierName] = [];
        }
        acc[supplierName].push(item);
        return acc;
      },
      {} as Record<string, typeof request.items>
    ) || {};

  Object.entries(itemsBySupplier).forEach(([supplierName, items], index) => {
    // Verificar si necesitamos nueva página
    if (yPos > 240) {
      doc.addPage();
      yPos = margin;
    }

    addSectionTitle(`Proveedor: ${supplierName}`);

    const tableBody = items.map((item) => [
      item.raw_material?.name || '-',
      item.raw_material?.code || '-',
      `${item.qty} ${item.uom?.abbreviation || ''}`,
      formatCurrency(item.estimated_unit_cost),
      formatCurrency(item.estimated_total),
    ]);

    // Agregar fila de subtotal
    const subtotal = items.reduce((acc, i) => acc + i.estimated_total, 0);
    tableBody.push(['', '', '', 'Subtotal:', formatCurrency(subtotal)]);

    autoTable(doc, {
      startY: yPos,
      head: [['Material', 'Código', 'Cantidad', 'Precio Unit.', 'Total']],
      body: tableBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.3 },
        1: { cellWidth: contentWidth * 0.15, textColor: mutedColor },
        2: { cellWidth: contentWidth * 0.15, halign: 'right' },
        3: { cellWidth: contentWidth * 0.18, halign: 'right' },
        4: { cellWidth: contentWidth * 0.22, halign: 'right', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      didParseCell: (data) => {
        // Estilo para fila de subtotal
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [245, 245, 245];
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  });

  // === RESUMEN TOTALES ===
  if (yPos > 230) {
    doc.addPage();
    yPos = margin;
  }

  addDivider();
  addSectionTitle('Resumen de Totales');

  const totalsData = [
    ['Subtotal', formatCurrency(request.subtotal)],
    ['IVA (19%)', formatCurrency(request.tax)],
    ['Total', formatCurrency(request.total)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: totalsData,
    theme: 'plain',
    margin: { left: margin + contentWidth * 0.5, right: margin },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.25, fontStyle: 'bold', textColor: [60, 60, 60] },
      1: { cellWidth: contentWidth * 0.25, halign: 'right', textColor: [30, 30, 30] },
    },
    styles: {
      fontSize: 11,
      cellPadding: 4,
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        // Total row
        data.cell.styles.fontSize = 13;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = primaryColor;
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // === NOTAS ===
  if (request.notes) {
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    addDivider();
    addSectionTitle('Notas');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const splitNotes = doc.splitTextToSize(request.notes, contentWidth);
    doc.text(splitNotes, margin, yPos);
  }

  // === PIE DE PÁGINA ===
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
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
  const fileName = `solicitud_${request.pr_number.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
