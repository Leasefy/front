import jsPDF from 'jspdf';
import type { ExtractoPropietario, CobroStatus, InmobiliariaConfig, Propietario } from '@/lib/types/inmobiliaria';

/**
 * Format currency in Chilean Peso format
 */
function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Chilean Spanish
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format month/year in Chilean Spanish
 */
function formatMonth(monthStr: string): string {
  return new Date(monthStr + '-01').toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get status label in Spanish
 */
function getStatusLabel(status: CobroStatus): string {
  const labels: Record<CobroStatus, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    partial: 'Parcial',
    late: 'En mora',
    defaulted: 'Incobrable',
  };
  return labels[status] || status;
}

/**
 * Generate PDF for propietario extracto (owner statement)
 */
export function generateExtractoPropietarioPDF(
  extracto: ExtractoPropietario,
  config: Pick<InmobiliariaConfig, 'name' | 'nit' | 'address' | 'city' | 'phone' | 'email'>,
  propietario?: Propietario | null,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Helper to check if we need a new page
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  // ==========================================
  // HEADER - Inmobiliaria Info
  // ==========================================

  // Company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // indigo-700
  doc.text(config.name, margin, y);
  y += 5;

  // Company details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`NIT: ${config.nit}`, margin, y);
  y += 3.5;
  doc.text(`${config.address}, ${config.city}`, margin, y);
  y += 3.5;
  doc.text(`${config.phone} | ${config.email}`, margin, y);
  y += 8;

  // Divider line
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ==========================================
  // TITLE - Extracto del Propietario
  // ==========================================

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('EXTRACTO DEL PROPIETARIO', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Periodo: ${formatMonth(extracto.month).toUpperCase()}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // ==========================================
  // PROPIETARIO INFO
  // ==========================================

  // Section header
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('DATOS DEL PROPIETARIO', margin + 4, y + 5);

  // Two columns
  const col1 = margin + 4;
  const col2 = margin + contentWidth / 2 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  y += 10;

  // Left column - Personal info
  doc.setTextColor(100);
  doc.text('Nombre:', col1, y);
  doc.setTextColor(30);
  doc.text(extracto.propietarioName, col1 + 20, y);

  // Right column - Bank info
  doc.setTextColor(100);
  doc.text('Banco:', col2, y);
  doc.setTextColor(30);
  if (propietario) {
    doc.text(propietario.bankAccount.bank.charAt(0).toUpperCase() + propietario.bankAccount.bank.slice(1), col2 + 15, y);
  }
  y += 4.5;

  if (propietario) {
    // Left column
    doc.setTextColor(100);
    doc.text('Documento:', col1, y);
    doc.setTextColor(30);
    doc.text(`${propietario.documentType} ${propietario.documentNumber}`, col1 + 25, y);

    // Right column
    doc.setTextColor(100);
    doc.text('Cuenta:', col2, y);
    doc.setTextColor(30);
    const accountType = propietario.bankAccount.accountType === 'savings' ? 'Ahorros' : 'Corriente';
    doc.text(`${accountType} ${propietario.bankAccount.accountNumber}`, col2 + 15, y);
    y += 4.5;

    // Left column
    doc.setTextColor(100);
    doc.text('Email:', col1, y);
    doc.setTextColor(30);
    doc.text(propietario.email, col1 + 15, y);

    // Right column
    doc.setTextColor(100);
    doc.text('Titular:', col2, y);
    doc.setTextColor(30);
    doc.text(propietario.bankAccount.accountHolder.substring(0, 30), col2 + 15, y);
  }

  y += 15;

  // ==========================================
  // PROPERTIES TABLE
  // ==========================================

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('DETALLE POR PROPIEDAD', margin, y);
  y += 6;

  // Table header
  const tableHeaderY = y;
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentWidth, 8, 'F');
  y += 5.5;

  // Column positions
  const colWidths = {
    property: 50,
    tenant: 35,
    collected: 25,
    status: 18,
    commission: 20,
    net: 25,
  };

  let xPos = margin + 2;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70);

  doc.text('Propiedad', xPos, y);
  xPos += colWidths.property;
  doc.text('Inquilino', xPos, y);
  xPos += colWidths.tenant;
  doc.text('Recaudado', xPos, y, { align: 'left' });
  xPos += colWidths.collected;
  doc.text('Estado', xPos, y);
  xPos += colWidths.status;
  doc.text('Comision', xPos, y);
  xPos += colWidths.commission;
  doc.text('Neto', xPos, y);

  y += 6;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  extracto.properties.forEach((prop, index) => {
    checkPage(10);

    // Alternate row background
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 3, contentWidth, 9, 'F');
    }

    xPos = margin + 2;

    // Property title (truncate if needed)
    doc.setTextColor(30);
    const truncatedTitle = prop.propertyTitle.length > 25
      ? prop.propertyTitle.substring(0, 25) + '...'
      : prop.propertyTitle;
    doc.text(truncatedTitle, xPos, y);
    xPos += colWidths.property;

    // Tenant name (truncate if needed)
    doc.setTextColor(80);
    const truncatedTenant = prop.tenantName.length > 18
      ? prop.tenantName.substring(0, 18) + '...'
      : prop.tenantName;
    doc.text(truncatedTenant, xPos, y);
    xPos += colWidths.tenant;

    // Collected
    doc.setTextColor(30);
    doc.text(formatCLP(prop.totalCollected), xPos, y, { align: 'left' });
    xPos += colWidths.collected;

    // Status
    const status = getStatusLabel(prop.paymentStatus);
    if (prop.paymentStatus === 'paid') {
      doc.setTextColor(22, 163, 74); // emerald-600
    } else if (prop.paymentStatus === 'late' || prop.paymentStatus === 'defaulted') {
      doc.setTextColor(220, 38, 38); // red-600
    } else {
      doc.setTextColor(217, 119, 6); // amber-600
    }
    doc.text(status, xPos, y);
    xPos += colWidths.status;

    // Commission
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`${prop.commissionPercent}% = ${formatCLP(prop.commissionAmount)}`, xPos, y);
    xPos += colWidths.commission;

    // Net
    doc.setTextColor(22, 163, 74); // emerald-600
    doc.setFont('helvetica', 'bold');
    doc.text(formatCLP(prop.netAmount), xPos, y);
    doc.setFont('helvetica', 'normal');

    y += 9;
  });

  // Table footer - Totals
  y += 2;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  xPos = margin + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30);
  doc.text(`Total (${extracto.summary.totalProperties} propiedades)`, xPos, y);

  xPos = margin + colWidths.property + colWidths.tenant + 2;
  doc.text(formatCLP(extracto.summary.totalCollected), xPos, y, { align: 'left' });

  xPos += colWidths.collected + colWidths.status;
  doc.setTextColor(79, 70, 229);
  doc.text(formatCLP(extracto.summary.totalCommissions), xPos, y);

  xPos += colWidths.commission;
  doc.setTextColor(22, 163, 74);
  doc.text(formatCLP(extracto.summary.netToPropietario), xPos, y);

  y += 15;

  // ==========================================
  // SUMMARY SECTION
  // ==========================================

  checkPage(50);

  // Net amount box
  doc.setFillColor(220, 252, 231); // emerald-100
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'F');
  doc.setDrawColor(34, 197, 94); // emerald-500
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text('NETO A RECIBIR', margin + 4, y + 8);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCLP(extracto.summary.netToPropietario), margin + 4, y + 18);

  // Payment reference on the right
  if (extracto.summary.paymentReference) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(21, 128, 61);
    doc.text('Referencia de pago:', pageWidth - margin - 45, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(extracto.summary.paymentReference, pageWidth - margin - 45, y + 16);
  }

  y += 35;

  // Payment calculation breakdown
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);

  doc.text('Total recaudado:', margin + 4, y);
  doc.text(formatCLP(extracto.summary.totalCollected), margin + contentWidth / 2 - 10, y, { align: 'right' });
  y += 5;

  doc.text('Comisiones agencia:', margin + 4, y);
  doc.setTextColor(79, 70, 229);
  doc.text(`-${formatCLP(extracto.summary.totalCommissions)}`, margin + contentWidth / 2 - 10, y, { align: 'right' });
  y += 5;

  doc.setDrawColor(200);
  doc.line(margin + 4, y, margin + contentWidth / 2 - 10, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Neto a propietario:', margin + 4, y);
  doc.setTextColor(22, 163, 74);
  doc.text(formatCLP(extracto.summary.netToPropietario), margin + contentWidth / 2 - 10, y, { align: 'right' });

  if (extracto.summary.paymentDate) {
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`Fecha de pago: ${formatDate(extracto.summary.paymentDate)}`, margin + 4, y);
  }

  // ==========================================
  // FOOTER
  // ==========================================

  // Draw footer at the bottom of the page
  const footerY = pageHeight - 15;
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130);
  doc.text(
    `${config.name} - NIT ${config.nit}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Documento generado el ${formatDate(extracto.generatedAt)}`,
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  return doc;
}

/**
 * Download extracto as PDF file
 */
export function downloadExtractoPDF(
  extracto: ExtractoPropietario,
  config: Pick<InmobiliariaConfig, 'name' | 'nit' | 'address' | 'city' | 'phone' | 'email'>,
  propietario?: Propietario | null,
): void {
  const doc = generateExtractoPropietarioPDF(extracto, config, propietario);
  const safeFileName = extracto.propietarioName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  doc.save(`extracto-${safeFileName}-${extracto.month}.pdf`);
}

export default generateExtractoPropietarioPDF;
