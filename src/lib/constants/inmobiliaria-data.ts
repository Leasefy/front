/**
 * Static constants for the Inmobiliaria module
 * Extracted from mock data — these are reference data, not API-fetched
 */

import type { ReportDefinition } from '@/lib/types/inmobiliaria';

// ============================================================================
// IPC Historical Data (DANE Colombia)
// ============================================================================
//
// Variación anual del IPC al cierre de cada mes, según el DANE. La primera
// fila es la vigente: `getCurrentIPC()` la devuelve y es la que rige los
// aumentos de canon del año siguiente (Ley 820 de 2003, art. 20: el aumento
// no puede superar el 100 % del IPC del año calendario anterior).
//
// 🔴 Es una tabla a mano, no un dato del back: cada enero hay que agregar el
// diciembre nuevo arriba. Diciembre 2025 (5,10 %) y diciembre 2024 (5,20 %)
// están cotejados con el comunicado del DANE del 8-ene-2026
// (dane.gov.co/files/operaciones/IPC/dic2025/cp-IPC-dic2025.pdf). Los meses
// enero–noviembre 2025 se cargaron el 2026-09-03 de memoria: VERIFICAR contra
// el boletín del DANE antes de producción (sólo afectan al gráfico de tendencia;
// el cálculo del canon usa diciembre).

export interface IPCRecord {
  year: number;
  month: number; // 1-12
  rate: number; // Annual IPC rate as of that month
  description: string;
}

export const IPC_HISTORICAL: IPCRecord[] = [
  { year: 2025, month: 12, rate: 5.10, description: 'Diciembre 2025' },
  { year: 2025, month: 11, rate: 5.30, description: 'Noviembre 2025' },
  { year: 2025, month: 10, rate: 5.51, description: 'Octubre 2025' },
  { year: 2025, month: 9, rate: 5.18, description: 'Septiembre 2025' },
  { year: 2025, month: 8, rate: 5.10, description: 'Agosto 2025' },
  { year: 2025, month: 7, rate: 4.90, description: 'Julio 2025' },
  { year: 2025, month: 6, rate: 4.82, description: 'Junio 2025' },
  { year: 2025, month: 5, rate: 5.05, description: 'Mayo 2025' },
  { year: 2025, month: 4, rate: 5.16, description: 'Abril 2025' },
  { year: 2025, month: 3, rate: 5.09, description: 'Marzo 2025' },
  { year: 2025, month: 2, rate: 5.28, description: 'Febrero 2025' },
  { year: 2025, month: 1, rate: 5.22, description: 'Enero 2025' },
  { year: 2024, month: 12, rate: 5.20, description: 'Diciembre 2024' },
  { year: 2024, month: 11, rate: 5.41, description: 'Noviembre 2024' },
  { year: 2024, month: 10, rate: 5.60, description: 'Octubre 2024' },
  { year: 2024, month: 9, rate: 5.80, description: 'Septiembre 2024' },
  { year: 2024, month: 8, rate: 6.12, description: 'Agosto 2024' },
  { year: 2024, month: 7, rate: 6.86, description: 'Julio 2024' },
  { year: 2024, month: 6, rate: 7.18, description: 'Junio 2024' },
  { year: 2024, month: 5, rate: 7.26, description: 'Mayo 2024' },
  { year: 2024, month: 4, rate: 7.16, description: 'Abril 2024' },
  { year: 2024, month: 3, rate: 7.36, description: 'Marzo 2024' },
  { year: 2024, month: 2, rate: 7.74, description: 'Febrero 2024' },
  { year: 2024, month: 1, rate: 8.35, description: 'Enero 2024' },
  { year: 2023, month: 12, rate: 9.28, description: 'Diciembre 2023' },
  { year: 2023, month: 11, rate: 10.15, description: 'Noviembre 2023' },
  { year: 2023, month: 10, rate: 10.48, description: 'Octubre 2023' },
  { year: 2023, month: 9, rate: 10.99, description: 'Septiembre 2023' },
  { year: 2023, month: 8, rate: 11.43, description: 'Agosto 2023' },
  { year: 2023, month: 7, rate: 11.78, description: 'Julio 2023' },
  { year: 2023, month: 6, rate: 12.13, description: 'Junio 2023' },
  { year: 2023, month: 5, rate: 12.36, description: 'Mayo 2023' },
  { year: 2023, month: 4, rate: 12.82, description: 'Abril 2023' },
  { year: 2023, month: 3, rate: 13.12, description: 'Marzo 2023' },
  { year: 2023, month: 2, rate: 13.28, description: 'Febrero 2023' },
  { year: 2023, month: 1, rate: 13.25, description: 'Enero 2023' },
];

export function getCurrentIPC(): IPCRecord {
  return IPC_HISTORICAL[0];
}

export function getIPCForDate(year: number, month: number): IPCRecord | undefined {
  return IPC_HISTORICAL.find((r) => r.year === year && r.month === month);
}

export function calculateNewRent(currentRent: number, ipcRate: number): number {
  return Math.round(currentRent * (1 + ipcRate / 100));
}

/** «5,10 %» en español, «5.10 %» en inglés. Un solo formato para el KPI y la calculadora. */
export function formatearTasaIPC(rate: number, locale: string): string {
  return (
    new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate) + ' %'
  );
}

/** «Diciembre 2025» / «December 2025» (o «Dic» / «Dec» en corto), derivado de year/month: no del texto en español de la tabla. */
export function etiquetaDelMesIPC(record: Pick<IPCRecord, 'year' | 'month'>, locale: string, corto = false): string {
  const fecha = new Date(Date.UTC(record.year, record.month - 1, 1));
  const mes = new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    month: corto ? 'short' : 'long',
    timeZone: 'UTC',
  }).format(fecha);
  const capitalizado = mes.charAt(0).toUpperCase() + mes.slice(1).replace(/\.$/, '');
  return corto ? capitalizado : `${capitalizado} ${record.year}`;
}

// ============================================================================
// Report Definitions (Centro de Reportes)
// ============================================================================

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'extractos-propietarios',
    title: 'Extractos Propietarios',
    description: 'Extracto mensual detallado por propietario con cobros y comisiones',
    icon: 'FileText',
    category: 'financiero',
    format: 'pdf',
    frequency: 'monthly',
    isFavorite: true,
  },
  {
    id: 'cartera-edades',
    title: 'Cartera por Edades',
    description: 'Analisis de mora segmentado por antiguedad (30/60/90+ dias)',
    icon: 'Clock',
    category: 'financiero',
    format: 'excel',
    frequency: 'weekly',
    isFavorite: true,
  },
  {
    id: 'comisiones-agente',
    title: 'Comisiones por Agente',
    description: 'Desglose de comisiones generadas por cada agente',
    icon: 'Users',
    category: 'agentes',
    format: 'excel',
    frequency: 'monthly',
    premium: true,
  },
  {
    id: 'ocupacion-portafolio',
    title: 'Ocupacion del Portafolio',
    description: 'Porcentaje de ocupacion por zona y tipo de propiedad',
    icon: 'ChartPie',
    category: 'operativo',
    // Decía `pdf`, y por esa sola etiqueta la descarga caía en la rama «PDF en
    // desarrollo» — cuando el back SÍ lo produce en CSV (ver el switch de
    // `exportCsv` en reports.service.ts). Un reporte que funcionaba, tapado
    // por una etiqueta de formato.
    format: 'excel',
    frequency: 'monthly',
  },
  {
    id: 'vencimientos',
    title: 'Vencimientos de Contratos',
    description: 'Contratos proximos a vencer en los proximos 90 dias',
    icon: 'Calendar',
    category: 'operativo',
    format: 'excel',
    frequency: 'weekly',
    isFavorite: true,
  },
  {
    id: 'rendimiento-agentes',
    title: 'Rendimiento de Agentes',
    description: 'KPIs comparativos de desempeno del equipo comercial',
    icon: 'ChartBar',
    category: 'agentes',
    format: 'pdf',
    frequency: 'monthly',
    premium: true,
  },
  {
    id: 'flujo-caja',
    title: 'Flujo de Caja',
    description: 'Ingresos vs dispersiones con proyeccion mensual',
    icon: 'CurrencyDollar',
    category: 'financiero',
    format: 'excel',
    frequency: 'monthly',
    premium: true,
  },
  {
    // Tiene pantalla propia (`/reportes/rentabilidad`): «Ver» navega allá y
    // «Descargar CSV» baja el mismo rango que muestra el back.
    id: 'rentabilidad-inmueble',
    title: 'Rentabilidad por inmueble',
    description: 'Esperado vs recaudado, comisión, gastos, neto al propietario y ocupación por inmueble',
    icon: 'ChartLineUp',
    category: 'financiero',
    format: 'excel',
    frequency: 'monthly',
  },
];
