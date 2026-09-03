'use client';

/**
 * Rentabilidad por inmueble — `/panel/inmobiliaria/reportes/rentabilidad`.
 *
 * Lo esperado contra lo recaudado por inmueble en un rango de meses, y lo
 * que queda al propietario después de comisión, retenciones y gastos. Todo
 * sale de `GET /inmobiliaria/reports/rentabilidad`; acá no se calcula nada
 * que el back no haya calculado: sólo se ordena, se pagina y se dibuja.
 *
 * El rango se valida en el cliente ANTES de pedir (`lib/reportes/periodo.ts`):
 * mientras el rango escrito no cierra, la tabla sigue mostrando el último
 * rango válido y el mensaje queda al lado del control.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  Buildings,
  DownloadSimple,
} from '@phosphor-icons/react';
import { SegmentedControl, Stat, StatStrip } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionLabel } from '@/components/ui/section-label';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { formatCurrency } from '@/lib/format';
import { apiClient, ApiError } from '@/lib/api/client';
import { useRentabilidadReport } from '@/lib/hooks/useInmobiliaria';
import { nombreDelArchivo, rutaDeExport, descargarBlob } from '@/lib/reportes/exportables';
import {
  PRESETS_DE_PERIODO,
  rangoDelPreset,
  validarRango,
  etiquetaDelMes,
  mesesEntre,
  type PresetDePeriodo,
  type RangoDeMeses,
} from '@/lib/reportes/periodo';
import {
  GraficoDeRentabilidad,
  TOP_DEL_GRAFICO,
} from '@/components/inmobiliaria/reports/GraficoDeRentabilidad';
import {
  ORDEN_INICIAL,
  alternarOrden,
  ordenarFilas,
  type ColumnaDeRentabilidad as Columna,
  type OrdenDeRentabilidad as Orden,
} from '@/lib/reportes/rentabilidad-orden';
import type { RentabilidadFila } from '@/lib/types/inmobiliaria';

// ── Formato ──────────────────────────────────────────────────────────────────

function formatearPct(valor: number, locale: 'es' | 'en'): string {
  return `${valor.toLocaleString(locale === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 })} %`;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Barra fina ───────────────────────────────────────────────────────────────

function Barra({ pct, className }: { pct: number; className?: string }) {
  const ancho = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full max-w-[96px] overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className={cn('h-full rounded-full bg-primary', className)} style={{ width: `${ancho}%` }} />
    </div>
  );
}

// ── Contenido ────────────────────────────────────────────────────────────────

function RentabilidadContent() {
  const { t, locale } = useI18n();
  const router = useRouter();

  // Periodo: lo que la persona escribió y lo que se le pidió al back. Se
  // separan para que un rango a medio escribir no dispare una consulta que
  // ya se sabe inválida.
  const [preset, setPreset] = useState<PresetDePeriodo>('12m');
  const [rango, setRango] = useState<RangoDeMeses>(() => rangoDelPreset('12m'));
  const [consulta, setConsulta] = useState<RangoDeMeses>(rango);
  const errorDeRango = validarRango(rango.desde, rango.hasta);

  const elegirPreset = useCallback((nuevo: PresetDePeriodo) => {
    setPreset(nuevo);
    if (nuevo === 'libre') return;
    const r = rangoDelPreset(nuevo);
    setRango(r);
    setConsulta(r);
  }, []);

  const cambiarMes = useCallback(
    (extremo: keyof RangoDeMeses, valor: string) => {
      setPreset('libre');
      const r = { ...rango, [extremo]: valor };
      setRango(r);
      if (!validarRango(r.desde, r.hasta)) setConsulta(r);
    },
    [rango],
  );

  const { report, isLoading, errorCrudo, refetch } = useRentabilidadReport(consulta.desde, consulta.hasta);
  const filas = useMemo(() => report?.filas ?? [], [report]);

  // Orden
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const ordenar = useCallback((columna: Columna) => {
    setOrden((prev) => alternarOrden(prev, columna));
  }, []);
  const filasOrdenadas = useMemo(() => ordenarFilas(filas, orden), [filas, orden]);

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } = useTablePagination(
    filasOrdenadas,
    { resetKey: `${orden.columna}|${orden.direccion}|${consulta.desde}|${consulta.hasta}` },
  );

  // CSV del mismo rango que se está mirando.
  const [bajando, setBajando] = useState(false);
  const bajarCsv = useCallback(async () => {
    setBajando(true);
    try {
      const blob = await apiClient.getBlob(
        rutaDeExport('rentabilidad-inmueble', { desde: consulta.desde, hasta: consulta.hasta }),
      );
      descargarBlob(blob, nombreDelArchivo('rentabilidad-inmueble', hoyIso()));
      toast.success(t('inmobiliaria.reportes.rentabilidad.downloaded'), {
        description: `${consulta.desde} → ${consulta.hasta} · CSV`,
      });
    } catch (error) {
      toast.error(t('inmobiliaria.reportes.rentabilidad.downloadError'), {
        description:
          error instanceof ApiError && error.status === 403
            ? t('inmobiliaria.reportes.rentabilidad.downloadForbidden')
            : t('inmobiliaria.reportes.rentabilidad.tryAgain'),
      });
    } finally {
      setBajando(false);
    }
  }, [consulta, t]);

  const COLUMNAS: Array<{ id: Columna; label: string; numeric?: boolean }> = [
    { id: 'inmueble', label: t('inmobiliaria.reportes.rentabilidad.table.property') },
    { id: 'canon', label: t('inmobiliaria.reportes.rentabilidad.table.rent'), numeric: true },
    { id: 'ocupacion', label: t('inmobiliaria.reportes.rentabilidad.table.occupancy') },
    { id: 'recaudado', label: t('inmobiliaria.reportes.rentabilidad.table.collected'), numeric: true },
    { id: 'comision', label: t('inmobiliaria.reportes.rentabilidad.table.commission'), numeric: true },
    { id: 'gastos', label: t('inmobiliaria.reportes.rentabilidad.table.expenses'), numeric: true },
    { id: 'neto', label: t('inmobiliaria.reportes.rentabilidad.table.net'), numeric: true },
    { id: 'rentabilidad', label: t('inmobiliaria.reportes.rentabilidad.table.yield'), numeric: true },
  ];

  const fichaDe = (f: RentabilidadFila) => `/panel/inmobiliaria/inmuebles/${f.consignacionId}`;
  const totales = report?.totales;
  const meses = report?.meses ?? mesesEntre(consulta.desde, consulta.hasta);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado: la vuelta arriba a la izquierda, como en Reglas de mora. */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <Link
            href="/panel/inmobiliaria/reportes"
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('inmobiliaria.reportes.rentabilidad.back')}
          </Link>
          <SectionLabel>{t('inmobiliaria.reportes.rentabilidad.eyebrow')}</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.reportes.rentabilidad.title')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            {t('inmobiliaria.reportes.rentabilidad.description')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            hideArrow
            onClick={() => void bajarCsv()}
            disabled={bajando || Boolean(errorDeRango)}
            className="gap-2"
            data-testid="descargar-csv"
          >
            <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            {bajando
              ? t('inmobiliaria.reportes.rentabilidad.downloading')
              : t('inmobiliaria.reportes.rentabilidad.download')}
          </Button>
        </div>
      </header>

      {/* Periodo */}
      <section
        className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        aria-labelledby="rentabilidad-periodo"
      >
        <div className="space-y-2">
          <p id="rentabilidad-periodo" className="text-xs font-medium text-fg-muted">
            {t('inmobiliaria.reportes.rentabilidad.period.label')}
          </p>
          <SegmentedControl<PresetDePeriodo>
            value={preset}
            onChange={elegirPreset}
            size="sm"
            aria-label={t('inmobiliaria.reportes.rentabilidad.period.label')}
            options={PRESETS_DE_PERIODO.map((p) => ({
              value: p,
              label: t(`inmobiliaria.reportes.rentabilidad.period.${p}`),
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="rentabilidad-desde" className="text-xs">
                {t('inmobiliaria.reportes.rentabilidad.period.from')}
              </Label>
              <Input
                id="rentabilidad-desde"
                type="month"
                value={rango.desde}
                onChange={(e) => cambiarMes('desde', e.target.value)}
                className="h-10 w-40 font-mono"
                aria-invalid={Boolean(errorDeRango)}
                aria-describedby={errorDeRango ? 'rentabilidad-rango-error' : undefined}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rentabilidad-hasta" className="text-xs">
                {t('inmobiliaria.reportes.rentabilidad.period.to')}
              </Label>
              <Input
                id="rentabilidad-hasta"
                type="month"
                value={rango.hasta}
                onChange={(e) => cambiarMes('hasta', e.target.value)}
                className="h-10 w-40 font-mono"
                aria-invalid={Boolean(errorDeRango)}
                aria-describedby={errorDeRango ? 'rentabilidad-rango-error' : undefined}
              />
            </div>
          </div>
          {errorDeRango ? (
            <p id="rentabilidad-rango-error" role="alert" className="text-xs text-danger">
              {errorDeRango}
            </p>
          ) : (
            <p className="text-xs text-fg-muted" data-testid="rango-consultado">
              {t('inmobiliaria.reportes.rentabilidad.period.showing', {
                desde: etiquetaDelMes(consulta.desde, locale),
                hasta: etiquetaDelMes(consulta.hasta, locale),
                meses,
              })}
            </p>
          )}
        </div>
      </section>

      <EstadoDeDatos
        cargando={isLoading && !report}
        error={errorCrudo}
        vacio={filas.length === 0}
        queEs={t('inmobiliaria.reportes.rentabilidad.loadingWhat')}
        onReintentar={() => void refetch()}
        esqueleto={
          <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-xl border border-border bg-card" aria-hidden="true" />
            <EsqueletoTabla columnas={COLUMNAS.length} />
          </div>
        }
        cuandoVacio={
          <div className="rounded-xl border border-border bg-card">
            <SinDatos
              queSon="inmuebles"
              icono={Buildings}
              titulo={t('inmobiliaria.reportes.rentabilidad.empty.title')}
              descripcion={t('inmobiliaria.reportes.rentabilidad.empty.description')}
            />
          </div>
        }
      >
        {totales && (
          <StatStrip
            className="flex-wrap rounded-xl border border-border bg-card px-4 [&>*]:basis-1/2 sm:[&>*]:basis-1/3 xl:[&>*]:basis-auto"
            data-testid="totales-de-rentabilidad"
          >
            <Stat
              label={t('inmobiliaria.reportes.rentabilidad.stats.expected')}
              value={formatCurrency(totales.esperadoCop)}
              delta={t('inmobiliaria.reportes.rentabilidad.stats.properties', { count: totales.inmuebles })}
              compact
            />
            <Stat
              label={t('inmobiliaria.reportes.rentabilidad.stats.collected')}
              value={formatCurrency(totales.recaudadoCop)}
              delta={t('inmobiliaria.reportes.rentabilidad.stats.collectionRate', {
                pct: totales.tasaDeRecaudoPct.toLocaleString(locale === 'en' ? 'en-US' : 'es-CO', {
                  maximumFractionDigits: 1,
                }),
              })}
              deltaDirection={totales.tasaDeRecaudoPct >= 95 ? 'up' : totales.enMoraCop > 0 ? 'down' : 'neutral'}
              compact
            />
            <Stat
              label={t('inmobiliaria.reportes.rentabilidad.stats.commission')}
              value={formatCurrency(totales.comisionCop)}
              compact
            />
            <Stat
              label={t('inmobiliaria.reportes.rentabilidad.stats.netToOwners')}
              value={formatCurrency(totales.netoPropietarioCop)}
              delta={t('inmobiliaria.reportes.rentabilidad.stats.withValue', { count: totales.conValor })}
              compact
            />
            <Stat
              label={t('inmobiliaria.reportes.rentabilidad.stats.occupancy')}
              value={formatearPct(totales.ocupacionPromedioPct, locale)}
              compact
            />
            <Stat
              label={t('inmobiliaria.reportes.rentabilidad.stats.vacancyLoss')}
              value={formatCurrency(totales.ingresoPerdidoPorVacanciaCop)}
              deltaDirection={totales.ingresoPerdidoPorVacanciaCop > 0 ? 'down' : 'neutral'}
              compact
            />
          </StatStrip>
        )}

        {/* Gráfico */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.reportes.rentabilidad.chart.title', {
                n: Math.min(TOP_DEL_GRAFICO, filas.length),
              })}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {t('inmobiliaria.reportes.rentabilidad.chart.subtitle')}
            </p>
          </div>
          <div className="p-4">
            <GraficoDeRentabilidad filas={filas} />
          </div>
        </section>

        {/* Tabla */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.reportes.rentabilidad.table.title')}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {t('inmobiliaria.reportes.rentabilidad.table.subtitle')}
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNAS.map((col) => {
                  const activa = orden.columna === col.id;
                  const Flecha = !activa ? ArrowsDownUp : orden.direccion === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <TableHead
                      key={col.id}
                      numeric={col.numeric}
                      className="whitespace-nowrap"
                      aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => ordenar(col.id)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm font-mono uppercase transition-colors hover:text-fg',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          col.numeric && 'flex-row-reverse',
                          activa && 'text-fg',
                        )}
                        data-testid={`ordenar-${col.id}`}
                        data-activa={activa ? orden.direccion : undefined}
                      >
                        {col.label}
                        <Flecha className={cn('h-3 w-3', !activa && 'opacity-50')} aria-hidden="true" />
                        {activa && (
                          <span className="sr-only">
                            {orden.direccion === 'asc'
                              ? t('inmobiliaria.reportes.rentabilidad.table.sortedAsc')
                              : t('inmobiliaria.reportes.rentabilidad.table.sortedDesc')}
                          </span>
                        )}
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageItems.map((f) => {
                const fuente =
                  f.ocupacionFuente === 'leases'
                    ? t('inmobiliaria.reportes.rentabilidad.table.sourceLeases')
                    : t('inmobiliaria.reportes.rentabilidad.table.sourceCobros');
                const detalleOcupacion = `${formatearPct(f.ocupacionPct, locale)} ${fuente} · ${t(
                  'inmobiliaria.reportes.rentabilidad.table.vacantDays',
                  { dias: f.diasVacantes },
                )}`;
                return (
                  <TableRow
                    key={f.consignacionId}
                    onClick={() => router.push(fichaDe(f))}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    data-testid="fila-de-rentabilidad"
                  >
                    <TableCell className="max-w-[260px]">
                      <Link
                        href={fichaDe(f)}
                        onClick={(e) => e.stopPropagation()}
                        className="block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate font-medium text-fg">
                          {f.propertyTitle}
                          {f.codigo != null && (
                            <span className="ml-1.5 font-mono text-xs text-fg-muted">#{f.codigo}</span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-fg-muted">{f.propietarioNombre}</span>
                      </Link>
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums">
                      {f.canonDesconocido ? (
                        <span
                          className="text-fg-muted"
                          title={t('inmobiliaria.reportes.rentabilidad.table.unknownRent')}
                        >
                          —
                        </span>
                      ) : (
                        formatCurrency(f.canonCop)
                      )}
                    </TableCell>
                    <TableCell title={detalleOcupacion}>
                      <div className="flex items-center gap-2">
                        <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-fg">
                          {formatearPct(f.ocupacionPct, locale)}
                        </span>
                        <Barra pct={f.ocupacionPct} />
                      </div>
                    </TableCell>
                    <TableCell
                      numeric
                      className="whitespace-nowrap"
                      title={`${formatearPct(f.tasaDeRecaudoPct, locale)} · ${formatCurrency(f.enMoraCop)} en mora`}
                    >
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-sm tabular-nums text-fg">
                          {formatCurrency(f.recaudadoCop)}
                          <span className="text-fg-muted"> / {formatCurrency(f.esperadoCop)}</span>
                        </span>
                        <Barra pct={f.tasaDeRecaudoPct} className={f.enMoraCop > 0 ? 'bg-warning' : undefined} />
                      </div>
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums text-fg-muted">
                      {formatCurrency(f.comisionCop)}
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums text-fg-muted">
                      {formatCurrency(f.gastosMantenimientoCop)}
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono font-medium tabular-nums text-fg">
                      {formatCurrency(f.netoPropietarioCop)}
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums">
                      {f.rentabilidadNetaAnualPct === null ? (
                        <span className="text-fg-muted" title={t('inmobiliaria.reportes.rentabilidad.table.noValue')}>
                          —
                        </span>
                      ) : (
                        formatearPct(f.rentabilidadNetaAnualPct, locale)
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>

            {totales && (
              <TableFooter>
                <TableRow data-testid="fila-de-totales">
                  <TableCell className="font-mono text-xs uppercase tracking-[0.04em] text-fg-subtle">
                    {t('inmobiliaria.reportes.rentabilidad.table.totals')}
                    <span className="ml-1.5 normal-case tracking-normal text-fg-muted">
                      · {t('inmobiliaria.reportes.rentabilidad.stats.properties', { count: totales.inmuebles })}
                    </span>
                  </TableCell>
                  <TableCell numeric />
                  <TableCell className="font-mono text-xs tabular-nums text-fg">
                    {formatearPct(totales.ocupacionPromedioPct, locale)}
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap font-mono text-sm tabular-nums text-fg">
                    {formatCurrency(totales.recaudadoCop)}
                    <span className="text-fg-muted"> / {formatCurrency(totales.esperadoCop)}</span>
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap font-mono tabular-nums text-fg">
                    {formatCurrency(totales.comisionCop)}
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap font-mono tabular-nums text-fg">
                    {formatCurrency(totales.gastosMantenimientoCop)}
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap font-mono font-semibold tabular-nums text-fg">
                    {formatCurrency(totales.netoPropietarioCop)}
                  </TableCell>
                  <TableCell numeric />
                </TableRow>
              </TableFooter>
            )}
          </Table>

          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </section>

        {/* Notas del back: explican el cálculo, no piden nada. Una alerta
            sin acción no se justifica (contrato de `AlertaAccionable`); van
            como lista sobria. */}
        {report && report.notas.length > 0 && (
          <section className="space-y-1.5 px-1" data-testid="notas-del-reporte">
            <p className="font-mono text-label font-medium uppercase tracking-[0.08em] text-fg-subtle">
              {t('inmobiliaria.reportes.rentabilidad.notes')}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-fg-muted">
              {report.notas.map((nota, i) => (
                <li key={i}>{nota}</li>
              ))}
            </ul>
          </section>
        )}
      </EstadoDeDatos>
    </div>
  );
}

export default function RentabilidadPage() {
  return (
    <PageGuard module="reportes">
      <RentabilidadContent />
    </PageGuard>
  );
}
