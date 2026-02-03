import jsPDF from 'jspdf';
import type { Contract, ContractTemplate } from '@/lib/types/contract';
import { CONTRACT_TYPE_LABELS } from '@/lib/types/contract';

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Generate and download a PDF for a contract
 */
export function generateContractPdf(contract: Contract, template: ContractTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 25;
    }
  };

  // --- Header ---
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text('CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Ley 820 de 2003', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(60, 60, 180);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Title ---
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.text(CONTRACT_TYPE_LABELS[contract.type].toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`ID: ${contract.id}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // --- Parties ---
  const sectionTitle = (title: string) => {
    checkPage(15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20);
    doc.text(title, margin, y);
    y += 1.5;
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const field = (label: string, value: string, xOffset = 0) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(label, margin + xOffset, y);
    y += 4;
    doc.setFontSize(9.5);
    doc.setTextColor(30);
    doc.text(value, margin + xOffset, y);
    y += 6;
  };

  sectionTitle('PARTES DEL CONTRATO');

  // Arrendador
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);
  doc.text('ARRENDADOR', margin, y);
  doc.text('ARRENDATARIO', margin + contentWidth / 2, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30);
  doc.text(contract.landlordName, margin, y);
  doc.text(contract.tenantName, margin + contentWidth / 2, y);
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(`C.C. ${contract.landlordDocument}`, margin, y);
  doc.text(`C.C. ${contract.tenantDocument}`, margin + contentWidth / 2, y);
  y += 4;
  doc.text(contract.landlordEmail, margin, y);
  doc.text(contract.tenantEmail, margin + contentWidth / 2, y);
  y += 4;
  if (contract.tenantPhone) {
    doc.text('', margin, y);
    doc.text(contract.tenantPhone, margin + contentWidth / 2, y);
    y += 4;
  }
  y += 6;

  // --- Property & Terms ---
  sectionTitle('INMUEBLE Y CONDICIONES');

  field('Dirección del inmueble', `${contract.propertyAddress}, ${contract.propertyCity}`);

  // Two columns for terms
  const col1 = margin;
  const col2 = margin + contentWidth / 2;
  const savedY = y;

  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');
  doc.text('Canon mensual', col1, y);
  doc.text('Administración', col2, y);
  y += 4;
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCOP(contract.monthlyRent), col1, y);
  doc.text(contract.adminFee > 0 ? formatCOP(contract.adminFee) : 'Incluida', col2, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text('Día de pago', col1, y);
  doc.text('Garantía', col2, y);
  y += 4;
  doc.setFontSize(9.5);
  doc.setTextColor(30);
  doc.text(`Día ${contract.paymentDueDay} de cada mes`, col1, y);
  doc.text(contract.guaranteeType === 'poliza' ? 'Póliza de arrendamiento' : 'Codeudor', col2, y);
  y += 5;
  if (contract.guaranteeDetails) {
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text(contract.guaranteeDetails, col2, y);
    y += 5;
  }
  y += 3;

  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');
  doc.text('Vigencia', col1, y);
  y += 4;
  doc.setFontSize(9.5);
  doc.setTextColor(30);
  doc.text(`${fmtDate(contract.startDate)} — ${fmtDate(contract.endDate)}`, col1, y);
  y += 10;

  // --- Clauses ---
  sectionTitle('CLÁUSULAS');

  template.clauses.forEach((clause) => {
    checkPage(25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);

    const titleLines = doc.splitTextToSize(clause.title, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 4.5 + 2;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(clause.content, contentWidth);

    // Check if all lines fit, if not paginate
    for (let i = 0; i < lines.length; i++) {
      checkPage(5);
      doc.text(lines[i], margin, y);
      y += 4;
    }
    y += 4;
  });

  // --- Special Conditions ---
  if (contract.specialConditions) {
    sectionTitle('CONDICIONES ESPECIALES');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(contract.specialConditions, contentWidth);
    lines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, margin, y);
      y += 4;
    });
    y += 6;
  }

  // --- Signatures ---
  checkPage(45);
  sectionTitle('FIRMAS');

  const sigBox = (label: string, sig: Contract['landlordSignature'], x: number) => {
    const boxW = contentWidth / 2 - 5;
    doc.setDrawColor(sig ? 16 : 180, sig ? 185 : 180, sig ? 129 : 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, 30, 1, 1);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text(label.toUpperCase(), x + 4, y + 5);

    if (sig) {
      doc.setFontSize(9);
      doc.setTextColor(22, 163, 74); // emerald-600
      doc.setFont('helvetica', 'bold');
      doc.text(sig.signedBy, x + 4, y + 13);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Firmado: ${fmtDate(sig.signedAt)}`, x + 4, y + 18);
      doc.setTextColor(130);
      doc.text(`IP: ${sig.ipAddress}`, x + 4, y + 23);
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('Pendiente de firma', x + 4, y + 15);
    }
  };

  sigBox('Firma Arrendador', contract.landlordSignature, margin);
  sigBox('Firma Arrendatario', contract.tenantSignature, margin + contentWidth / 2 + 5);
  y += 35;

  // --- Legal footer ---
  checkPage(15);
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130);
  const footer1 = 'Este contrato se rige por la Ley 820 de 2003 y demás normas concordantes.';
  const footer2 = 'Las firmas electrónicas tienen validez legal según la Ley 527 de 1999 y el Decreto 2364 de 2012.';
  doc.text(footer1, pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text(footer2, pageWidth / 2, y, { align: 'center' });

  // --- Download ---
  const filename = `contrato-${contract.id}.pdf`;
  doc.save(filename);
}
