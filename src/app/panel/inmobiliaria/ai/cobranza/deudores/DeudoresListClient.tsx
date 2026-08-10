'use client'

/**
 * DeudoresListClient — Phase 31 plan 31-08 (COBR-UI-02).
 *
 * Implements:
 *  - D-31-13 multi-select stage + channel chips, days-in-stage range, search
 *  - D-31-14 default sort label "Más estancados primero" (server enforces)
 *  - D-31-15 paginado con cursor del backend, presentado con el paginador
 *    canónico del panel (`TablePagination`): era la única lista con scroll
 *    infinito, y se leía distinto a todas las demás.
 *  - D-31-08 mask rendering for all PII at list level
 *  - ?stage=S3 / ?stage=S2,S3 querystring prefill
 *  - Filtros en UNA sola barra dentro de la Card, que envuelve en pantallas
 *    angostas (antes había una copia en un cajón para móvil).
 *
 * Does NOT wire the PIIRevealModal — that lands in 31-10.
 * Does NOT render raw cédula / phone / email anywhere.
 */

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { CARTERA_STAGES, type CarteraStage } from '@/lib/cartera'
import { useDebtorList } from '@/lib/hooks/cobranza/use-debtor-list'
import { hashCedulaPrefix } from '@/lib/cobranza/hash-cedula-prefix'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { CobranzaImportCard } from '@/components/inmobiliaria/cobranza/CobranzaImportCard'
import { CobranzaDeudoresListSkeleton } from '@/components/skeleton/panel/CobranzaDeudoresListSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
// `Badge` sale del ADAPTADOR local, no de Cadence crudo: el crudo es h-5/11px
// y su variante `info` es hex fijo que no sigue el modo oscuro. Es el mismo
// Badge que usan las otras tablas del panel.
import { Button, Input, Badge } from '@/components/ui'
import { Card } from '@leasefy/cadence'
import { Chip, RangeSlider } from '@leasefy/cadence'
import { ETAPAS_ES } from '@/lib/cobranza/acuerdo-general-vocab'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

void React

type Channel = 'voice' | 'whatsapp' | 'email'
const CHANNELS: Channel[] = ['voice', 'whatsapp', 'email']

const DAYS_MIN_DEFAULT = 0
const DAYS_MAX_DEFAULT = 90

// Tailwind tokens for days-in-stage badge — D-31 spec: green ≤3, amber 4-7, red ≥8
// (semantic status tints vía tokens del DS — contrato §8)
// `destructive` es el nombre del adaptador local para el `danger` del DS.
function daysBadgeVariant(days: number): 'success' | 'warning' | 'destructive' {
  if (days <= 3) return 'success'
  if (days <= 7) return 'warning'
  return 'destructive'
}

/**
 * El canal en español. El back devuelve además `mixed` —más de un canal en
 * juego— que no está en la lista de filtros y salía crudo en la tabla: la
 * columna decía «mixed» en las 45 filas.
 */
function etiquetaDeCanal(
  canal: string,
  t: (k: never) => string,
): string {
  if (canal === 'mixed') return 'Varios'
  const conocido = (CHANNELS as string[]).includes(canal)
  if (!conocido) return canal
  return t(`inmobiliaria.ai.cobranza.deudores.channels.${canal}` as never)
}

export default function DeudoresListClient() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Filter state ──────────────────────────────────────────────────────────
  const initialStages = useMemo<CarteraStage[]>(() => {
    const raw = searchParams.get('stage')
    if (!raw) return []
    const allowed = new Set<string>(CARTERA_STAGES)
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => allowed.has(s)) as CarteraStage[]
  }, [searchParams])

  const [stages, setStages] = useState<CarteraStage[]>(initialStages)
  const [channels, setChannels] = useState<Channel[]>([])
  const [daysMin, setDaysMin] = useState<number>(DAYS_MIN_DEFAULT)
  const [daysMax, setDaysMax] = useState<number>(DAYS_MAX_DEFAULT)
  const [searchInput, setSearchInput] = useState<string>('')
  // Ya no hay `filtersDrawerOpen`: los filtros son UNA sola barra que envuelve.
  // Antes había una copia en un cajón para móvil, con dos definiciones de los
  // mismos chips que podían separarse con cualquier cambio.

  // ── Debounced + hash-aware search value sent to the hook ──────────────────
  const [searchPayload, setSearchPayload] = useState<string>('')
  const [searchHint, setSearchHint] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (!trimmed) {
      setSearchHint(null)
      const id = setTimeout(() => setSearchPayload(''), 250)
      return () => clearTimeout(id)
    }
    // Numeric-only path
    if (/^\d+$/.test(trimmed)) {
      if (trimmed.length < 4) {
        setSearchHint(t('inmobiliaria.ai.cobranza.deudores.searchMinChars'))
        return
      }
      setSearchHint(null)
      const id = setTimeout(async () => {
        try {
          const hex = await hashCedulaPrefix(trimmed)
          setSearchPayload(`HEX:${hex}`)
        } catch {
          setSearchPayload('')
        }
      }, 250)
      return () => clearTimeout(id)
    }
    // Name path
    setSearchHint(null)
    const id = setTimeout(() => setSearchPayload(trimmed), 250)
    return () => clearTimeout(id)
  }, [searchInput, t])

  // ── Build hook filters ────────────────────────────────────────────────────
  const filters = useMemo(
    () => ({
      stage: stages.length > 0 ? stages.join(',') : undefined,
      channel: channels.length > 0 ? channels.join(',') : undefined,
      daysMin: daysMin > DAYS_MIN_DEFAULT ? daysMin : undefined,
      daysMax: daysMax < DAYS_MAX_DEFAULT ? daysMax : undefined,
      search: searchPayload || undefined,
    }),
    [stages, channels, daysMin, daysMax, searchPayload],
  )

  const { pages, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } =
    useDebtorList(filters)

  // ── Skeleton + EmptyState guards (Phase 38 plan 38-04a / D-38-04) ─────────
  // hasActiveFilters distinguishes "filtered empty" (Sin deudores con estos filtros)
  // from zero-portfolio (Aún no hay deudores → CTA to import). The page-level
  // EmptyState only fires when no filters are active and the list is genuinely empty.
  const hasActiveFilters =
    stages.length > 0 ||
    channels.length > 0 ||
    daysMin !== DAYS_MIN_DEFAULT ||
    daysMax !== DAYS_MAX_DEFAULT ||
    searchPayload.length > 0

  // ── Paginado ──────────────────────────────────────────────────────────────
  //
  // Esta lista era la única del panel con scroll infinito. La fuente sigue
  // siendo un cursor del backend, así que el paginador recorta lo que YA está
  // cargado y pide la página siguiente cuando el usuario se acerca al final de
  // lo traído. Así se ve igual que las demás tablas sin mentir sobre el total:
  // el pie dice lo que hay, y `hasMore` avisa que puede haber más.
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(pages, {
    resetKey: `${stages.join(',')}|${channels.join(',')}|${daysMin}-${daysMax}|${searchPayload}`,
  })

  // Al pararse en la última página cargada, se trae la siguiente. Sin esto el
  // paginador se quedaría clavado en lo que vino en la primera respuesta.
  useEffect(() => {
    if (!hasMore || isLoadingMore) return
    if (page * pageSize >= pages.length) void loadMore()
  }, [page, pageSize, pages.length, hasMore, isLoadingMore, loadMore])

  // El centinela de scroll infinito se fue con el paginador: quien pide la
  // página siguiente ahora es el propio paginador, al llegar al final de lo
  // cargado. Dejarlo habría disparado `loadMore()` dos veces por la misma fila.

  if (isLoading && pages.length === 0) return <CobranzaDeudoresListSkeleton />

  if (
    !isLoading &&
    !hasActiveFilters &&
    pages.length === 0 &&
    !error
  ) {
    return (
      <main className="p-6 lg:p-8 space-y-4">
        <EmptyState
          icon={Users}
          title={t('inmobiliaria.ai.cobranza.deudores.empty.title')}
          description={t('inmobiliaria.ai.cobranza.deudores.empty.description')}
        />
        {/* Importar cartera — cableada al endpoint POST /cartera/import.
            FAIL-SOFT: si el backend no está desplegado (404/red), el card
            degrada a "Próximamente — requiere despliegue" sin romper. Tras un
            import exitoso refrescamos la lista para salir del empty state. */}
        <CobranzaImportCard onImported={() => void refetch()} />
      </main>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleStage = (s: CarteraStage) => {
    setStages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }
  const toggleChannel = (c: Channel) => {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }
  const clearFilters = () => {
    setStages([])
    setChannels([])
    setDaysMin(DAYS_MIN_DEFAULT)
    setDaysMax(DAYS_MAX_DEFAULT)
    setSearchInput('')
    setSearchPayload('')
  }
  const navigateToDebtor = (id: string) => {
    router.push(`/panel/inmobiliaria/ai/cobranza/deudores/${id}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  //
  // Anatomía canónica del panel (la misma de Acuerdos, Pagos, Llamadas, Cartas
  // y Siniestros):
  //
  //   Card
  //    ├─ barra de filtros   (border-b)
  //    ├─ tabla              (overflow-x-auto)
  //    └─ pie                (border-t)
  //
  // Antes los filtros vivían en una columna suelta a la izquierda, fuera de
  // toda tarjeta, y la tabla flotaba al lado. Era la única pantalla del panel
  // armada así.
  const contador = `${total}${hasMore ? '+' : ''} ${total === 1 ? 'caso' : 'casos'}`

  return (
    <main className="p-6 lg:p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {t('inmobiliaria.ai.cobranza.deudores.title')}
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {t('inmobiliaria.ai.cobranza.deudores.subtitle')}
        </p>
      </header>

      <Card>
        {/* ── Barra de filtros ──────────────────────────────────────────── */}
        <div className="border-b border-border px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1 max-w-sm">
              <label htmlFor="debtor-search" className="sr-only">
                {t('inmobiliaria.ai.cobranza.deudores.filters.search.label')}
              </label>
              <Input
                id="debtor-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('inmobiliaria.ai.cobranza.deudores.filters.search.placeholder')}
              />
              {searchHint && <p className="text-xs text-warning mt-1">{searchHint}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className="text-xs font-medium text-fg-muted whitespace-nowrap"
                data-testid="sort-label"
              >
                {t('inmobiliaria.ai.cobranza.deudores.sort.daysInStageDesc')}
              </span>
              <span className="text-xs text-fg-muted tabular-nums">{contador}</span>
            </div>
          </div>

          {/* Los filtros son los mismos en toda anchura: una sola definición,
              que envuelve. Antes había una copia en un cajón para móvil, con el
              riesgo de que las dos se separaran. */}
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <fieldset className="flex items-center gap-2 flex-wrap">
              <legend className="sr-only">
                {t('inmobiliaria.ai.cobranza.deudores.filters.stage')}
              </legend>
              <span className="text-xs font-medium text-fg-muted">
                {t('inmobiliaria.ai.cobranza.deudores.filters.stage')}
              </span>
              {CARTERA_STAGES.map((s) => (
                <Chip
                  key={s}
                  size="sm"
                  selected={stages.includes(s)}
                  onClick={() => toggleStage(s)}
                  data-testid={`stage-chip-${s}`}
                  // El código no dice nada solo: el nombre va en el título para
                  // quien no se sabe la taxonomía de memoria.
                  title={ETAPAS_ES[s]}
                >
                  {s}
                </Chip>
              ))}
            </fieldset>

            <fieldset className="flex items-center gap-2 flex-wrap">
              <legend className="sr-only">
                {t('inmobiliaria.ai.cobranza.deudores.filters.channel')}
              </legend>
              <span className="text-xs font-medium text-fg-muted">
                {t('inmobiliaria.ai.cobranza.deudores.filters.channel')}
              </span>
              {CHANNELS.map((c) => (
                <Chip
                  key={c}
                  size="sm"
                  selected={channels.includes(c)}
                  onClick={() => toggleChannel(c)}
                >
                  {t(`inmobiliaria.ai.cobranza.deudores.channels.${c}` as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </fieldset>

            <fieldset className="flex items-center gap-2">
              <legend className="sr-only">
                {t('inmobiliaria.ai.cobranza.deudores.filters.daysInStage')}
              </legend>
              <span className="text-xs font-medium text-fg-muted whitespace-nowrap">
                {t('inmobiliaria.ai.cobranza.deudores.filters.daysInStage')}
              </span>
              <span className="text-xs text-fg-muted tabular-nums whitespace-nowrap">
                {daysMin}–{daysMax}
              </span>
              <div className="w-32">
                <RangeSlider
                  min={DAYS_MIN_DEFAULT}
                  max={DAYS_MAX_DEFAULT}
                  value={[daysMin, daysMax]}
                  onValueChange={([lo, hi]) => {
                    setDaysMin(lo)
                    setDaysMax(hi)
                  }}
                  showLabels={false}
                  aria-label={t('inmobiliaria.ai.cobranza.deudores.filters.daysInStage')}
                />
              </div>
            </fieldset>

            {/* Sólo aparece cuando hay algo que limpiar: un botón que no hace
                nada enseña a ignorar los botones. */}
            {hasActiveFilters && (
              <Button
                variant="link"
                size="sm"
                onClick={clearFilters}
                hideArrow
                className="px-0 h-auto"
              >
                {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
              </Button>
            )}
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 flex-wrap border-b border-border bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <span>
              {t('inmobiliaria.ai.cobranza.deudores.error')}: {error}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="shrink-0 underline underline-offset-2 hover:no-underline"
            >
              {t('inmobiliaria.ai.cobranza.deudores.errorRetry')}
            </button>
          </div>
        )}

        {/* ── Vacío filtrado — DENTRO de la tarjeta, no flotando ────────── */}
        {!isLoading && pages.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Users className="w-7 h-7 text-fg-muted" weight="duotone" aria-hidden="true" />
            <p className="text-sm font-medium text-fg">
              {t('inmobiliaria.ai.cobranza.deudores.emptyFiltered')}
            </p>
            <p className="text-xs text-fg-muted max-w-sm">
              Ningún caso cumple con los filtros puestos. Quitá alguno para ver
              el resto de la cartera.
            </p>
            <Button variant="outline" size="sm" hideArrow className="mt-2" onClick={clearFilters}>
              {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
            </Button>
          </div>
        ) : (
          <>
            {/* ── Tabla (md+) ───────────────────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto overscroll-contain">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.name')}</TableHead>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.stage')}</TableHead>
                    <TableHead className="text-right">
                      {t('inmobiliaria.ai.cobranza.deudores.columns.daysInStage')}
                    </TableHead>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.cedula')}</TableHead>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.phone')}</TableHead>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.email')}</TableHead>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.channel')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((d) => (
                    <TableRow
                      key={d.id}
                      data-testid={`caso-${d.id}`}
                      onClick={() => navigateToDebtor(d.id)}
                      role="link"
                      tabIndex={0}
                      aria-label={`Ver el caso de ${d.fullName}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigateToDebtor(d.id)
                      }}
                      className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <TableCell className="text-fg whitespace-nowrap font-medium">
                        {d.fullName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" title={ETAPAS_ES[d.currentStage]}>
                          {d.currentStage}
                        </Badge>
                      </TableCell>
                      {/* Números a la derecha y tabulares: es la columna por la
                          que está ordenada la tabla, se compara de un vistazo. */}
                      <TableCell className="text-right">
                        <Badge variant={daysBadgeVariant(d.daysInStage)}>{d.daysInStage}</Badge>
                      </TableCell>
                      <TableCell>
                        <Mask field="cedula" value={d.cedulaMasked} />
                      </TableCell>
                      <TableCell>
                        <Mask field="phone" value={d.phoneMasked} />
                      </TableCell>
                      <TableCell>
                        <Mask field="email" value={d.emailMasked} />
                      </TableCell>
                      <TableCell className="text-xs text-fg-muted">
                        {etiquetaDeCanal(d.channel, t)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ── Tarjetas (sm) ─────────────────────────────────────────── */}
            <ul className="md:hidden divide-y divide-border">
              {pageItems.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => navigateToDebtor(d.id)}
                    className="w-full min-h-11 text-left px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-fg truncate">{d.fullName}</p>
                      <Badge variant="outline" title={ETAPAS_ES[d.currentStage]}>
                        {d.currentStage}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={daysBadgeVariant(d.daysInStage)}>
                        {d.daysInStage} {t('inmobiliaria.ai.cobranza.deudores.columns.daysInStage')}
                      </Badge>
                      <Mask field="cedula" value={d.cedulaMasked} />
                    </div>
                    <p className="text-xs text-fg-muted mt-1.5">
                      {etiquetaDeCanal(d.channel, t)}
                      {d.lastActivityAt
                        ? ` · ${new Date(d.lastActivityAt).toLocaleDateString(locale)}`
                        : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Pie: el paginador del design system, igual que las demás ──── */}
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

        {/* Trayendo la página siguiente del cursor. No es un estado vacío ni un
            error: son filas que todavía no llegaron. */}
        {isLoadingMore && (
          <div className="border-t border-border px-4 py-2 text-center text-xs text-fg-muted">
            {t('inmobiliaria.ai.cobranza.deudores.loadingMore')}
          </div>
        )}
      </Card>
    </main>
  )
}
