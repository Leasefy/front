'use client'

/**
 * PagosFunnelClient — Phase 32 plan 32-07 (COBR-UI-05).
 *
 * Operator funnel for `cobranza/pagos`:
 *  - Tira de 6 indicadores, en el orden del recorrido de la plata:
 *    por cobrar → en proceso → aprobados → rechazados → recaudado → desembolsado
 *  - Date-window selector (today / 7d / 30d (default) / 90d / mtd)
 *  - Multi-select chip filters (provider, estado)
 *  - Sortable table (created_at DESC default, amount DESC, disbursement_pending_days DESC)
 *  - ⚠ pill when disbursementPendingDays >= 3 (nunca sobre una obligación:
 *    no se demora el desembolso de una plata que no entró)
 *  - Row click → /pagos/planes/{planId} (pending + payment_plan) or /pagos/{paymentId}
 *  - <Mask> wraps every debtor name; no raw PII in DOM
 *  - Paginación numerada (el scroll infinito se cambió por páginas)
 *
 * El vocabulario de estados vive en `@/lib/cobranza/pago-vocab` — ahí está
 * explicado por qué una obligación importada no es un pago pendiente.
 */

import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { CurrencyCircleDollar, Funnel, MagnifyingGlass } from '@phosphor-icons/react'
import { useTr } from '@/lib/i18n/use-tr'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { DetalleDelPagoEnCajon } from './[paymentId]/PaymentDetailClient'

import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBodyAnimado,
  TableRow,
  TableHead,
  TableCell,
  TableRowAnimada,
} from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { fechaCorta, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import { AnimatedNumber, Card, Chip, CrossFade, Presence } from '@leasefy/cadence'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import {
  usePaymentsFunnel,
  type UsePaymentsFunnelFilters,
  type PaymentsFunnelItem,
  type PaymentsFunnelKpis,
  type PaymentsFunnelSort,
} from '@/lib/hooks/cobranza/use-payments-funnel'
import {
  ESTADOS_VISIBLES,
  ESTADO_A_FILTRO,
  estadoBadgeVariant,
  estadoVisible,
  type EstadoVisible,
} from '@/lib/cobranza/pago-vocab'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

void React

type Provider = 'wompi' | 'bold'
type DateWindow = NonNullable<UsePaymentsFunnelFilters['dateWindow']>

const PROVIDERS: Provider[] = ['wompi', 'bold']
const DATE_WINDOWS: DateWindow[] = ['today', '7d', '30d', '90d', 'mtd']

/**
 * Columnas de la tabla: nombre · monto · proveedor · estado · desembolso · fecha.
 * Lo usan el esqueleto y el `colSpan` del vacío; con un número suelto en cada
 * lado, quitar una columna dejaba el esqueleto y el mensaje descuadrados.
 */
const COLUMNAS = 6

const copFormat = plataEnPantalla(localeDeLasCifras, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

function providerBadgeVariant(provider: Provider): 'default' | 'secondary' {
  return provider === 'wompi' ? 'default' : 'secondary'
}

/** Sin tildes ni mayúsculas, para buscar «garcia» y encontrar «García». */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export default function PagosFunnelClient() {
  const { t } = useI18n()
  const tr = useTr()
  const router = useRouter()
  // Revisora r25 (#2): buscar por inquilino; (#3): el detalle en un cajón.
  const [buscar, setBuscar] = useState('')
  const [pagoAbierto, setPagoAbierto] = useState<string | null>(null)

  // ── Filter state ──────────────────────────────────────────────────────────
  const [dateWindow, setDateWindow] = useState<DateWindow>('30d')
  const [providers, setProviders] = useState<Provider[]>([])
  const [statuses, setStatuses] = useState<EstadoVisible[]>([])
  const [sort, setSort] = useState<PaymentsFunnelSort>('created_at')

  // ── Hook filters ──────────────────────────────────────────────────────────
  const filters = useMemo<UsePaymentsFunnelFilters>(
    () => ({
      provider: providers.length > 0 ? providers.join(',') : undefined,
      status:
        statuses.length > 0
          ? statuses.map((s) => ESTADO_A_FILTRO[s]).join(',')
          : undefined,
      dateWindow,
      sort,
    }),
    [providers, statuses, dateWindow, sort],
  )

  const { rows, kpis, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } =
    usePaymentsFunnel(filters)

  // El endpoint no busca: se filtra lo cargado. Al quedar una sola página, el
  // paginador pide el tramo siguiente (efecto de abajo), así que la búsqueda
  // termina recorriendo todos los pagos del período. Para Víctor: un `q` en
  // GET /cobranza/pagos lo haría del lado del servidor.
  const q = normalizar(buscar)
  const filas = useMemo(
    () => (q ? rows.filter((r) => normalizar(r.debtor.fullName ?? '').includes(q)) : rows),
    [rows, q],
  )

  // ── Paginación ────────────────────────────────────────────────────────────
  //
  // Páginas numeradas, igual que Llamadas y Cartas, en vez del scroll infinito
  // que había: un paginador dice cuántos pagos hay y deja volver a una página,
  // dos cosas que el scroll infinito no permite.
  //
  // El endpoint pagina por cursor del lado del servidor, así que se recorta en
  // memoria lo YA cargado y se pide el siguiente tramo al llegar a la última
  // página. Las dos mecánicas conviven sin pelearse.
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(filas, {
    resetKey: `${providers.join(',')}|${statuses.join(',')}|${dateWindow}|${sort}|${q}`,
  })

  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => {
    if (page >= lastPage && hasMore && !isLoadingMore) {
      void loadMore()
    }
  }, [page, lastPage, hasMore, isLoadingMore, loadMore])

  // Phase 38-05a: hasActiveFilters discriminates between "no payments yet"
  // (page-level EmptyState with CTA) and "no payments match these filters"
  // (existing inline emptyFiltered branch — preserves filter controls).
  const hasActiveFilters =
    providers.length > 0 || statuses.length > 0 || dateWindow !== '30d' || sort !== 'created_at'

  // Phase 38-05a: dashboard skeleton during initial fetch (before any KPI lands).
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // pagos, → vacío); lo que ya estaba al montarse no se anima.
  if (isLoading && rows.length === 0 && !kpis) {
    return (
      <CrossFade swapKey="esqueleto">
        <PageSkeleton variant="dashboard" />
      </CrossFade>
    )
  }

  // Phase 38-05a: page-level EmptyState only when zero results AND no filters
  // are active. With filters, the inline emptyFiltered branch (line ~394)
  // keeps the chip controls reachable so the operator can clear filters.
  if (!isLoading && !error && rows.length === 0 && !hasActiveFilters) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.pagos.title')}
          descripcion={t('inmobiliaria.ai.cobranza.pagos.subtitle')}
          className="mb-6"
        />
        <EmptyState
          icon={CurrencyCircleDollar}
          title={t('inmobiliaria.ai.cobranza.pagos.empty.title')}
          description={t('inmobiliaria.ai.cobranza.pagos.empty.description')}
          primaryCta={{
            label: t('inmobiliaria.ai.cobranza.pagos.empty.cta.label'),
            href: '/panel/inmobiliaria/pagos/cobranza/deudores',
          }}
        />
      </div>
      </CrossFade>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleProvider = (p: Provider) => {
    setProviders((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }
  const toggleStatus = (s: EstadoVisible) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }
  const clearFilters = () => {
    setProviders([])
    setStatuses([])
    setDateWindow('30d')
    setSort('created_at')
  }
  const handleRowClick = (row: PaymentsFunnelItem) => {
    // Phase 32 contract: pending + payment_plan rows route to the plan approval page;
    // all other rows route to the read-only payment detail page.
    if (row.status === 'pending' && row.paymentPlanId) {
      router.push(`/panel/inmobiliaria/pagos/cobranza/pagos/planes/${row.paymentPlanId}`)
    } else {
      // El detalle se mira en un cajón, sin perder la lista ni los filtros.
      setPagoAbierto(row.id)
    }
  }

  // ── KPI strip render helper ───────────────────────────────────────────────
  //
  // El orden sigue el recorrido de la plata: lo que se debe → lo que está en
  // camino → lo que se confirmó o se cayó → lo que entró → lo que se giró.
  //
  // Ya NO está «Comisión promedio»: lo calculaba sobre `payments.fee_amount`,
  // una columna que no escribe ningún writer del agente (ni el webhook de la
  // pasarela, que ni siquiera lee la comisión del payload). Un «—» fijo se
  // leía como «no hubo comisión». Para reponerla hay que empezar por el
  // writer, no por la tarjeta.
  // LA RESPUESTA arriba (lo que falta por cobrar) y, debajo, cuatro cifras en
  // el recorrido de la plata: en camino → confirmado (y lo que se cayó, en su
  // línea) → lo que entró → lo que se giró. Antes eran seis del mismo peso.
  // LA RESPUESTA, dentro de la tarjeta (C3): lo que falta por cobrar, sobre la
  // barra del recorrido de la plata —por cobrar · entró y falta girar · girado—
  // en pesos (revisora r25, Pagos #1: «cinco cifras, ninguna con barra»). Los
  // conteos de pagos en camino van en UNA línea debajo, no como cifras.
  const renderKpis = (k: PaymentsFunnelKpis | null) => {
    const porCobrar = k?.porCobrarCop ?? 0
    const recaudado = k?.totalRecaudadoCop ?? 0
    const girado = Math.min(k?.totalDisbursedCop ?? 0, recaudado)
    const porGirar = Math.max(0, recaudado - girado)
    const total = porCobrar + recaudado
    const obligaciones = k
      ? k.porCobrarCount === 1
        ? t('inmobiliaria.ai.cobranza.pagos.kpi.porCobrarHintOne')
        : t('inmobiliaria.ai.cobranza.pagos.kpi.porCobrarHint', { count: k.porCobrarCount })
      : null
    return (
      <div className="border-b border-border px-4 py-5 sm:px-6">
        <CrossFade swapKey={isLoading && !k ? 'cargando' : 'cifra'}>
          {isLoading && !k ? (
            <div className="space-y-2" aria-hidden="true">
              <span className="block h-3 w-24 animate-pulse rounded bg-surface-muted" />
              <span className="block h-9 w-56 animate-pulse rounded bg-surface-muted" />
              <span className="block h-2 w-full animate-pulse rounded-full bg-surface-muted" />
            </div>
          ) : (
            <CifraHeroe
              data-testid="pagos-kpi-por-cobrar"
              rotulo={t('inmobiliaria.ai.cobranza.pagos.kpi.porCobrar')}
              cifra={<AnimatedNumber value={porCobrar} format={formatCop} />}
              contexto={
                total > porCobrar
                  ? tr('de {total} del período · {obligaciones}', { total: formatCop(total), obligaciones: obligaciones ?? '' })
                  : obligaciones
              }
              total={total}
              cuandoEsCero={tr('Nada por cobrar ni recaudado en este período.')}
              tramos={[
                { clave: 'por-cobrar', etiqueta: tr('Por cobrar'), monto: porCobrar, tono: 'aviso', cifra: formatCop(porCobrar), siempre: true },
                {
                  clave: 'por-girar',
                  etiqueta: tr('Entró, falta girar'),
                  monto: porGirar,
                  tono: 'neutro',
                  cifra: formatCop(porGirar),
                  siempre: true,
                  'data-testid': 'pagos-kpi-recaudado',
                },
                {
                  clave: 'girado',
                  etiqueta: t('inmobiliaria.ai.cobranza.pagos.kpi.disbursed'),
                  monto: girado,
                  tono: 'exito',
                  cifra: formatCop(girado),
                  siempre: true,
                  'data-testid': 'pagos-kpi-disbursed',
                },
              ]}
              pie={
                k ? (
                  <span>
                    <span data-testid="pagos-kpi-en-proceso">
                      {tr('{n} en proceso', { n: k.enProcesoCount })}
                    </span>
                    {' · '}
                    <span data-testid="pagos-kpi-approved">
                      {k.approvedCount === 1 ? tr('1 aprobado') : tr('{n} aprobados', { n: k.approvedCount })}
                    </span>
                    {k.declinedCount > 0 ? (
                      <>
                        {' · '}
                        {k.declinedCount === 1 ? tr('1 rechazado') : tr('{n} rechazados', { n: k.declinedCount })}
                      </>
                    ) : null}
                    {' · '}
                    {tr('Total recaudado {monto}', { monto: formatCop(recaudado) })}
                  </span>
                ) : undefined
              }
            />
          )}
        </CrossFade>
      </div>
    )
  }

  const cuantosFiltros = providers.length + statuses.length

  return (
    <CrossFade swapKey="pagos">
    <div className="p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.pagos.title')}
        descripcion={t('inmobiliaria.ai.cobranza.pagos.subtitle')}
        className="mb-6"
      />

      {/*
        Una sola tarjeta: la respuesta, la barra de herramientas, la tabla y el
        pie de paginación (C3: la cifra va DENTRO de la tarjeta que filtra).
      */}
      <Card className="overflow-hidden">
      {renderKpis(kpis)}

      {/*
        UNA fila: buscar por inquilino · período · orden · «Filtros (n)» con la
        pasarela y el estado (revisora r25 #2: eran dos renglones de chips).
      */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <label htmlFor="pagos-buscar" className="sr-only">
            {tr('Buscar por inquilino')}
          </label>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input
            id="pagos-buscar"
            type="search"
            className="pl-9"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder={tr('Buscar por inquilino')}
            data-testid="pagos-buscar"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Select value={dateWindow} onValueChange={(v) => setDateWindow(v as DateWindow)}>
            <SelectTrigger
              aria-label={t('inmobiliaria.ai.cobranza.pagos.dateWindow.label')}
              data-testid="pagos-periodo-select"
              className="h-9 w-auto gap-1 text-body-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_WINDOWS.map((w) => (
                <SelectItem key={w} value={w}>
                  {t(`inmobiliaria.ai.cobranza.pagos.dateWindow.${w}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as PaymentsFunnelSort)}>
            <SelectTrigger
              aria-label={t('inmobiliaria.ai.cobranza.pagos.sort.label')}
              data-testid="pagos-sort-select"
              className="h-9 w-auto gap-1 text-body-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">
                {t('inmobiliaria.ai.cobranza.pagos.sort.createdAt')}
              </SelectItem>
              <SelectItem value="amount">
                {t('inmobiliaria.ai.cobranza.pagos.sort.amountDesc')}
              </SelectItem>
              <SelectItem value="disbursement_pending_days">
                {t('inmobiliaria.ai.cobranza.pagos.sort.disbursementPendingDays')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" hideArrow className="shrink-0" data-testid="pagos-filtros">
                <Funnel className="h-4 w-4" aria-hidden="true" />
                {tr('Filtros')}
                {cuantosFiltros > 0 ? (
                  <span className="font-mono text-caption tabular-nums">({cuantosFiltros})</span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-4 p-4">
              <fieldset className="space-y-2">
                <legend className="text-caption font-medium text-fg-muted">
                  {t('inmobiliaria.ai.cobranza.pagos.filter.provider')}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {PROVIDERS.map((p) => (
                    <Chip
                      key={p}
                      size="sm"
                      selected={providers.includes(p)}
                      onClick={() => toggleProvider(p)}
                      data-testid={`pagos-provider-chip-${p}`}
                    >
                      {t(`inmobiliaria.ai.cobranza.pagos.filter.${p}`)}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-caption font-medium text-fg-muted">
                  {t('inmobiliaria.ai.cobranza.pagos.filter.status')}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_VISIBLES.map((st) => (
                    <Chip
                      key={st}
                      size="sm"
                      selected={statuses.includes(st)}
                      onClick={() => toggleStatus(st)}
                      data-testid={`pagos-status-chip-${ESTADO_A_FILTRO[st]}`}
                    >
                      {t(`inmobiliaria.ai.cobranza.pagos.status.${st}`)}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </PopoverContent>
          </Popover>
          {/* Sólo cuando hay algo que limpiar: un botón que no hace nada es ruido. */}
          <Presence show={hasActiveFilters || q !== ''} direction="none" initial={false}>
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={() => {
                clearFilters()
                setBuscar('')
              }}
              className="h-auto shrink-0 px-0"
            >
              {t('inmobiliaria.ai.cobranza.pagos.filter.clear')}
            </Button>
          </Presence>
        </div>
      </div>

      {/* Error banner */}
      {/* C5 (r25): FalloDeCarga, nunca el error crudo pegado a la frase. */}
      <Presence show={Boolean(error)} className="border-b border-border">
          <FalloDeCarga error={falloDelTexto(error)} queEs="los pagos" onReintentar={() => refetch()} enmarcado={false} />
      </Presence>

      {/* Table */}
        <div className="overflow-x-auto max-md:overflow-visible">
        <Table className="max-md:block">
          <TableHeader className="max-md:hidden">
            <TableRow>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.nombre')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-fg"
                onClick={() => setSort('amount')}
                data-testid="pagos-th-monto"
              >
                {t('inmobiliaria.ai.cobranza.pagos.columns.monto')}
                {sort === 'amount' && <span className="ml-1">↓</span>}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.provider')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.status')}
              </TableHead>
              {/* El endpoint ya mandaba `disbursementState` y nadie lo mostraba,
                  en la pantalla que se llama «funnel de pagos y desembolsos». */}
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.disbursement')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-fg"
                onClick={() => setSort('created_at')}
                data-testid="pagos-th-fecha"
              >
                {t('inmobiliaria.ai.cobranza.pagos.columns.fecha')}
                {sort === 'created_at' && <span className="ml-1">↓</span>}
              </TableHead>
            </TableRow>
          </TableHeader>
          {/* Filtrar o paginar: las filas entran escalonadas (techo 320 ms) y las que sobran salen. */}
          <TableBodyAnimado className="max-md:block">
            {isLoading && rows.length === 0 && (
              Array.from({ length: 5 }, (_, i) => (
                <TableRowAnimada key={`pagos-skel-${i}`} className="animate-pulse">
                  {Array.from({ length: COLUMNAS }, (_, j) => (
                    <TableCell key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-surface-muted rounded" />
                    </TableCell>
                  ))}
                </TableRowAnimada>
              ))
            )}
            {!isLoading && rows.length > 0 && filas.length === 0 && (
              <TableRowAnimada key="sin-coincidencias" className="max-md:block">
                <TableCell colSpan={COLUMNAS} className="px-3 py-12 text-center max-md:block">
                  <p className="text-body-sm text-fg-muted" data-testid="pagos-sin-coincidencias">
                    {hasMore
                      ? tr('Buscando «{q}» entre los pagos del período…', { q: buscar.trim() })
                      : tr('Ningún pago de este período es de «{q}».', { q: buscar.trim() })}
                  </p>
                </TableCell>
              </TableRowAnimada>
            )}
            {!isLoading && rows.length === 0 && !error && (
              <TableRowAnimada key="vacio" className="max-md:block">
                <TableCell colSpan={COLUMNAS} className="px-3 py-12 text-center max-md:block">
                  <p className="text-body-sm text-fg-muted">
                    {t('inmobiliaria.ai.cobranza.pagos.emptyFiltered')}
                  </p>
                </TableCell>
              </TableRowAnimada>
            )}
            {pageItems.map((row) => {
              const estado = estadoVisible(row)
              const esObligacion = row.kind === 'obligacion'
              const isPending = row.disbursementPendingDays >= 3
              return (
                <TableRowAnimada
                  key={row.id}
                  data-testid={`pagos-row-${row.id}`}
                  onClick={() => handleRowClick(row)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRowClick(row)
                  }}
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                >
                  <TableCell className="px-3 py-2 whitespace-nowrap max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0 max-md:whitespace-normal">
                    <span className="text-fg">{row.debtor.fullName}</span>
                    <span className="block text-caption text-fg-subtle">
                      <Mask field="cedula" value={row.debtor.cedulaMasked} />
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono tabular-nums text-body-sm text-fg max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                    {formatCop(row.amount)}
                  </TableCell>
                  <TableCell className="px-3 py-2 max-md:hidden">
                    {row.provider ? (
                      <Badge variant={providerBadgeVariant(row.provider)}>
                        {t(`inmobiliaria.ai.cobranza.pagos.filter.${row.provider}`)}
                      </Badge>
                    ) : (
                      // Sin pasarela todavía. Antes esto interpolaba `null` en
                      // la clave y pintaba `…pagos.filter.null` en cada fila.
                      //
                      // Y para una obligación no es «todavía»: nadie intentó
                      // pagarla, así que no hay pasarela pendiente de asignar.
                      <span className="text-caption text-fg-subtle">
                        {t(
                          esObligacion
                            ? 'inmobiliaria.ai.cobranza.pagos.provider.noAplica'
                            : 'inmobiliaria.ai.cobranza.pagos.provider.none',
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={estadoBadgeVariant(estado)}>
                        {t(`inmobiliaria.ai.cobranza.pagos.status.${estado}`)}
                      </Badge>
                      {isPending && (
                        <Badge
                          variant="warning"
                          data-testid={`pagos-pending-pill-${row.id}`}
                          className="gap-1"
                        >
                          {t('inmobiliaria.ai.cobranza.pagos.pill.disbursementPending')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0">
                    {/*
                      No se puede desembolsar una plata que nunca entró: para
                      una obligación este paso no existe. «Sin desembolsar»
                      insinuaba un giro atrasado sobre una deuda sin pagar.
                    */}
                    {esObligacion ? (
                      <span className="text-caption text-fg-subtle">
                        {t('inmobiliaria.ai.cobranza.pagos.disbursement.noAplica')}
                      </span>
                    ) : row.disbursementState === 'settled' ? (
                      <Badge variant="success">
                        {t('inmobiliaria.ai.cobranza.pagos.disbursement.settled')}
                      </Badge>
                    ) : (
                      <span className="text-caption text-fg-muted">
                        {t('inmobiliaria.ai.cobranza.pagos.disbursement.pending')}
                        {row.disbursementPendingDays > 0 && (
                          <span className="text-fg-subtle">
                            {' · '}
                            {t('inmobiliaria.ai.cobranza.pagos.disbursement.days', {
                              days: row.disbursementPendingDays,
                            })}
                          </span>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-caption text-fg-muted whitespace-nowrap max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                    {fechaCorta(diaEnColombia(row.createdAt))}
                  </TableCell>
                </TableRowAnimada>
              )
            })}
          </TableBodyAnimado>
        </Table>
        </div>

        {/* Pie: sólo si hay más de una página — un paginador que no pagina es ruido. */}
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
      </Card>

      <DetalleDelPagoEnCajon paymentId={pagoAbierto} onCerrar={() => setPagoAbierto(null)} />
    </div>
    </CrossFade>
  )
}
