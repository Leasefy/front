'use client'

/**
 * La cartera de los inquilinos, por mes y por concepto.
 *
 * ── El pedido, textual (Nico, 2026-09-12) ───────────────────────────────────
 *
 * «Nicolás debe 3 meses; esos meses ya generaron intereses y gasto
 * administrativo según la regla de cobro. Quiero ver cuánto debe POR MES,
 * cuánto EN TOTAL, y dividido por CONCEPTO: canon, intereses, gasto
 * administrativo.»
 *
 * Por eso la tabla tiene dos niveles y no dos tablas: la fila del inquilino es
 * el TOTAL (por concepto), y al abrirla aparecen sus MESES (por concepto). Los
 * tres números que pidió están en la misma línea de lectura, uno debajo del
 * otro, sin cambiar de pantalla.
 *
 * ── Qué dicen las columnas ──────────────────────────────────────────────────
 *
 * Lo que se DEBE, no lo facturado: un abono ya imputado (intereses primero,
 * después el capital — art. 1653 C. C.) baja la columna que pagó. Lo facturado
 * y lo abonado van aparte, a la derecha, para que el número grande no se
 * confunda con «lo que se le cobró».
 *
 * Las columnas son «las que existan» (Nico): el back manda sólo los conceptos
 * que aparecen en alguna fila. Una inmobiliaria sin gasto administrativo no ve
 * una columna vacía.
 *
 * ── Lo que la pantalla se niega a hacer ─────────────────────────────────────
 *
 * 1. **Cuadrar a la fuerza.** Si las columnas no suman el saldo, la diferencia
 *    se muestra en «Sin desglose» y la fila se marca. En la agencia de QA hay
 *    un cobro con la línea de interés escrita dos veces (3.202 + 3.202 contra
 *    un `lateFee` de 3.202): la cartera tiene que delatarlo, no promediarlo.
 * 2. **Sumar lo que no vence a la mora.** Plata que va a entrar no es plata
 *    que hay que ir a buscar; van en cifras distintas de la franja.
 * 3. **Pintar un error como una cartera vacía.** «Nadie te debe nada» y «no
 *    pudimos preguntar» se ven idénticos si se muestra la misma pantalla.
 * 4. **Cambiar el pie cuando hay filtro.** El pie suma LO QUE SE VE; la franja
 *    de arriba habla de toda la cartera. Si el pie repitiera el total general
 *    dejaría de corresponder a las filas de encima.
 */

import { useMemo, useState } from 'react'
import { CaretDown, CaretRight, CurrencyCircleDollar, MagnifyingGlass, Warning } from '@phosphor-icons/react'

import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { TablePagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useCarteraDeInquilinos } from '@/lib/hooks/use-cartera'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { mesEnTitulo } from '@/lib/utils/mes'
import type {
  FilaDeCarteraDelInquilino,
  InquilinoEnCartera,
  PorConcepto,
  TipoDeConcepto,
  TotalesDeCartera,
} from '@/lib/api/cartera.types'
import {
  NOMBRE_DEL_CONCEPTO,
  cuadra,
  filtrarInquilinos,
  saldoDe,
  sumarTotales,
} from '@/lib/cartera/conceptos'
import { cn } from '@/lib/utils'

/**
 * La columna del saldo queda PEGADA al borde derecho.
 *
 * Con cinco o seis conceptos la tabla mide más que el ancho útil del panel y
 * scrollea; medido en el navegador con los datos de QA, «Debe» —el número por
 * el que se abre la pantalla— quedaba fuera de la vista. Pegada, el desglose
 * se recorre y la respuesta nunca se va. Necesita fondo OPACO propio: si no,
 * las columnas pasan por debajo y se leen encima.
 */
const FIJA = 'sticky right-0 z-10 border-l border-border';

/** Un cero no se escribe `$0` en cada celda: la tabla se vuelve ilegible. */
function Peso({ valor, className }: { valor: number; className?: string }) {
  if (valor === 0) {
    return (
      <span className="text-fg-subtle" aria-label="cero">
        —
      </span>
    )
  }
  return (
    <span className={cn('font-mono tabular-nums', valor < 0 && 'text-fg-muted', className)}>
      {formatCurrency(valor)}
    </span>
  )
}

/**
 * Lo abonado, debajo del saldo y no en columna propia.
 *
 * Es el mismo criterio de `CarteraTable`: un dato que explica a otro viaja
 * dentro de su celda. Con once conceptos posibles, cada columna que se ahorra
 * es una que no obliga a scrollear horizontalmente para llegar a lo que la
 * pantalla vino a responder. Lo facturado del total está en la franja.
 */
function Abono({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  return (
    <span className="mt-0.5 block text-xs font-normal text-fg-muted">
      abonó <span className="font-mono tabular-nums">{formatCurrency(valor)}</span>
    </span>
  )
}

export function CarteraPorConcepto() {
  const { datos, cargando, error, recargar } = useCarteraDeInquilinos()
  const [busqueda, setBusqueda] = useState('')
  const [soloEnMora, setSoloEnMora] = useState(false)
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set())

  const conceptos = useMemo<TipoDeConcepto[]>(() => datos?.conceptos ?? [], [datos])
  const inquilinos = useMemo(
    () => filtrarInquilinos(datos?.inquilinos ?? [], busqueda, soloEnMora),
    [datos, busqueda, soloEnMora],
  )
  const totalesDeLoVisible = useMemo(() => sumarTotales(inquilinos), [inquilinos])

  const hayFiltros = busqueda.trim().length > 0 || soloEnMora
  const paginado = useTablePagination(inquilinos, {
    resetKey: `${busqueda}|${soloEnMora}`,
  })

  // La columna sólo existe si alguien la necesita: es la diferencia que no
  // cuadra, y en una cartera sana no hay ninguna.
  const haySinDesglose = (datos?.totales.sinDesgloseCop ?? 0) !== 0

  const alternar = (clave: string) =>
    setAbiertos((previos) => {
      const siguiente = new Set(previos)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })

  const limpiar = () => {
    setBusqueda('')
    setSoloEnMora(false)
  }

  /** Inquilino + conceptos + (sin desglose) + «Debe». */
  const columnas = conceptos.length + (haySinDesglose ? 3 : 2)

  return (
    <EstadoDeDatos
      cargando={cargando && !datos}
      error={error}
      queEs="la cartera por concepto"
      onReintentar={recargar}
      esqueleto={
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── La franja: toda la cartera, no lo filtrado. ────────────── */}
        <div
          className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-4 lg:divide-x lg:divide-y-0"
          data-testid="resumen-por-concepto"
        >
          <div className="p-4">
            <p className="text-xs text-fg-muted">Total pendiente</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {formatCurrency(datos?.totales.saldoCop ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {datos?.totales.cobros ?? 0} {datos?.totales.cobros === 1 ? 'cobro' : 'cobros'} ·{' '}
              {datos?.inquilinos.length ?? 0}{' '}
              {datos?.inquilinos.length === 1 ? 'inquilino' : 'inquilinos'}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-fg-muted">En mora</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-danger">
              {formatCurrency(datos?.totales.enMoraCop ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">Pasado el plazo del contrato</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-fg-muted">Por vencer</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg-muted">
              {formatCurrency(datos?.totales.porVencerCop ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">Todavía no es mora</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-fg-muted">Abonado</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {formatCurrency(datos?.totales.abonadoCop ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Sobre {formatCurrency(datos?.totales.facturadoCop ?? 0)} facturados
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-fg">
              <Switch
                checked={soloEnMora}
                onCheckedChange={setSoloEnMora}
                aria-label="Ver sólo a quienes están en mora"
                data-testid="solo-en-mora"
              />
              Sólo en mora
            </label>
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Inquilino, documento, contrato o inmueble"
                aria-label="Buscar en la cartera"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="buscar-por-concepto"
              />
            </div>
          </div>

          <Table data-testid="tabla-por-concepto">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Inquilino</TableHead>
                {conceptos.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap text-right">
                    {NOMBRE_DEL_CONCEPTO[c]}
                  </TableHead>
                ))}
                {haySinDesglose ? (
                  <TableHead className="whitespace-nowrap text-right">Sin desglose</TableHead>
                ) : null}
                <TableHead className={cn('whitespace-nowrap text-right', FIJA, 'bg-bg dark:bg-surface-muted')}>
                  Debe
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginado.pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnas} className="p-0">
                    <SinDatos
                      hayFiltros={hayFiltros}
                      queSon="inquilinos con deuda"
                      icono={CurrencyCircleDollar}
                      titulo="Nadie te debe nada"
                      descripcion="No hay cobros pendientes ni vencidos en toda la cartera."
                      onLimpiarFiltros={hayFiltros ? limpiar : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginado.pageItems.map((inquilino) => (
                  <FilasDelInquilino
                    key={inquilino.clave}
                    inquilino={inquilino}
                    conceptos={conceptos}
                    haySinDesglose={haySinDesglose}
                    abierto={abiertos.has(inquilino.clave)}
                    onAlternar={() => alternar(inquilino.clave)}
                  />
                ))
              )}
            </TableBody>
            {paginado.pageItems.length > 0 ? (
              <TableFooter>
                <TotalesEnPie
                  totales={totalesDeLoVisible}
                  conceptos={conceptos}
                  haySinDesglose={haySinDesglose}
                  etiqueta={hayFiltros ? 'Total de lo filtrado' : 'Total de la cartera'}
                />
              </TableFooter>
            ) : null}
          </Table>

          {paginado.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={paginado.total}
                page={paginado.page}
                pageSize={paginado.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={paginado.setPage}
                onPageSizeChange={paginado.setPageSize}
              />
            </div>
          )}
        </section>

        {datos ? (
          <p className="text-xs text-fg-muted">
            Los conceptos salen de las líneas de cada cobro; lo que se abona se imputa primero a
            los intereses y después al capital. Leído contra el {datos.hoy}.
          </p>
        ) : null}
      </div>
    </EstadoDeDatos>
  )
}

/** La fila del inquilino (su total) y, si está abierta, la de cada mes. */
function FilasDelInquilino({
  inquilino,
  conceptos,
  haySinDesglose,
  abierto,
  onAlternar,
}: {
  inquilino: InquilinoEnCartera
  conceptos: readonly TipoDeConcepto[]
  haySinDesglose: boolean
  abierto: boolean
  onAlternar: () => void
}) {
  const Caret = abierto ? CaretDown : CaretRight
  return (
    <>
      {/* `group`: la celda fija tiene fondo propio y si no, no se entera del
          hover de su fila y queda un rectángulo blanco al pasar el mouse. */}
      <TableRow className="group" data-testid="fila-inquilino">
        <TableCell>
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierto}
            className="flex items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Caret className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
            <span>
              <span className="block font-medium text-fg">
                {inquilino.nombre ?? 'Sin nombre en el contrato'}
              </span>
              <span className="block text-xs text-fg-muted">
                {inquilino.documento ? `CC ${inquilino.documento} · ` : ''}
                {inquilino.filas.length} {inquilino.filas.length === 1 ? 'mes' : 'meses'}
                {inquilino.contratos.length > 1
                  ? ` · ${inquilino.contratos.length} contratos`
                  : inquilino.contratos[0]?.contrato
                    ? rotuloDelContrato(inquilino.contratos[0])
                    : ''}
              </span>
            </span>
          </button>
        </TableCell>
        <CeldasDeConceptos
          porConcepto={inquilino.totales.saldoPorConcepto}
          conceptos={conceptos}
          fuerte
        />
        {haySinDesglose ? (
          <TableCell className="text-right">
            <Peso valor={inquilino.totales.sinDesgloseCop} />
          </TableCell>
        ) : null}
        <TableCell
          className={cn(
            'bg-surface text-right font-medium text-fg group-hover:bg-surface-muted',
            FIJA,
          )}
        >
          <Peso valor={inquilino.totales.saldoCop} />
          <Abono valor={inquilino.totales.abonadoCop} />
        </TableCell>
      </TableRow>

      {abierto
        ? inquilino.filas.map((fila) => (
            <FilaDelMes
              key={fila.cobroId}
              fila={fila}
              conceptos={conceptos}
              haySinDesglose={haySinDesglose}
            />
          ))
        : null}
    </>
  )
}

/**
 * « · contrato 1686 · Leasefy #1839» en un migrado, « · contrato #94» en un
 * nativo: el número que la inmobiliaria conoce primero, y el nuestro rotulado
 * para que se sepa cuál es cuál (Nico se asustó con un «#1839» pelado).
 */
export function rotuloDelContrato(c: {
  contrato: string | null
  contratoDeLeasefy?: string | null
}): string {
  if (!c.contrato) return ''
  return c.contratoDeLeasefy
    ? ` · contrato ${c.contrato} · ${c.contratoDeLeasefy}`
    : ` · contrato ${c.contrato}`
}

function FilaDelMes({
  fila,
  conceptos,
  haySinDesglose,
}: {
  fila: FilaDeCarteraDelInquilino
  conceptos: readonly TipoDeConcepto[]
  haySinDesglose: boolean
}) {
  return (
    <TableRow className="bg-surface-muted" data-testid="fila-mes">
      <TableCell className="pl-10">
        <span className="block text-sm text-fg">{mesEnTitulo(fila.month)}</span>
        <span className="block text-xs text-fg-muted">
          {fila.inmueble}
          {fila.contrato ? rotuloDelContrato(fila) : ''}
        </span>
        <span className="mt-0.5 block text-xs">
          {fila.enSiniestro ? (
            <span className="text-danger">En siniestro</span>
          ) : fila.enMora ? (
            <span className="text-danger">
              {fila.diasDeMora} {fila.diasDeMora === 1 ? 'día' : 'días'} de mora
            </span>
          ) : (
            <span className="text-fg-muted">Vence el {fila.vence}</span>
          )}
          {!cuadra(fila) ? (
            <span className="ml-2 inline-flex items-center gap-1 text-warning">
              <Warning className="h-3 w-3" aria-hidden="true" />
              Las líneas de este cobro no suman su saldo
            </span>
          ) : null}
        </span>
      </TableCell>
      <CeldasDeConceptos porConcepto={fila.saldoPorConcepto} conceptos={conceptos} />
      {haySinDesglose ? (
        <TableCell className="text-right">
          <Peso valor={fila.sinDesgloseCop} />
        </TableCell>
      ) : null}
      <TableCell className={cn('bg-surface-muted text-right text-fg', FIJA)}>
        <Peso valor={fila.saldoCop} />
        <Abono valor={fila.abonadoCop} />
      </TableCell>
    </TableRow>
  )
}

function CeldasDeConceptos({
  porConcepto,
  conceptos,
  fuerte = false,
}: {
  porConcepto: PorConcepto
  conceptos: readonly TipoDeConcepto[]
  fuerte?: boolean
}) {
  return (
    <>
      {conceptos.map((c) => (
        <TableCell key={c} className="text-right">
          <Peso valor={saldoDe(porConcepto, c)} className={fuerte ? 'text-fg' : undefined} />
        </TableCell>
      ))}
    </>
  )
}

function TotalesEnPie({
  totales,
  conceptos,
  haySinDesglose,
  etiqueta,
}: {
  totales: TotalesDeCartera
  conceptos: readonly TipoDeConcepto[]
  haySinDesglose: boolean
  etiqueta: string
}) {
  return (
    <TableRow data-testid="totales-por-concepto">
      <TableCell className="font-medium text-fg">{etiqueta}</TableCell>
      <CeldasDeConceptos porConcepto={totales.saldoPorConcepto} conceptos={conceptos} fuerte />
      {haySinDesglose ? (
        <TableCell className="text-right">
          <Peso valor={totales.sinDesgloseCop} />
        </TableCell>
      ) : null}
      <TableCell className={cn('text-right font-semibold text-fg', FIJA, 'bg-bg dark:bg-surface-muted')}>
        <Peso valor={totales.saldoCop} />
        <Abono valor={totales.abonadoCop} />
      </TableCell>
    </TableRow>
  )
}
