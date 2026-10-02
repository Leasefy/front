'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  ChartLineUp,
  CurrencyDollar,
  FileCsv,
  DownloadSimple,
  CalendarBlank,
  ArrowRight,
  CurrencyCircleDollar,
  Percent,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Button } from '@/components/ui/button';
import type { CarteraReport, ReportDefinition, ReportCategory } from '@/lib/types/inmobiliaria';
import {
  getReportCategoryColor,
  formatCurrency,
} from '@/lib/types/inmobiliaria';
import { comoSeBaja, formatoDelArchivo, parametrosDelPeriodo } from '@/lib/reportes/exportables';
import type { ReportId } from '@/lib/types/inmobiliaria';
import type { ReporteFiltersState } from './ReporteFilters';
import {
  useComisionesReport,
  useOcupacionReport,
  useVencimientosReport,
  useFlujoCajaReport,
  useCarteraReport,
  useRendimientoAgentesReport,
  useRentabilidadReport,
} from '@/lib/hooks/useInmobiliaria';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { OccupancyReport } from '@/components/inmobiliaria/reports/OccupancyReport';
import { CollectionsReport } from '@/components/inmobiliaria/reports/CollectionsReport';
import { AgentPerformanceReport } from '@/components/inmobiliaria/reports/AgentPerformanceReport';
import { ExecutiveSummary } from '@/components/inmobiliaria/reports/ExecutiveSummary';
import { GraficoDeRentabilidad } from '@/components/inmobiliaria/reports/GraficoDeRentabilidad';
import {
  adaptOccupancy,
  adaptCollections,
  adaptAgentPerformance,
  adaptExecutive,
} from '@/lib/utils/report-adapters';

interface ReporteViewerProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportDefinition | null;
  filters: ReporteFiltersState;
  /**
   * Baja el reporte. Devuelve la promesa del pedido: el botón se queda
   * deshabilitado hasta que el archivo llegó (o falló), no 1,5 segundos.
   */
  onExport?: (format: 'pdf' | 'excel') => void | Promise<void>;
}

// Map icon names to Phosphor components
const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  ChartLineUp,
  CurrencyDollar,
};

// Category colors for icon backgrounds
const CATEGORY_BG_COLORS: Record<ReportCategory, string> = {
  financiero: 'bg-success-soft',
  operativo: 'bg-primary-soft',
  agentes: 'bg-surface-muted dark:bg-ink',
};

const CATEGORY_ICON_COLORS: Record<ReportCategory, string> = {
  financiero: 'text-success',
  operativo: 'text-primary',
  agentes: 'text-fg-muted dark:text-fg-subtle',
};

type Traductor = (key: string, params?: Record<string, string | number>) => string;

/** El mes en curso, `YYYY-MM`: el que usan comisiones y rendimiento. */
const mesEnCurso = () => new Date().toISOString().slice(0, 7);

/**
 * La respuesta llegó y no trae nada que dibujar (agencia recién creada, mes
 * sin movimiento). Dice qué pasó, no sólo «no hay datos».
 */
function SinDatosDelReporte() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <ChartBar className="h-5 w-5 text-fg-muted" weight="duotone" />
      </div>
      <div className="space-y-1">
        <p className="text-body font-semibold text-fg">Todavía no hay nada que mostrar</p>
        <p className="mx-auto max-w-sm text-body-sm text-fg-muted">
          Este reporte se arma con la actividad del portafolio. Cuando haya inmuebles con contrato y
          cobros del período, aparece acá.
        </p>
      </div>
    </div>
  );
}

/**
 * 🔴 Lo que se pinta mientras el reporte no está (Nico, 01-10: «alguno no
 * muestra la vista previa»). Cada vista hacía `if (!data) return null`: mientras
 * cargaba, si fallaba o si venía vacío, el cajón quedaba con una caja en
 * blanco. Ahora carga, falla con «Reintentar» o dice que no hay datos.
 */
function EsperandoElReporte({
  cargando,
  error,
  queEs,
  onReintentar,
}: {
  cargando?: boolean;
  error?: unknown;
  queEs: string;
  onReintentar?: () => unknown;
}) {
  return (
    <EstadoDeDatos
      cargando={Boolean(cargando)}
      error={error}
      vacio
      queEs={queEs}
      onReintentar={onReintentar ? () => void onReintentar() : undefined}
      cuandoVacio={<SinDatosDelReporte />}
    >
      {null}
    </EstadoDeDatos>
  );
}

/** Un bloque del cajón con su título: la vista se lee por partes, no como una pila. */
function SeccionDelReporte({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="font-mono text-label uppercase tracking-wider text-fg-subtle">{titulo}</h4>
      {children}
    </section>
  );
}

/**
 * Comisiones Agente Preview
 *
 * 🔴 17-09: la comisión es de la INMOBILIARIA, no de cada asesor —la de los
 * asesores se liquida por fuera de Leasefy—. Antes esta vista repartía pesos
 * por persona y los ordenaba por «quién comisionó más». Ahora: un total de la
 * casa y, por asesor, los arriendos que cerró. Sin plata y sin tendencias
 * inventadas.
 */
function ComisionesAgentePreview({ t }: { t: Traductor }) {
  const { report: data, isLoading, errorCrudo, refetch } = useComisionesReport(mesEnCurso());
  if (!data) {
    return <EsperandoElReporte cargando={isLoading} error={errorCrudo} onReintentar={refetch} queEs="las comisiones" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">Comisión de la inmobiliaria</p>
          <p className="text-lg font-bold text-success">
            {formatCurrency(data.comisionDeLaAgenciaCop)}
          </p>
        </div>
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">Contratos con comisión</p>
          <p className="text-lg font-bold text-foreground">{data.contratosConComision}</p>
        </div>
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.closings')}</p>
          <p className="text-lg font-bold text-foreground">{data.totalClosedDeals}</p>
        </div>
      </div>

      {/* Arriendos cerrados por asesor — sin un peso atribuido. */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t('inmobiliaria.reporte.topAgents')}</h4>
        <div className="space-y-2">
          {data.agentes.slice(0, 5).map((agente, index) => (
            <div
              key={agente.userId}
              className="flex items-center justify-between p-3 rounded-md border border-border bg-card"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    index === 0 && agente.closedDeals > 0
                      ? 'bg-warning-soft text-warning'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index + 1}
                </span>
                <p className="text-sm font-medium text-foreground font-mono">{agente.userId}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {agente.closedDeals} {t('inmobiliaria.reporte.closings')}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          La comisión de los asesores se liquida por fuera de Leasefy. Quién captó y quién
          arrendó, con nombre y detalle, está en Configuración › Equipo › Captaciones y arriendos.
        </p>
      </div>
    </div>
  );
}

/**
 * Ocupación: la vista COMPLETA (la que antes vivía apilada debajo del
 * catálogo, en «Reportes Avanzados»). Nico, 01-10: «son un montón de tablas
 * dispuestas en scroll, se siente rarísimo». Ahora cada reporte se abre solo,
 * en su cajón.
 */
function VistaDeOcupacion() {
  const { report, isLoading, errorCrudo, refetch } = useOcupacionReport();
  const datos = React.useMemo(() => adaptOccupancy(report), [report]);
  if (!datos) {
    return <EsperandoElReporte cargando={isLoading} error={errorCrudo} onReintentar={refetch} queEs="la ocupación" />;
  }
  return <OccupancyReport data={datos} />;
}

/** Cartera por edades: los tramos y, debajo, el recaudo y la mora del período. */
function VistaDeCartera({ t }: { t: Traductor }) {
  const { report } = useCarteraReport();
  const recaudo = React.useMemo(() => adaptCollections(report), [report]);
  return (
    <div className="space-y-8">
      <SeccionDelReporte titulo="Por días de mora">
        <CarteraEdadesPreview t={t} />
      </SeccionDelReporte>
      {recaudo && (
        <SeccionDelReporte titulo="Recaudo y mora">
          <CollectionsReport data={recaudo} />
        </SeccionDelReporte>
      )}
    </div>
  );
}

/** Rendimiento de agentes: cierres, conversión y la comisión de la casa. */
function VistaDeRendimiento() {
  const mes = mesEnCurso();
  const rendimiento = useRendimientoAgentesReport(mes);
  const comisiones = useComisionesReport(mes);
  const datos = React.useMemo(
    () => adaptAgentPerformance(rendimiento.report, comisiones.report),
    [rendimiento.report, comisiones.report],
  );
  if (!datos) {
    return (
      <EsperandoElReporte
        cargando={rendimiento.isLoading || comisiones.isLoading}
        error={rendimiento.errorCrudo ?? comisiones.errorCrudo}
        onReintentar={() => {
          void rendimiento.refetch();
          void comisiones.refetch();
        }}
        queEs="el desempeño de los agentes"
      />
    );
  }
  return <AgentPerformanceReport data={datos} />;
}

/** Flujo de caja: los meses y, debajo, el resumen ejecutivo que sale de ellos. */
function VistaDeFlujo({ t, fmtDate }: { t: Traductor; fmtDate: (d: string) => string }) {
  const flujo = useFlujoCajaReport('semester');
  const ocupacion = useOcupacionReport();
  const ejecutivo = React.useMemo(
    () => adaptExecutive(flujo.report, ocupacion.report),
    [flujo.report, ocupacion.report],
  );
  return (
    <div className="space-y-8">
      <SeccionDelReporte titulo="Ingresos y comisiones">
        <FlujoCajaPreview t={t} fmtDate={fmtDate} />
      </SeccionDelReporte>
      {ejecutivo && (
        <SeccionDelReporte titulo="Resumen ejecutivo">
          <ExecutiveSummary data={ejecutivo} />
        </SeccionDelReporte>
      )}
    </div>
  );
}

/**
 * Rentabilidad por inmueble. 🔴 Antes «Vista previa» navegaba a su pantalla y
 * el cajón no mostraba nada (Nico, 01-10). Ahora: los totales del rango y los
 * diez inmuebles que más le dejan al propietario; la tabla entera, ordenable y
 * con su período, sigue en su pantalla.
 */
function VistaDeRentabilidad({ periodo }: { periodo: ReporteFiltersState['period'] }) {
  const router = useRouter();
  const { desde, hasta } = parametrosDelPeriodo('rentabilidad-inmueble', periodo).params;
  const { report, isLoading, errorCrudo, refetch } = useRentabilidadReport(desde, hasta);
  if (!report) {
    return <EsperandoElReporte cargando={isLoading} error={errorCrudo} onReintentar={refetch} queEs="la rentabilidad" />;
  }
  const { totales } = report;
  const cifras = [
    { rotulo: 'Esperado', valor: formatCurrency(totales.esperadoCop) },
    { rotulo: 'Recaudado', valor: formatCurrency(totales.recaudadoCop) },
    { rotulo: 'Comisión', valor: formatCurrency(totales.comisionCop) },
    { rotulo: 'Neto al propietario', valor: formatCurrency(totales.netoPropietarioCop) },
  ];
  return (
    <div className="space-y-8">
      <SeccionDelReporte titulo={`De ${report.desde} a ${report.hasta} · ${totales.inmuebles} inmuebles`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cifras.map((c) => (
            <div key={c.rotulo} className="rounded-md border border-border-faint bg-surface-muted px-3 py-2.5">
              <p className="text-caption text-fg-muted">{c.rotulo}</p>
              <p className="font-mono text-body font-semibold tabular-nums text-fg">{c.valor}</p>
            </div>
          ))}
        </div>
      </SeccionDelReporte>
      {report.filas.length > 0 && (
        <SeccionDelReporte titulo="Los que más le dejan al propietario">
          <GraficoDeRentabilidad filas={report.filas} />
        </SeccionDelReporte>
      )}
      <Button
        variant="outline"
        hideArrow
        onClick={() => router.push('/panel/inmobiliaria/reportes/rentabilidad')}
        data-testid="ver-rentabilidad-completa"
      >
        Ver la tabla completa, por inmueble
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Extractos: son POR propietario y salen de la dispersión de su mes, así que
 * no hay un archivo único. En vez de «Vista previa no disponible», dice dónde
 * están.
 */
function VistaDeExtractos({ reportId }: { reportId: ReportId }) {
  const router = useRouter();
  const como = comoSeBaja(reportId);
  const donde = !como.disponible ? como.dondeSiHay : undefined;
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
      <div className="space-y-1">
        <p className="text-body font-semibold text-fg">Cada propietario tiene su extracto</p>
        <p className="text-body-sm text-fg-muted">
          {!como.disponible ? como.motivo : null} Ahí ves lo que se le cobró, la comisión y lo que se
          le giró, mes por mes.
        </p>
      </div>
      {donde && (
        <Button variant="outline" hideArrow onClick={() => router.push(donde.href)}>
          {donde.label}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Vencimientos Preview
 */
function VencimientosPreview({ t }: { t: Traductor }) {
  const { report: data, isLoading, errorCrudo, refetch } = useVencimientosReport();
  if (!data) {
    return <EsperandoElReporte cargando={isLoading} error={errorCrudo} onReintentar={refetch} queEs="los vencimientos" />;
  }

  const bucketColors = {
    '0-30': 'bg-danger-soft text-danger',
    '31-60': 'bg-warning-soft text-warning',
    '61-90': 'bg-primary-soft text-primary',
    '90+': 'bg-success-soft text-success',
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-md bg-danger-soft text-center">
          <p className="text-lg font-bold text-danger">
            {data.summary.bucket0to30}
          </p>
          <p className="text-xs text-danger">{t('inmobiliaria.reporte.days0to30')}</p>
        </div>
        <div className="p-3 rounded-md bg-warning-soft text-center">
          <p className="text-lg font-bold text-warning">
            {data.summary.bucket31to60}
          </p>
          <p className="text-xs text-warning">{t('inmobiliaria.reporte.days31to60')}</p>
        </div>
        <div className="p-3 rounded-md bg-primary-soft text-center">
          <p className="text-lg font-bold text-primary">
            {data.summary.bucket61to90}
          </p>
          <p className="text-xs text-primary">{t('inmobiliaria.reporte.days61to90')}</p>
        </div>
        <div className="p-3 rounded-md bg-success-soft text-center">
          <p className="text-lg font-bold text-success">
            {data.summary.bucket90plus}
          </p>
          <p className="text-xs text-success">{t('inmobiliaria.reporte.days90plus')}</p>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">
          {t('inmobiliaria.reporte.upcomingExpirations')} ({data.summary.totalVencimientos})
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.items.slice(0, 10).map((item) => (
            <div
              key={item.consignacionId}
              className="flex items-center justify-between p-3 rounded-md border border-border"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.propertyTitle}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.tenantName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    bucketColors[item.bucket]
                  )}
                >
                  {t('inmobiliaria.reporte.nDays', { count: item.daysUntilExpiry })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Flujo de Caja Preview
 */
function FlujoCajaPreview({ t, fmtDate }: { t: Traductor; fmtDate: (d: string) => string }) {
  const { report: data, isLoading, errorCrudo, refetch } = useFlujoCajaReport('semester');
  if (!data) {
    return <EsperandoElReporte cargando={isLoading} error={errorCrudo} onReintentar={refetch} queEs="el flujo de caja" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-md bg-success-soft">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyCircleDollar className="w-5 h-5 text-success" />
            <p className="text-sm text-success">{t('inmobiliaria.reporte.income')}</p>
          </div>
          <p className="text-xl font-bold text-success">
            {formatCurrency(data.totals.totalIngresos)}
          </p>
        </div>
        <div className="p-4 rounded-md bg-primary-soft">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-5 h-5 text-primary" />
            <p className="text-sm text-primary">{t('inmobiliaria.reporte.commissions')}</p>
          </div>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(data.totals.totalComisiones)}
          </p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t('inmobiliaria.reporte.monthlyBreakdown')}</h4>
        <div className="space-y-2">
          {data.months.map((month) => (
            <div
              key={month.month}
              className="flex items-center justify-between p-3 rounded-md border border-border"
            >
              <span className="text-sm font-medium text-foreground capitalize">
                {fmtDate(month.month + '-01')}
              </span>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.income')}</p>
                  <p className="text-sm font-medium text-success">
                    {formatCurrency(month.ingresos)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.commissions')}</p>
                  <p className="text-sm font-medium text-primary">
                    {formatCurrency(month.comisiones)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Los tramos del informe «Cartera por Edades», con el siniestro como el quinto.
 *
 * 🔴 Bug B de la prueba en navegador (16-09): el total decía $3.003.910.850
 * (la cartera, siniestro incluido) y los cuatro tramos sumaban $364.795.650
 * (sólo la cartera viva). Con el siniestro a los 30 días, los tramos de más de
 * 30 daban siempre $0 y nadie sabía dónde estaba el resto. El back ya separa
 * la cobranza viva (`bucket*`) del siniestro (`enSiniestroCop`); acá se
 * muestran los cinco, y los cinco suman `carteraCop`. Pura para fijarla con
 * una prueba.
 */
export function tramosDelInformeDeEdades(summary: CarteraReport['summary']): {
  clave: 'days0to30' | 'days31to60' | 'days61to90' | 'days90plus' | 'claimsBucket';
  monto: number;
}[] {
  return [
    { clave: 'days0to30', monto: summary.bucket0to30 },
    { clave: 'days31to60', monto: summary.bucket31to60 },
    { clave: 'days61to90', monto: summary.bucket61to90 },
    { clave: 'days90plus', monto: summary.bucket90plus },
    { clave: 'claimsBucket', monto: summary.enSiniestroCop },
  ];
}

const TONO_DEL_TRAMO: Record<ReturnType<typeof tramosDelInformeDeEdades>[number]['clave'], string> = {
  days0to30: 'bg-success-soft text-success',
  days31to60: 'bg-warning-soft text-warning',
  days61to90: 'bg-warning-soft text-warning',
  days90plus: 'bg-danger-soft text-danger',
  claimsBucket: 'bg-danger-soft text-danger',
};

/**
 * Cartera Edades Preview
 */
export function CarteraEdadesPreview({ t }: { t: Traductor }) {
  const { report: data, isLoading, errorCrudo, refetch } = useCarteraReport();
  if (!data) {
    return <EsperandoElReporte cargando={isLoading} error={errorCrudo} onReintentar={refetch} queEs="la cartera" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards.

          🔴 La cifra grande es la CARTERA (lo que pasó el plazo del contrato),
          no toda la deuda: la deuda total de la inmobiliaria migrada es 12,9
          veces mayor, y ponerla acá bajo el rótulo «cartera vencida» mandaría
          a la cobranza a perseguir plata que nadie debe todavía. */}
      <div className="p-4 rounded-lg bg-danger-soft text-fg">
        <p className="text-sm font-medium text-danger">{t('inmobiliaria.reporte.totalOverduePortfolio')}</p>
        <p className="text-2xl font-bold">{formatCurrency(data.summary.carteraCop)}</p>
        {/* La unidad es la CUOTA, no el cobro: el informe sale de las cuotas
            del contrato y la mayoría no tiene cobro emitido. */}
        <p className="text-xs text-danger mt-1" data-testid="edades-cuotas">
          {t('inmobiliaria.reporte.cuotasEnCartera', { count: data.summary.cuotasEnCartera })}
        </p>
      </div>

      {/* Los cinco tramos: la cobranza viva por días de mora y el siniestro.
          Suman la cifra de arriba. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" data-testid="edades-tramos">
        {tramosDelInformeDeEdades(data.summary).map((tramo) => (
          <div
            key={tramo.clave}
            className={cn('p-3 rounded-md text-center', TONO_DEL_TRAMO[tramo.clave])}
            data-testid={`edades-tramo-${tramo.clave}`}
          >
            <p className="text-lg font-bold">{formatCurrency(tramo.monto)}</p>
            <p className="text-xs">{t(`inmobiliaria.reporte.${tramo.clave}`)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.bucketsAddUp')}</p>

      {/* Top Deudores */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">
          {t('inmobiliaria.reporte.topDebtors')} ({data.summary.cuotasEnCartera})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.items
            // Los peores deudores son los de la CARTERA: una cuota que todavía
            // no vence no es un deudor moroso.
            .filter((item) => item.cajon === 'CARTERA')
            .sort((a, b) => b.pendingAmount - a.pendingAmount)
            .slice(0, 8)
            .map((item) => (
              <div
                key={item.cuotaId}
                className="flex items-center justify-between p-3 rounded-md border border-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.tenantName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.propertyTitle}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-bold text-danger">
                    {formatCurrency(item.pendingAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('inmobiliaria.reporte.nDays', { count: item.diasDeMora })}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ReporteViewer - Sheet drawer for previewing report data
 * Shows report header, applied filters, preview content, and export actions
 */
export function ReporteViewer({
  isOpen,
  onClose,
  report,
  filters,
  onExport,
}: ReporteViewerProps) {
  const { t, formatDate: fmtDate } = useI18n();
  const [isExporting, setIsExporting] = React.useState(false);

  /**
   * Bajar el reporte.
   *
   * Tenía un `await new Promise(r => setTimeout(r, 1500))` antes de llamar a
   * `onExport`: segundo y medio de rueda girando fingiendo trabajo, que es
   * exactamente la mentira que `lib/reportes/exportables.ts` documenta haber
   * sacado del resto del módulo. Y peor: `setIsExporting(false)` corría al
   * toque, sin esperar la descarga real, así que el botón volvía a estar vivo
   * con el pedido todavía en vuelo — dos clics, dos descargas.
   */
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!onExport || isExporting) return;
    setIsExporting(true);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
    }
  };

  if (!report) return null;

  const Icon = ICON_MAP[report.icon] || FileText;
  const bgColor = CATEGORY_BG_COLORS[report.category];
  const iconColor = CATEGORY_ICON_COLORS[report.category];
  // Ver `formatoDelArchivo`: acá se pintaba `report.format` («EXCEL»/«PDF»)
  // arriba del botón que dice «Descargar CSV» y baja un `.csv`.
  const formatoDelArchivoQueBaja = formatoDelArchivo(report.id);

  // Qué dice el archivo del período elegido: la misma nota que el aviso de la
  // descarga. Va al lado del botón, que es de lo que habla.
  const como = comoSeBaja(report.id as ReportId);
  const notaDelArchivo = como.disponible ? parametrosDelPeriodo(como.tipo, filters.period).nota : null;

  // La vista de cada reporte. Ninguna deja el cajón en blanco: todas cargan,
  // fallan con «Reintentar» o dicen que no hay datos.
  const PreviewContent = () => {
    switch (report.id) {
      case 'cartera-edades':
        return <VistaDeCartera t={t} />;
      case 'comisiones-agente':
        return <ComisionesAgentePreview t={t} />;
      case 'rendimiento-agentes':
        return <VistaDeRendimiento />;
      case 'ocupacion-portafolio':
        return <VistaDeOcupacion />;
      case 'vencimientos':
        return <VencimientosPreview t={t} />;
      case 'flujo-caja':
        return <VistaDeFlujo t={t} fmtDate={fmtDate} />;
      case 'rentabilidad-inmueble':
        return <VistaDeRentabilidad periodo={filters.period} />;
      default:
        return <VistaDeExtractos reportId={report.id as ReportId} />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* La anatomía del cajón de la casa (cabecera fija, cuerpo con scroll,
          pie fijo) con `SheetContent` propio: `Cajon` apaga `aria-describedby`
          y este cajón SÍ registra su descripción (ver el test de al lado). */}
      {/* Ancho: la vista completa trae tablas y gráficos; en 576 px no cabían. */}
      <SheetContent size="xl">
        {/* Header — la ✕ la pone `SheetContent`: es la misma de todos los
            cajones y modales del producto. */}
        <SheetHeader
          leading={
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                bgColor
              )}
            >
              <Icon className={cn('w-6 h-6', iconColor)} weight="duotone" />
            </div>
          }
          title={report.title}
          /*
            `description` registra el texto como `SheetDescription`, no un `<p>`
            suelto: `SheetContent` es un Radix Dialog, y un diálogo sin
            descripción registrada avisa en consola («Missing `Description` …
            for {DialogContent}») y se abre sin `aria-describedby`, así que el
            lector de pantalla anuncia el título y nada más.
          */
          description={report.description}
        >
          <div className="flex items-center gap-2 mt-2.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                getReportCategoryColor(report.category)
              )}
            >
              {report.category}
            </span>
            {formatoDelArchivoQueBaja && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success-soft text-success">
                <FileCsv className="w-3 h-3" />
                {formatoDelArchivoQueBaja}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Preview Content */}
        <CajonCuerpo>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <PreviewContent />
          </motion.div>
        </CajonCuerpo>

        {/* Actions Footer */}
        <CajonPie
          izquierda={
            notaDelArchivo && (
              <p className="flex min-w-0 items-center gap-2 text-caption text-fg-muted" data-testid="nota-del-archivo">
                <CalendarBlank className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{notaDelArchivo}</span>
              </p>
            )
          }
        >
          {/* Sin archivo (los extractos) no hay botón: antes decía «Descargar
              CSV» y respondía «todavía no se puede descargar». */}
          {formatoDelArchivoQueBaja && (
          <Button
            hideArrow
            onClick={() => handleExport(report.format)}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="animate-pulse">{t('inmobiliaria.reporte.exporting')}</span>
              </>
            ) : (
              <>
                <DownloadSimple className="w-4 h-4 mr-2" />
                {/* CSV, no `report.format`. El catálogo marca estos reportes
                    como «excel» o «pdf», pero `/reports/export` responde
                    `text/csv` y el archivo baja `.csv`: el botón prometía un
                    formato que nunca llegó. */}
                {t('inmobiliaria.reporte.downloadFormat', { format: 'CSV' })}
              </>
            )}
          </Button>
          )}

          {/* Acá había un botón de imprimir (`window.print()`) sin una sola
              regla `@media print` en este componente: imprimía el panel
              entero con el cajón encima, no el reporte. Y debajo, un rótulo
              suelto «Exportación programada» sin producto detrás: ni botón,
              ni frecuencia, ni a dónde llega. Los dos salieron. */}
        </CajonPie>
      </SheetContent>
    </Sheet>
  );
}

export default ReporteViewer;
