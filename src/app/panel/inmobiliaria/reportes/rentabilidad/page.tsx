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
import { toast } from '@/components/ui/toast';
import {
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  Buildings,
  DownloadSimple,
} from '@phosphor-icons/react';
import { AnimatedNumber, SegmentedControl } from '@leasefy/cadence';

/**
 * Una cifra en plata que CUENTA cuando cambia (otro período, otra búsqueda); el
 * texto final es el mismo `formatCurrency` de antes. `Stat` tipa `value` como
 * texto pero lo pinta como hijo: el nodo se ve igual (mismo patrón que los
 * `KpiCard` del pipeline).
 */
const plataQueCuenta = (valor: number) =>
  (<AnimatedNumber value={valor} format={formatCurrency} />) as unknown as string;

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { BASE_POR_DEFECTO, claveDelRotulo } from '@/lib/tasa-de-recaudo';
import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { useTr } from '@/lib/i18n/use-tr';
import {
  Table,
  TableHeader,
  TableBodyAnimado,
  TableFooter,
  TableRow,
  TableRowAnimada,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { formatCurrency } from '@/lib/format';
import { netoDelPropietario } from '@/lib/dinero/neto-del-propietario';
import { apiClient, ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
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
  cuantosEnElGrafico,
} from '@/components/inmobiliaria/reports/GraficoDeRentabilidad';
import {
  ORDEN_INICIAL,
  alternarOrden,
  ordenarFilas,
  type ColumnaDeRentabilidad as Columna,
  type OrdenDeRentabilidad as Orden,
} from '@/lib/reportes/rentabilidad-orden';
import type { RentabilidadFila } from '@/lib/types/inmobiliaria';
import { CampoDeMes } from '@/components/ui/campo-de-mes';

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

/** Un cero no es un dato que leer: «—» atenuado (VOZ §4). */
function plataOGuion(valor: number) {
  return valor === 0 ? <span className="text-fg-subtle">—</span> : formatCurrency(valor);
}

type FiltroDeRecaudo = 'todos' | 'con' | 'sin' | 'mora';
const DEL_FILTRO: Record<Exclude<FiltroDeRecaudo, 'todos'>, (f: RentabilidadFila) => boolean> = {
  con: (f) => f.recaudadoCop > 0,
  sin: (f) => f.recaudadoCop === 0 && f.esperadoCop > 0,
  mora: (f) => f.enMoraCop > 0,
};

/** Sin tildes y en minúsculas, para el buscador. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Con menos de cinco inmuebles con neto, un «los que más dejan» no compara nada. */
const MINIMO_PARA_EL_GRAFICO = 5;

// ── Contenido ────────────────────────────────────────────────────────────────

function RentabilidadContent() {
  const { t, locale } = useI18n();
  const tr = useTr();
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
  /* Revisora r24 #5: con 970 inmuebles, buscar y filtrar dentro de la tarjeta. */
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroDeRecaudo>('todos');
  const filasFiltradas = useMemo(() => {
    const q = normalizar(busqueda);
    const delFiltro = filtro === 'todos' ? filas : filas.filter(DEL_FILTRO[filtro]);
    if (!q) return delFiltro;
    return delFiltro.filter((f) =>
      normalizar(`${f.propertyTitle} ${f.codigo ?? ''} ${f.propietarioNombre ?? ''} ${f.propertyCity ?? ''} ${f.propertyAddress ?? ''}`).includes(q),
    );
  }, [filas, busqueda, filtro]);
  const filasOrdenadas = useMemo(() => ordenarFilas(filasFiltradas, orden), [filasFiltradas, orden]);

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } = useTablePagination(
    filasOrdenadas,
    { resetKey: `${orden.columna}|${orden.direccion}|${consulta.desde}|${consulta.hasta}|${busqueda}|${filtro}` },
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
            : // Con la regla de oro (02-10-2026): un 5xx con la referencia.
              mensajeParaLaPersona(error, {
                porDefecto: t('inmobiliaria.reportes.rentabilidad.tryAgain'),
                accion: 'descargar la rentabilidad',
              }),
      });
    } finally {
      setBajando(false);
    }
  }, [consulta, t]);

  const totales = report?.totales;
  /* Revisora r24 #2: sin ningún valor comercial registrado la columna diría «—» en todas las filas. */
  const hayValorComercial = (totales?.conValor ?? 0) > 0;
  const COLUMNAS_TODAS: Array<{ id: Columna; label: string; numeric?: boolean }> = [
    { id: 'inmueble', label: t('inmobiliaria.reportes.rentabilidad.table.property') },
    { id: 'canon', label: t('inmobiliaria.reportes.rentabilidad.table.rent'), numeric: true },
    { id: 'ocupacion', label: t('inmobiliaria.reportes.rentabilidad.table.occupancy') },
    { id: 'recaudado', label: t('inmobiliaria.reportes.rentabilidad.table.collected'), numeric: true },
    { id: 'comision', label: t('inmobiliaria.reportes.rentabilidad.table.commission'), numeric: true },
    { id: 'gastos', label: t('inmobiliaria.reportes.rentabilidad.table.expenses'), numeric: true },
    { id: 'neto', label: t('inmobiliaria.reportes.rentabilidad.table.net'), numeric: true },
    { id: 'rentabilidad', label: t('inmobiliaria.reportes.rentabilidad.table.yield'), numeric: true },
  ];
  const COLUMNAS = hayValorComercial ? COLUMNAS_TODAS : COLUMNAS_TODAS.filter((c) => c.id !== 'rentabilidad');

  const fichaDe = (f: RentabilidadFila) => `/panel/inmobiliaria/inmuebles/${f.consignacionId}`;
  /*
   * Con qué fórmula se midió la tasa de las filas y de los totales: la de la
   * inmobiliaria. Una respuesta de antes del 2026-09-16 no la trae, y ésa medía
   * sobre lo causado.
   */
  const rotuloDeLaTasa = t(claveDelRotulo(report?.medidaDeLaTasa?.base ?? BASE_POR_DEFECTO));
  const meses = report?.meses ?? mesesEntre(consulta.desde, consulta.hasta);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* GLOW UP 22-10 (UX, al nivel de Deuda del mes): la vuelta arriba; el encabezado común con una
          línea de para qué sirve, la explicación larga en la ayuda y el CSV como secundaria. */}
      {/* GLOW UP 22-10 (revisora r24 #4 y #7): sin «Volver a Reportes» (el riel ya lo hace) y el período en
          las acciones del encabezado, como el mes en Giros; «Desde/Hasta» sólo con «Rango libre». */}
      <div className="space-y-3">
        <EncabezadoDePantalla
          seccion={t('inmobiliaria.reportes.rentabilidad.eyebrow')}
          titulo={t('inmobiliaria.reportes.rentabilidad.title')}
          descripcion={tr('Qué deja cada inmueble: lo esperado, lo recaudado y el neto que le queda al propietario.')}
          ayuda={
            <ParaEntenderMas etiqueta={tr('Qué mide este reporte')} titulo={t('inmobiliaria.reportes.rentabilidad.title')}>
              <p className="text-sm leading-relaxed text-fg-muted">{t('inmobiliaria.reportes.rentabilidad.description')}</p>
            </ParaEntenderMas>
          }
          acciones={
            <>
            <div className="max-w-full overflow-x-auto [scrollbar-width:none]" data-lenis-prevent>
              <SegmentedControl<PresetDePeriodo>
                value={preset}
                onChange={elegirPreset}
                size="sm"
                className="[&>button]:whitespace-nowrap"
                aria-label={t('inmobiliaria.reportes.rentabilidad.period.label')}
                options={PRESETS_DE_PERIODO.map((p) => ({
                  value: p,
                  label: t(`inmobiliaria.reportes.rentabilidad.period.${p}`),
                }))}
              />
            </div>
            <Button
              size="sm"
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
            </>
          }
        />
      </div>

      {/* Periodo: sólo el rango libre pide escribir meses. */}
      {preset === 'libre' || errorDeRango ? (
      <section className="flex flex-col gap-3" aria-label={t('inmobiliaria.reportes.rentabilidad.period.label')}>
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="rentabilidad-desde" className="text-caption">
                {t('inmobiliaria.reportes.rentabilidad.period.from')}
              </Label>
              <CampoDeMes
                id="rentabilidad-desde"
                value={rango.desde}
                onChange={(v) => cambiarMes('desde', v)}
                invalido={Boolean(Boolean(errorDeRango))}
                describedBy={errorDeRango ? 'rentabilidad-rango-error' : undefined}
                className="h-10 w-52"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rentabilidad-hasta" className="text-caption">
                {t('inmobiliaria.reportes.rentabilidad.period.to')}
              </Label>
              <CampoDeMes
                id="rentabilidad-hasta"
                value={rango.hasta}
                onChange={(v) => cambiarMes('hasta', v)}
                invalido={Boolean(Boolean(errorDeRango))}
                describedBy={errorDeRango ? 'rentabilidad-rango-error' : undefined}
                className="h-10 w-52"
              />
            </div>
          </div>
          {/* El error del rango, bajo los dos campos, con su entrada suave: se
              cruza con la línea de lo consultado (02-10-2026). */}
          <ErrorDelCampo
            id="rentabilidad-rango-error"
            mensaje={errorDeRango}
            pista={
              <span data-testid="rango-consultado">
                {t('inmobiliaria.reportes.rentabilidad.period.showing', {
                  desde: etiquetaDelMes(consulta.desde, locale),
                  hasta: etiquetaDelMes(consulta.hasta, locale),
                  meses,
                })}
              </span>
            }
          />
        </div>
      </section>
      ) : null}

      <EstadoDeDatos
        cargando={isLoading && !report}
        error={errorCrudo}
        vacio={filas.length === 0}
        queEs={t('inmobiliaria.reportes.rentabilidad.loadingWhat')}
        onReintentar={refetch}
        esqueleto={
          <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-lg border border-border bg-card" aria-hidden="true" />
            <EsqueletoTabla columnas={COLUMNAS.length} />
          </div>
        }
        cuandoVacio={
          <div className="rounded-lg border border-border bg-card">
            <SinDatos
              queSon="inmuebles"
              icono={Buildings}
              titulo={t('inmobiliaria.reportes.rentabilidad.empty.title')}
              descripcion={t('inmobiliaria.reportes.rentabilidad.empty.description')}
            />
          </div>
        }
      >
        {/* GLOW UP 22-10 (UX): LA RESPUESTA arriba, como Deuda del mes —cuánto se recaudó de lo esperado,
            con la barra de lo que entró, lo pendiente y lo que está en mora—, y debajo, en una línea, lo
            que se reparte: la comisión, el neto a propietarios, la ocupación y lo perdido por vacancia.
            Antes eran seis cifras del mismo peso. */}
        {totales && (
          <section className="space-y-4 rounded-lg border border-border bg-card p-5" data-testid="totales-de-rentabilidad">
            <CifraHeroe
              rotulo={t('inmobiliaria.reportes.rentabilidad.stats.collected')}
              cifra={plataQueCuenta(totales.recaudadoCop)}
              contexto={tr('de los {esperado} esperados en {inmuebles}, de {desde} a {hasta} · {tasa}', {
                esperado: formatCurrency(totales.esperadoCop),
                inmuebles: t('inmobiliaria.reportes.rentabilidad.stats.properties', { count: totales.inmuebles }),
                desde: etiquetaDelMes(consulta.desde, locale),
                hasta: etiquetaDelMes(consulta.hasta, locale),
                tasa: t('inmobiliaria.reportes.rentabilidad.stats.collectionRate', {
                  pct: totales.tasaDeRecaudoPct.toLocaleString(locale === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 }),
                  rotulo: rotuloDeLaTasa,
                }),
              })}
              total={totales.esperadoCop}
              tramos={[
                { clave: 'recaudado', etiqueta: t('inmobiliaria.reportes.rentabilidad.stats.collected'), monto: totales.recaudadoCop, tono: 'exito', cifra: formatCurrency(totales.recaudadoCop), siempre: true },
                { clave: 'pendiente', etiqueta: tr('Pendiente, sin mora'), monto: Math.max(0, totales.pendienteCop - totales.enMoraCop), tono: 'neutro', cifra: formatCurrency(Math.max(0, totales.pendienteCop - totales.enMoraCop)) },
                { clave: 'mora', etiqueta: tr('En mora'), monto: totales.enMoraCop, tono: 'critico', cifra: formatCurrency(totales.enMoraCop) },
              ]}
              tamano="mediana"
              data-testid="cifra-recaudado"
            />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border-faint pt-4 lg:grid-cols-4" data-testid="cifras-del-periodo">
              {/* 🔴 Decisión de negocio (Nico, 2026-09-15), CAMBIABLE: un neto negativo NO es plata a
                  favor del propietario: «queda debiendo», con la regla de `lib/dinero/neto-del-propietario`. */}
              {[
                { clave: 'comision', etiqueta: t('inmobiliaria.reportes.rentabilidad.stats.commission'), valor: formatCurrency(totales.comisionCop) },
                /* Revisora r24 #3: cada cifra dice su base —el neto sale de lo CAUSADO (puede pasar a lo
                   recaudado) y la vacancia es una estimación sobre el canon, en pesos enteros—. */
                { clave: 'neto', etiqueta: tr('Neto causado a propietarios'), valor: netoDelPropietario(totales.netoPropietarioCop, formatCurrency).texto },
                { clave: 'ocupacion', etiqueta: t('inmobiliaria.reportes.rentabilidad.stats.occupancy'), valor: formatearPct(totales.ocupacionPromedioPct, locale) },
                { clave: 'vacancia', etiqueta: tr('Vacancia estimada sobre el canon'), valor: formatCurrency(Math.round(totales.ingresoPerdidoPorVacanciaCop)) },
              ].map((c) => (
                <div key={c.clave} className="min-w-0 space-y-0.5" data-testid={`cifra-${c.clave}`}>
                  <dt className="font-mono text-caption uppercase tracking-[0.06em] text-fg-subtle">{c.etiqueta}</dt>
                  <dd className="font-mono text-body-sm tabular-nums text-fg">{c.valor}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Tabla */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Revisora r24 #5: la barra del trabajo dentro de la tarjeta —pestañas por recaudo y el buscador—. */}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <PestanasDeEstado<FiltroDeRecaudo>
              etiqueta={tr('Filtrar por recaudo')}
              valor={filtro}
              onCambio={setFiltro}
              pestanas={[
                { valor: 'todos', etiqueta: tr('Todos'), cuantos: filas.length, fija: true, testid: 'rentabilidad-todos' },
                { valor: 'con', etiqueta: tr('Con recaudo'), cuantos: filas.filter(DEL_FILTRO.con).length, testid: 'rentabilidad-con' },
                { valor: 'sin', etiqueta: tr('Sin recaudo'), cuantos: filas.filter(DEL_FILTRO.sin).length, testid: 'rentabilidad-sin' },
                { valor: 'mora', etiqueta: tr('En mora'), cuantos: filas.filter(DEL_FILTRO.mora).length, tono: 'aviso', testid: 'rentabilidad-mora' },
              ]}
            />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={tr('Inmueble, propietario o ciudad')}
              aria-label={tr('Buscar un inmueble')}
              className="w-full lg:w-72"
              data-testid="rentabilidad-buscar"
            />
          </div>
          {!hayValorComercial && totales ? (
            <p className="border-b border-border-faint px-4 py-2.5 text-caption text-fg-muted" data-testid="sin-valor-comercial">
              {tr('La rentabilidad sobre el valor sale cuando registres el valor comercial en la ficha del inmueble.')}
            </p>
          ) : null}

          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
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
                      /* La rentabilidad sólo se puede calcular donde hay valor
                         comercial registrado; el resto de la columna va en
                         raya. Decir cuántos son, aquí, explica la columna antes
                         de que alguien la lea como un error. */
                      {...(col.id === 'rentabilidad' && totales
                        ? {
                            title: t('inmobiliaria.reportes.rentabilidad.stats.withValue', {
                              count: totales.conValor,
                            }),
                          }
                        : {})}
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

            {/* Otro período, ordenar o paginar: las filas entran escalonadas
                y las que sobran salen (paginada: sin `layout`). */}
            <TableBodyAnimado className="max-md:block">
              {pageItems.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={COLUMNAS.length} className="py-10 text-center text-body-sm text-fg-muted max-md:block">
                    {tr('Ningún inmueble coincide con la búsqueda o el filtro.')}
                  </TableCell>
                </TableRow>
              ) : null}
              {pageItems.map((f) => {
                /* 🔴 El respaldo pasó de «tuvo cobro ese mes» a «tuvo CUOTA
                   ese mes» el 2026-09-16 (`RentabilidadOcupacionFuente`): una
                   inmobiliaria migrada no tiene un solo cobro, así que el
                   rótulo «según cobros» nombraba una fuente que no existe. */
                const fuente =
                  f.ocupacionFuente === 'leases'
                    ? t('inmobiliaria.reportes.rentabilidad.table.sourceLeases')
                    : t('inmobiliaria.reportes.rentabilidad.table.sourceCuotas');
                const detalleOcupacion = `${formatearPct(f.ocupacionPct, locale)} ${fuente} · ${t(
                  'inmobiliaria.reportes.rentabilidad.table.vacantDays',
                  { dias: f.diasVacantes },
                )}`;
                return (
                  <TableRowAnimada
                    key={f.consignacionId}
                    onClick={() => router.push(fichaDe(f))}
                    className="cursor-pointer transition-colors hover:bg-muted/40 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                    data-testid="fila-de-rentabilidad"
                  >
                    <TableCell className="max-w-[260px] max-md:col-start-1 max-md:row-start-1 max-md:block max-md:max-w-none max-md:p-0">
                      <Link
                        href={fichaDe(f)}
                        onClick={(e) => e.stopPropagation()}
                        className="block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate font-medium text-fg">
                          {f.propertyTitle}
                          {f.codigo != null && (
                            <span className="ml-1.5 font-mono text-caption text-fg-muted">#{f.codigo}</span>
                          )}
                        </span>
                        <span className="block truncate text-caption text-fg-muted">{f.propietarioNombre}</span>
                      </Link>
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums max-md:hidden">
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
                    <TableCell title={detalleOcupacion} className="max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0">
                      <div className="flex items-center gap-2 max-md:justify-end">
                        <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-fg">
                          {formatearPct(f.ocupacionPct, locale)}
                        </span>
                        <Barra pct={f.ocupacionPct} />
                      </div>
                    </TableCell>
                    <TableCell
                      numeric
                      className="whitespace-nowrap max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-left"
                      title={`${formatearPct(f.tasaDeRecaudoPct, locale)} ${rotuloDeLaTasa} · ${formatCurrency(f.enMoraCop)} en mora`}
                    >
                      <div className="flex flex-col items-end gap-1 max-md:items-start">
                        <span className="font-mono text-sm tabular-nums text-fg">
                          {f.recaudadoCop === 0 && f.esperadoCop === 0 ? (
                            <span className="text-fg-subtle">—</span>
                          ) : (
                            <>
                              {formatCurrency(f.recaudadoCop)}
                              <span className="text-fg-muted"> / {formatCurrency(f.esperadoCop)}</span>
                            </>
                          )}
                        </span>
                        <Barra pct={f.tasaDeRecaudoPct} className={f.enMoraCop > 0 ? 'bg-warning' : undefined} />
                      </div>
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums text-fg-muted max-md:hidden">
                      {plataOGuion(f.comisionCop)}
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums text-fg-muted max-md:hidden">
                      {plataOGuion(f.gastosMantenimientoCop)}
                    </TableCell>
                    <TableCell
                      numeric
                      className={`whitespace-nowrap font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right ${netoDelPropietario(f.netoPropietarioCop).clase}`}
                      title={netoDelPropietario(f.netoPropietarioCop).explicacion ?? undefined}
                    >
                      {f.netoPropietarioCop === 0 ? (
                        <span className="text-fg-subtle">—</span>
                      ) : (
                        netoDelPropietario(f.netoPropietarioCop, formatCurrency).texto
                      )}
                      <span className="hidden text-caption text-fg-muted max-md:block">{tr('neto')}</span>
                    </TableCell>
                    {hayValorComercial ? (
                    <TableCell numeric className="whitespace-nowrap font-mono tabular-nums max-md:hidden">
                      {f.rentabilidadNetaAnualPct === null ? (
                        <span className="text-fg-muted" title={t('inmobiliaria.reportes.rentabilidad.table.noValue')}>
                          —
                        </span>
                      ) : (
                        formatearPct(f.rentabilidadNetaAnualPct, locale)
                      )}
                    </TableCell>
                    ) : null}
                  </TableRowAnimada>
                );
              })}
            </TableBodyAnimado>

            {totales && (
              <TableFooter className="max-md:hidden">
                <TableRow data-testid="fila-de-totales">
                  <TableCell className="font-mono text-caption uppercase tracking-[0.04em] text-fg-subtle">
                    {t('inmobiliaria.reportes.rentabilidad.table.totals')}
                    <span className="ml-1.5 normal-case tracking-normal text-fg-muted">
                      · {t('inmobiliaria.reportes.rentabilidad.stats.properties', { count: totales.inmuebles })}
                    </span>
                  </TableCell>
                  <TableCell numeric />
                  <TableCell className="font-mono text-caption tabular-nums text-fg">
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
                  <TableCell
                    numeric
                    className={`whitespace-nowrap font-mono tabular-nums ${netoDelPropietario(totales.netoPropietarioCop).clase}`}
                    title={netoDelPropietario(totales.netoPropietarioCop).explicacion ?? undefined}
                  >
                    {netoDelPropietario(totales.netoPropietarioCop, formatCurrency).texto}
                  </TableCell>
                  {hayValorComercial ? <TableCell numeric /> : null}
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
        {/* Gráfico: con menos de cinco inmuebles con neto no compara nada (revisora r24 #7). */}
        {cuantosEnElGrafico(filas) >= MINIMO_PARA_EL_GRAFICO ? (
        <section className="rounded-lg border border-border bg-card overflow-hidden" data-testid="seccion-del-grafico">
          <div className="border-b border-border p-5">
            <h2 className="text-base font-medium text-fg">
              {/* Cuenta sólo los que dejaron neto: los que quedan en $0 no tienen barra. */}
              {cuantosEnElGrafico(filas) > 0
                ? t('inmobiliaria.reportes.rentabilidad.chart.title', { n: cuantosEnElGrafico(filas) })
                : t('inmobiliaria.reportes.rentabilidad.chart.titleEmpty')}
            </h2>
            <p className="mt-0.5 text-caption text-fg-muted">
              {t('inmobiliaria.reportes.rentabilidad.chart.subtitle')}
            </p>
          </div>
          <div className="p-4">
            <GraficoDeRentabilidad filas={filas} />
          </div>
        </section>
        ) : null}

        {report && report.notas.length > 0 && (
          <section className="space-y-1.5 px-1" data-testid="notas-del-reporte">
            <p className="font-mono text-label font-medium uppercase tracking-[0.08em] text-fg-subtle">
              {t('inmobiliaria.reportes.rentabilidad.notes')}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-caption text-fg-muted">
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
