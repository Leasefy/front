/**
 * Excel/CSV generation utilities for reports
 * Uses CSV format that can be opened in Excel
 *
 * Note: For a production app, you would use xlsx or exceljs library
 * for native Excel format. CSV approach keeps bundle size smaller.
 */

import type {
  CarteraReport,
  ComisionesAgenteReport,
  VencimientosReport,
  FlujoCajaReport,
  OcupacionReport,
} from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/format';

// ============================================================================
// Generic CSV Utilities
// ============================================================================

/**
 * Escape CSV cell value to handle commas, quotes, and newlines
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate CSV string from headers and rows
 */
function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const headerRow = headers.map(escapeCSVValue).join(',');
  const dataRows = rows.map((row) =>
    row.map(escapeCSVValue).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file with proper encoding for Excel
 */
function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel to recognize UTF-8 encoding
  const blob = new Blob(['\ufeff' + content], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up URL object
  URL.revokeObjectURL(url);
}

/**
 * Format currency for CSV (without currency symbol for sorting)
 */
function formatCurrencyForCSV(amount: number): string {
  return amount.toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Get current date string for filename
 */
function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// Cartera por Edades (Aging Receivables) Report
// ============================================================================

/**
 * Export Cartera por Edades report to CSV/Excel
 */
export function exportCarteraEdades(data: CarteraReport): void {
  const headers = [
    'Propiedad',
    'Direccion',
    'Inquilino',
    'Telefono',
    'Propietario',
    'Agente',
    'Mes',
    'Monto Total',
    'Pagado',
    'Pendiente',
    'Dias de Mora',
    'Bucket',
  ];

  const rows = data.items.map((item) => [
    item.propertyTitle,
    item.propertyAddress,
    item.tenantName,
    item.tenantPhone,
    item.propietarioName,
    item.agenteName,
    item.month,
    formatCurrencyForCSV(item.totalAmount),
    formatCurrencyForCSV(item.paidAmount),
    formatCurrencyForCSV(item.pendingAmount),
    item.daysLate,
    item.bucket,
  ]);

  // Add summary row
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL',
    '',
    '',
    formatCurrencyForCSV(data.summary.totalPending),
    '',
    '',
  ]);

  // Add bucket summary
  rows.push([]);
  rows.push(['Resumen por Bucket', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['0-30 dias', formatCurrencyForCSV(data.summary.bucket0to30), '', '', '', '', '', '', '', '', '', '']);
  rows.push(['31-60 dias', formatCurrencyForCSV(data.summary.bucket31to60), '', '', '', '', '', '', '', '', '', '']);
  rows.push(['61-90 dias', formatCurrencyForCSV(data.summary.bucket61to90), '', '', '', '', '', '', '', '', '', '']);
  rows.push(['90+ dias', formatCurrencyForCSV(data.summary.bucket90plus), '', '', '', '', '', '', '', '', '', '']);

  const csv = generateCSV(headers, rows);
  downloadCSV(csv, `cartera-edades-${getDateString()}.csv`);
}

// ============================================================================
// Comisiones por Agente Report
// ============================================================================

/**
 * Export Comisiones por Agente report to CSV/Excel
 */
export function exportComisionesAgente(data: ComisionesAgenteReport): void {
  const headers = [
    'Agente',
    'Cierres',
    'Comision Total',
    'Promedio por Cierre',
    'Mejor Propiedad',
    'Tendencia',
  ];

  const trendLabels: Record<string, string> = {
    up: 'Subiendo',
    down: 'Bajando',
    stable: 'Estable',
  };

  const rows = data.agentes.map((item) => [
    item.agenteName,
    item.closedDeals,
    formatCurrencyForCSV(item.totalCommission),
    formatCurrencyForCSV(item.avgCommissionPerDeal),
    item.topPropertyTitle || '-',
    trendLabels[item.trend] || item.trend,
  ]);

  // Add summary rows
  rows.push([]);
  rows.push(['RESUMEN', '', '', '', '', '']);
  rows.push(['Total Comisiones', formatCurrencyForCSV(data.totalCommissions), '', '', '', '']);
  rows.push(['Promedio por Agente', formatCurrencyForCSV(data.avgCommissionPerAgent), '', '', '', '']);
  rows.push(['Total Cierres', data.totalClosedDeals, '', '', '', '']);
  rows.push(['Top Agente', data.topAgentName, '', '', '', '']);

  const csv = generateCSV(headers, rows);
  downloadCSV(csv, `comisiones-agente-${data.period}-${getDateString()}.csv`);
}

// ============================================================================
// Vencimientos Report
// ============================================================================

/**
 * Export Vencimientos (Contract Expirations) report to CSV/Excel
 */
export function exportVencimientos(data: VencimientosReport): void {
  const headers = [
    'Propiedad',
    'Direccion',
    'Inquilino',
    'Telefono',
    'Propietario',
    'Fecha Vencimiento',
    'Dias para Vencer',
    'Estado Renovacion',
    'Bucket',
  ];

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    negotiating: 'Negociando',
    renewed: 'Renovado',
    terminating: 'Terminando',
  };

  const rows = data.items.map((item) => [
    item.propertyTitle,
    item.propertyAddress,
    item.tenantName,
    item.tenantPhone,
    item.propietarioName,
    item.contractEndDate,
    item.daysUntilExpiry,
    statusLabels[item.renewalStatus] || item.renewalStatus,
    item.bucket,
  ]);

  // Add summary rows
  rows.push([]);
  rows.push(['RESUMEN POR URGENCIA', '', '', '', '', '', '', '', '']);
  rows.push(['0-30 dias (Critico)', data.summary.bucket0to30, '', '', '', '', '', '', '']);
  rows.push(['31-60 dias (Urgente)', data.summary.bucket31to60, '', '', '', '', '', '', '']);
  rows.push(['61-90 dias (Atencion)', data.summary.bucket61to90, '', '', '', '', '', '', '']);
  rows.push(['90+ dias (Normal)', data.summary.bucket90plus, '', '', '', '', '', '', '']);
  rows.push(['Total Vencimientos', data.summary.totalVencimientos, '', '', '', '', '', '', '']);

  const csv = generateCSV(headers, rows);
  downloadCSV(csv, `vencimientos-${getDateString()}.csv`);
}

// ============================================================================
// Flujo de Caja Report
// ============================================================================

/**
 * Export Flujo de Caja (Cash Flow) report to CSV/Excel
 */
export function exportFlujoCaja(data: FlujoCajaReport): void {
  const headers = [
    'Mes',
    'Ingresos',
    'Dispersiones',
    'Comisiones',
    'Balance',
  ];

  const rows: (string | number)[][] = data.months.map((month) => [
    new Date(month.month + '-01').toLocaleDateString('es-CL', {
      month: 'long',
      year: 'numeric',
    }),
    formatCurrencyForCSV(month.ingresos),
    formatCurrencyForCSV(month.dispersiones),
    formatCurrencyForCSV(month.comisiones),
    formatCurrencyForCSV(month.balance),
  ]);

  // Add totals row
  rows.push([
    'TOTAL',
    formatCurrencyForCSV(data.totals.totalIngresos),
    formatCurrencyForCSV(data.totals.totalDispersiones),
    formatCurrencyForCSV(data.totals.totalComisiones),
    formatCurrencyForCSV(data.totals.netBalance),
  ]);

  const periodLabels: Record<string, string> = {
    quarter: 'trimestre',
    semester: 'semestre',
    year: 'anual',
  };

  const csv = generateCSV(headers, rows);
  downloadCSV(csv, `flujo-caja-${periodLabels[data.period]}-${getDateString()}.csv`);
}

// ============================================================================
// Ocupacion del Portafolio Report
// ============================================================================

/**
 * Export Ocupacion del Portafolio report to CSV/Excel
 */
export function exportOcupacion(data: OcupacionReport): void {
  const headers = [
    'Zona',
    'Total Propiedades',
    'Arrendadas',
    'En Proceso',
    'Disponibles',
    'Tasa de Ocupacion (%)',
  ];

  const rows: (string | number)[][] = data.zones.map((zone) => [
    zone.zone,
    zone.totalProperties,
    zone.occupied,
    zone.inProcess,
    zone.available,
    zone.occupancyRate,
  ]);

  // Add totals row
  rows.push([
    'TOTAL',
    data.totalProperties,
    data.totalOccupied,
    data.totalInProcess,
    data.totalAvailable,
    data.overallOccupancyRate,
  ]);

  // Add comparison
  rows.push([]);
  rows.push(['COMPARATIVO', '', '', '', '', '']);
  rows.push(['Ocupacion Actual', `${data.overallOccupancyRate}%`, '', '', '', '']);
  if (data.previousMonthOccupancyRate !== undefined) {
    rows.push(['Mes Anterior', `${data.previousMonthOccupancyRate}%`, '', '', '', '']);
    const change = data.overallOccupancyRate - data.previousMonthOccupancyRate;
    rows.push(['Variacion', `${change >= 0 ? '+' : ''}${change}%`, '', '', '', '']);
  }

  const csv = generateCSV(headers, rows);
  downloadCSV(csv, `ocupacion-portafolio-${getDateString()}.csv`);
}

// ============================================================================
// Export Dispatcher
// ============================================================================

export type ExportableReportType =
  | 'cartera-edades'
  | 'comisiones-agente'
  | 'vencimientos'
  | 'flujo-caja'
  | 'ocupacion-portafolio';

/**
 * Export report to CSV/Excel based on report type
 */
export function exportReport(
  reportType: ExportableReportType,
  data: CarteraReport | ComisionesAgenteReport | VencimientosReport | FlujoCajaReport | OcupacionReport
): void {
  switch (reportType) {
    case 'cartera-edades':
      exportCarteraEdades(data as CarteraReport);
      break;
    case 'comisiones-agente':
      exportComisionesAgente(data as ComisionesAgenteReport);
      break;
    case 'vencimientos':
      exportVencimientos(data as VencimientosReport);
      break;
    case 'flujo-caja':
      exportFlujoCaja(data as FlujoCajaReport);
      break;
    case 'ocupacion-portafolio':
      exportOcupacion(data as OcupacionReport);
      break;
  }
}

export default exportReport;
