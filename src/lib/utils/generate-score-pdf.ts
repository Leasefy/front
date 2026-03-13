import jsPDF from 'jspdf';
import type { RiskScore } from '@/lib/types/risk-score';
import { RISK_LEVELS } from '@/lib/types/risk-score';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const LEVEL_COLORS: Record<string, [number, number, number]> = {
  A: [16, 185, 129],  // emerald-500
  B: [59, 130, 246],   // blue-500
  C: [245, 158, 11],   // amber-500
  D: [239, 68, 68],    // red-500
};

/**
 * Generate a PDF score report for a tenant evaluation
 */
export function generateScorePDF(
  tenantName: string,
  score: RiskScore,
  verificationCode: string,
  generatedAt: string,
  expiresAt: string,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const levelColor = LEVEL_COLORS[score.level] || LEVEL_COLORS.A;
  const info = RISK_LEVELS[score.level];

  // ==========================================
  // HEADER
  // ==========================================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Leasefy', margin, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Plataforma de gestión de arriendos', margin, y + 5);
  y += 12;

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ==========================================
  // TITLE
  // ==========================================
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('REPORTE DE EVALUACIÓN DE INQUILINO', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Generado el ${formatDate(generatedAt)}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // ==========================================
  // TENANT INFO
  // ==========================================
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('INQUILINO', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30);
  doc.text(tenantName, margin + 30, y + 5);

  doc.setTextColor(60);
  doc.text('Válido hasta:', margin + contentWidth / 2, y + 5);
  doc.setTextColor(30);
  doc.text(formatDate(expiresAt), margin + contentWidth / 2 + 30, y + 5);

  y += 20;

  // ==========================================
  // SCORE SUMMARY
  // ==========================================
  doc.setFillColor(levelColor[0], levelColor[1], levelColor[2]);
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');

  // Score letter
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(score.level, margin + 20, y + 22, { align: 'center' });

  // Numeric score
  doc.setFontSize(14);
  doc.text(`${score.numericScore} / 100`, margin + 50, y + 15);

  // Label
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(info.label, margin + 50, y + 23);

  y += 38;

  // ==========================================
  // AI EXPLANATION
  // ==========================================
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  const explanationLines = doc.splitTextToSize(score.aiExplanation, contentWidth - 8);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentWidth, explanationLines.length * 4.5 + 6, 2, 2, 'F');
  doc.text(explanationLines, margin + 4, y + 5);
  y += explanationLines.length * 4.5 + 12;

  // ==========================================
  // CATEGORY BREAKDOWN
  // ==========================================
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('DESGLOSE POR CATEGORÍA', margin, y);
  y += 7;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70);
  doc.text('Categoría', margin + 3, y + 5);
  doc.text('Peso', margin + 90, y + 5);
  doc.text('Puntaje', margin + 110, y + 5);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  score.categories.forEach((cat, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 3, contentWidth, 8, 'F');
    }

    doc.setTextColor(30);
    doc.text(cat.label, margin + 3, y);
    doc.setTextColor(80);
    doc.text(`${Math.round(cat.weight * 100)}%`, margin + 90, y);

    // Score with color
    doc.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cat.score}`, margin + 110, y);
    doc.setFont('helvetica', 'normal');

    // Score bar
    const barX = margin + 120;
    const barWidth = contentWidth - 123;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(barX, y - 2.5, barWidth, 3, 1, 1, 'F');
    doc.setFillColor(levelColor[0], levelColor[1], levelColor[2]);
    doc.roundedRect(barX, y - 2.5, (barWidth * cat.score) / 100, 3, 1, 1, 'F');

    y += 8;
  });

  y += 5;

  // ==========================================
  // POSITIVE DRIVERS
  // ==========================================
  if (score.drivers.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text('FACTORES POSITIVOS', margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 163, 74);

    score.drivers.forEach((driver) => {
      doc.text(`✓  ${driver}`, margin + 3, y);
      y += 5;
    });

    y += 5;
  }

  // ==========================================
  // FLAGS
  // ==========================================
  if (score.flags.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text('PUNTOS A CONSIDERAR', margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(217, 119, 6);

    score.flags.forEach((flag) => {
      doc.text(`⚠  ${flag.message}`, margin + 3, y);
      y += 5;
    });

    y += 5;
  }

  // ==========================================
  // VERIFICATION
  // ==========================================
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('VERIFICACIÓN', margin + 4, y + 6);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(verificationCode, margin + 4, y + 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text('Verifica en: leasefy.com/verificar/' + verificationCode, margin + contentWidth / 2, y + 12, { align: 'center' });

  // ==========================================
  // FOOTER
  // ==========================================
  const footerY = pageHeight - 15;
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130);
  doc.text(
    'Este documento fue generado por Leasefy. Verifica su autenticidad en leasefy.com/verificar',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Documento generado el ${formatDate(generatedAt)} — Válido hasta ${formatDate(expiresAt)}`,
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  return doc;
}

/**
 * Download score report as PDF
 */
export function downloadScorePDF(
  tenantName: string,
  score: RiskScore,
  verificationCode: string,
  generatedAt: string,
  expiresAt: string,
): void {
  const doc = generateScorePDF(tenantName, score, verificationCode, generatedAt, expiresAt);
  const safeName = tenantName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  doc.save(`evaluacion-${safeName}.pdf`);
}
