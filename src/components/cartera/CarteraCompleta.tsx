'use client'

/**
 * La cartera entera en una pantalla, discriminada por edad de la deuda.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El dato ya se calculaba: `GET /inmobiliaria/reports/cartera` devuelve cada
 * deuda con sus días de mora y, aparte, los casos en siniestro. Pero en
 * pantalla vivía dentro de Reportes → una pestaña avanzada → una sub-pestaña,
 * y ahí el adaptador la cortaba con `.slice(0, 10)`. Con 1.200 contratos se
 * veían diez.
 *
 * ── Cómo se lee (glow-up, Nico 2026-09-03: «no se entiende, no se ve la
 *    tabla, esos botones Por deuda / Por propietario me imagino que son un
 *    tab para la tabla») ───────────────────────────────────────────────────
 *
 *   1. Cinco fichas por edad (Por vencer · 1–30 · 31–60 · 61–90 · +90). Cada
 *      una es un filtro: la cifra y la lista son lo mismo.
 *   2. UNA franja de resumen: En mora · Por vencer · En siniestro · Total.
 *   3. UNA tarjeta con LA tabla de la casa. En su barra: el agrupador
 *      (Por deuda · Por propietario · En siniestro) y la búsqueda. Tocar un
 *      propietario abre sus deudas; el filtro queda como chip.
 *
 * ── Lo que la pantalla se niega a hacer ─────────────────────────────────────
 *
 * 1. **Sumar «por vencer» dentro de la mora.** El back agrupa por
 *    `daysLate <= 30`, y lo que aún no vence tiene `daysLate = 0`. Acá van
 *    separados: plata que va a entrar no es plata que hay que ir a buscar.
 * 2. **Sumar los siniestros a la mora.** Ya no son cobranza, son reclamación
 *    a la aseguradora; van en su propio segmento y en su propia cifra.
 * 3. **Pintar un error como una cartera vacía.** «Nadie te debe nada» y «no
 *    pudimos preguntar» se ven idénticos si se muestra la misma pantalla.
 * 4. **Decir «sin resultados» cuando lo que hay es un filtro puesto.** Son dos
 *    vacíos distintos y se resuelven distinto.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CurrencyCircleDollar, MagnifyingGlass, ShieldWarning, Users, X } from '@phosphor-icons/react'
import { SegmentedControl, type SegmentedOption } from '@leasefy/cadence'

import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { CarteraTable } from '@/components/cartera/CarteraTable'
import { TablaDeSiniestros } from '@/components/cartera/EnSiniestro'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useCarteraReport } from '@/lib/hooks/useInmobiliaria'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type { CarteraItem } from '@/lib/types/inmobiliaria'
import {
  discriminar,
  filtrarCartera,
  filtrarPropietarios,
  porPropietario,
  EDADES,
  NOMBRE_DE_EDAD,
  QUE_SIGNIFICA,
  type DeudaDePropietario,
  type Edad,
} from '@/lib/cartera/edades'
import { cn } from '@/lib/utils'

type Vista = 'deudas' | 'propietarios' | 'siniestros'

const TONO: Record<Edad, string> = {
  por_vencer: 'text-fg-muted',
  '1-30': 'text-fg',
  '31-60': 'text-warning',
  '61-90': 'text-warning',
  '90+': 'text-danger',
}

const COLUMNAS_POR_PROPIETARIO = 5

interface PropietarioElegido {
  id: string | null
  nombre: string
}

export function CarteraCompleta() {
  const { report, isLoading, error, errorCrudo, refetch } = useCarteraReport()
  const [edad, setEdad] = useState<Edad | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<Vista>('deudas')
  const [propietario, setPropietario] = useState<PropietarioElegido | null>(null)
  const router = useRouter()

  const items = useMemo<CarteraItem[]>(() => report?.items ?? [], [report])
  const siniestros = report?.siniestros ?? null

  // Las fichas y la franja hablan de TODA la cartera, no de lo filtrado: si
  // se achicaran con el filtro, dejarían de servir para elegir el filtro.
  const cartera = useMemo(() => discriminar(items), [items])

  const deudas = useMemo(
    () =>
      filtrarCartera(items, {
        edad,
        busqueda,
        propietarioId: propietario ? propietario.id : undefined,
      }),
    [items, edad, busqueda, propietario],
  )
  const propietarios = useMemo(
    () => filtrarPropietarios(porPropietario(filtrarCartera(items, { edad })), busqueda),
    [items, edad, busqueda],
  )
  const casos = useMemo(
    () => filtrarCartera(siniestros?.items ?? [], { busqueda }),
    [siniestros, busqueda],
  )

  /*
   * Paginado en cliente, con el hook que ya usan Agenda e Inquilinos: el
   * reporte llega entero (una fila por cobro) y el recorte es de presentación.
   * `resetKey` manda a la página 1 cuando cambia un filtro — sin eso, elegir
   * un tramo estando en la página 4 deja la tabla en blanco y se lee como
   * «no hay nada». Tres hooks porque son tres listas de forma distinta.
   */
  const clave = `${vista}|${edad ?? ''}|${busqueda}|${propietario ? (propietario.id ?? 'null') : ''}`
  const pagDeudas = useTablePagination(deudas, { resetKey: clave })
  const pagPropietarios = useTablePagination(propietarios, { resetKey: clave })
  const pagCasos = useTablePagination(casos, { resetKey: clave })
  const pag =
    vista === 'deudas' ? pagDeudas : vista === 'propietarios' ? pagPropietarios : pagCasos

  const hayBusqueda = busqueda.trim().length > 0
  const hayFiltros =
    vista === 'siniestros'
      ? hayBusqueda
      : vista === 'propietarios'
        ? hayBusqueda || Boolean(edad)
        : hayBusqueda || Boolean(edad) || propietario !== null

  const limpiar = () => {
    setEdad(null)
    setBusqueda('')
    setPropietario(null)
  }

  const elegirTramo = (t: Edad) => {
    setEdad(edad === t ? null : t)
    // Las fichas son edades de la deuda; los siniestros no tienen edad acá.
    if (vista === 'siniestros') setVista('deudas')
  }

  const abrirPropietario = (p: DeudaDePropietario) => {
    setPropietario({ id: p.propietarioId, nombre: p.propietarioName })
    setVista('deudas')
  }

  const segmentos: SegmentedOption<Vista>[] = [
    { value: 'deudas', label: 'Por deuda' },
    { value: 'propietarios', label: 'Por propietario' },
    ...(siniestros
      ? [
          {
            value: 'siniestros' as const,
            label: siniestros.cantidad > 0 ? `En siniestro · ${siniestros.cantidad}` : 'En siniestro',
          },
        ]
      : []),
  ]

  /*
   * Cargando → falló → contenido, en ese orden y con el componente de la casa.
   *
   * Va por FUERA de los tramos a propósito: una cartera pintada en $0 mientras
   * todavía se está preguntando afirma «nadie te debe nada», que es lo
   * contrario de «no pudimos preguntar». `isLoading && !report` deja pasar el
   * refresco de fondo sin blanquear lo que ya se está viendo.
   */
  return (
    <EstadoDeDatos
      cargando={isLoading && !report}
      error={error ? (errorCrudo ?? new Error(error)) : null}
      queEs="la cartera"
      onReintentar={refetch}
      esqueleto={
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Las fichas por edad. Cada una es un filtro. ──────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Edad de la deuda">
          {cartera.tramos.map((t) => {
            const activa = edad === t.edad && vista !== 'siniestros'
            return (
              <button
                key={t.edad}
                type="button"
                onClick={() => elegirTramo(t.edad)}
                aria-pressed={activa}
                data-testid={`tramo-${t.edad}`}
                className={cn(
                  'rounded-lg border bg-surface p-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activa
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:border-fg-subtle',
                )}
              >
                <p className="text-xs text-fg-muted">{NOMBRE_DE_EDAD[t.edad]}</p>
                <p className={cn('mt-1 font-mono text-lg font-semibold tabular-nums', TONO[t.edad])}>
                  {formatCurrency(t.monto)}
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {t.items.length} {t.items.length === 1 ? 'deuda' : 'deudas'}
                </p>
              </button>
            )
          })}
        </div>

        {edad && vista !== 'siniestros' ? (
          <p className="text-sm text-fg-muted" data-testid="que-significa">
            {QUE_SIGNIFICA[edad]}{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-fg"
              onClick={() => setEdad(null)}
            >
              Ver toda la cartera
            </button>
          </p>
        ) : null}

        {/* ── UNA franja de resumen. ───────────────────────────────────── */}
        <div
          className={cn(
            'grid grid-cols-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface',
            'lg:divide-y-0 lg:divide-x',
            siniestros ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
          )}
          data-testid="resumen-de-cartera"
        >
          <div className="p-4" data-testid="resumen-en-mora">
            <p className="text-xs text-fg-muted">En mora</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {formatCurrency(cartera.enMora)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {cartera.deudasEnMora}{' '}
              {cartera.deudasEnMora === 1 ? 'deuda vencida' : 'deudas vencidas'}
            </p>
          </div>
          <div className="p-4" data-testid="resumen-por-vencer">
            <p className="text-xs text-fg-muted">Por vencer</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg-muted">
              {formatCurrency(cartera.porVencer)}
            </p>
            {/* Se dice explícito: si no, se lee como mora y la infla. */}
            <p className="mt-0.5 text-xs text-fg-muted">Todavía no es mora</p>
          </div>
          {siniestros ? (
            /* La cifra abre el segmento: es el mismo dato, visto de cerca. */
            <button
              type="button"
              onClick={() => setVista('siniestros')}
              className="p-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              data-testid="resumen-en-siniestro"
            >
              <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                <ShieldWarning className="h-3.5 w-3.5" aria-hidden="true" />
                En siniestro
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-danger">
                {formatCurrency(siniestros.totalCop)}
              </p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {siniestros.cantidad === 0
                  ? 'Ningún caso'
                  : `${siniestros.cantidad} ${siniestros.cantidad === 1 ? 'caso' : 'casos'}`}
                {' · '}a los {siniestros.diasParaSiniestro} días de mora
              </p>
            </button>
          ) : null}
          <div className="p-4" data-testid="resumen-total">
            <p className="text-xs text-fg-muted">Total pendiente</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {formatCurrency(cartera.total)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">Mora más por vencer, sin siniestros</p>
          </div>
        </div>

        {/* ── LA tabla, sin título encima: no se nombran las tablas. ───── */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl<Vista>
              size="sm"
              aria-label="Agrupar la cartera"
              value={vista}
              onChange={setVista}
              options={segmentos}
            />
            <div className="flex items-center gap-2">
              {propietario && vista === 'deudas' ? (
                <button
                  type="button"
                  onClick={() => setPropietario(null)}
                  className="inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs text-fg hover:border-fg-subtle"
                  data-testid="chip-propietario"
                >
                  <span className="truncate">{propietario.nombre}</span>
                  <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Quitar el filtro por propietario</span>
                </button>
              ) : null}
              <div className="relative w-full sm:w-72">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Inquilino, inmueble o propietario"
                  aria-label="Buscar en la cartera"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  data-testid="buscar-cartera"
                />
              </div>
            </div>
          </div>

          {vista === 'deudas' ? (
            <CarteraTable
              items={pagDeudas.pageItems}
              onVerCobro={(i) => router.push(`/panel/inmobiliaria/cobros?cobro=${i.cobroId}`)}
              vacio={
                /* Dos vacíos distintos: no deber nada es una buena noticia; no
                   encontrar nada con un filtro puesto se arregla quitándolo. Lo
                   decide `hayFiltros`, que sale del estado real de los filtros
                   y no de que la lista haya quedado corta. */
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon="cobros"
                  icono={CurrencyCircleDollar}
                  titulo="Nadie te debe nada"
                  descripcion="No hay cobros pendientes ni vencidos en toda la cartera."
                  onLimpiarFiltros={hayFiltros ? limpiar : undefined}
                />
              }
            />
          ) : vista === 'propietarios' ? (
            <TablaPorPropietario
              propietarios={pagPropietarios.pageItems}
              onAbrir={abrirPropietario}
              vacio={
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon="propietarios con deuda"
                  icono={Users}
                  titulo="Nadie te debe nada"
                  descripcion="Ningún propietario tiene cobros pendientes."
                  onLimpiarFiltros={hayFiltros ? limpiar : undefined}
                />
              }
            />
          ) : siniestros ? (
            <TablaDeSiniestros
              items={pagCasos.pageItems}
              diasParaSiniestro={siniestros.diasParaSiniestro}
              hayFiltros={hayFiltros}
              onLimpiarFiltros={hayFiltros ? limpiar : undefined}
            />
          ) : null}

          {/* Pie: sólo si hay filas. */}
          {pag.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={pag.total}
                page={pag.page}
                pageSize={pag.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={pag.setPage}
                onPageSizeChange={pag.setPageSize}
              />
            </div>
          )}
        </section>
      </div>
    </EstadoDeDatos>
  )
}

/**
 * La cartera por propietario.
 *
 * Es la pregunta que la inmobiliaria hace de verdad: no «cuánto se debe», sino
 * «a quién le estoy quedando mal». Un propietario con cuatro inmuebles en mora
 * se va — y eso no se ve en una lista ordenada por monto de cada deuda.
 * Tocar la fila abre SUS deudas en «Por deuda».
 */
function TablaPorPropietario({
  propietarios,
  onAbrir,
  vacio,
}: {
  propietarios: readonly DeudaDePropietario[]
  onAbrir: (p: DeudaDePropietario) => void
  vacio: React.ReactNode
}) {
  return (
    <Table data-testid="propietarios-tabla">
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Propietario</TableHead>
          <TableHead className="whitespace-nowrap text-right">Deudas</TableHead>
          <TableHead className="whitespace-nowrap text-right">Inmuebles</TableHead>
          <TableHead className="whitespace-nowrap">Lo peor</TableHead>
          <TableHead className="whitespace-nowrap text-right">Saldo total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {propietarios.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMNAS_POR_PROPIETARIO} className="p-0">
              {vacio}
            </TableCell>
          </TableRow>
        ) : (
          propietarios.map((p) => (
            <TableRow
              key={p.propietarioId ?? '__sin_propietario__'}
              onClick={() => onAbrir(p)}
              className="cursor-pointer"
              data-testid="propietario-fila"
            >
              <TableCell className={cn('font-medium', p.propietarioId ? 'text-fg' : 'text-warning')}>
                {p.propietarioName}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-fg-muted">{p.deudas}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-fg-muted">{p.inmuebles}</TableCell>
              <TableCell className="whitespace-nowrap">
                <span className={cn('text-sm', TONO[p.peorEdad])}>{NOMBRE_DE_EDAD[p.peorEdad]}</span>
              </TableCell>
              <TableCell className="text-right font-mono font-medium tabular-nums text-fg">
                {formatCurrency(p.monto)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export { EDADES }
