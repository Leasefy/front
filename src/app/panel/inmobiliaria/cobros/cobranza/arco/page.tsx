'use client'

/**
 * Bandeja de solicitudes ARCO — derechos de Habeas Data (Ley 1581 de 2012).
 *
 * Acá caen las solicitudes de las personas cuyos datos trata la inmobiliaria:
 * ver (Acceso), corregir (Rectificación), borrar (Cancelación) o dejar de usar
 * (Oposición). Cada una tiene un término legal en días hábiles, y responder
 * tarde es incumplimiento sancionable — por eso la pantalla ordena por plazo y
 * no por fecha de llegada, y por eso se actualiza sola.
 *
 * Datos: 100% del agente (`GET /api/agency/:id/arco/requests`). Sin mocks.
 * El polling vive en `useArcoRequests`; acá sólo se pinta.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowSquareOut,
  ArrowClockwise,
  CheckCircle,
  Clock,
  Scales,
  ShieldCheck,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  useArcoRequests,
  ARCO_TYPES,
  ARCO_URGENT_THRESHOLD_DAYS,
  type ArcoRequestRow,
  type ArcoRequestType,
  type ArcoSlaTerms,
} from '@/lib/hooks/cobranza/use-arco-requests'
import { ArcoStatusBadge } from '@/components/inmobiliaria/cobranza/ArcoStatusBadge'
import { SlaCountdownBadge } from '@/components/inmobiliaria/cobranza/SlaCountdownBadge'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TablePagination } from '@/components/ui/pagination'
// Piezas que resuelve el design system: no rehacerlas a mano.
import { Banner, Callout, Card, Eyebrow, KpiCard, MonoLabel } from '@leasefy/cadence'

const NS = 'inmobiliaria.ai.arco'

type TabValue = 'all' | ArcoRequestType

const TABS: TabValue[] = ['all', ...ARCO_TYPES]

/**
 * Las filas son altas (dos líneas: tipo + qué significa, nombre + referencia),
 * así que 10 llena la pantalla sin obligar a hacer scroll para llegar al pie.
 */
const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50]

const TYPE_VARIANT: Record<ArcoRequestType, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  acceso: 'default',
  rectificacion: 'secondary',
  cancelacion: 'warning',
  oposicion: 'destructive',
}

// ─── Cabecera explicativa ─────────────────────────────────────────────────────

/**
 * Qué es esta pantalla, en el menor espacio posible. Es una bandeja que se
 * visita poco y con consecuencias legales: quien entra por primera vez no
 * debería tener que preguntar para qué sirve.
 */
function IntroPanel({ terms }: { terms: ArcoSlaTerms }) {
  const { t } = useI18n()

  /**
   * Los plazos NO son una constante del front: se despejan de las solicitudes
   * reales (ver `deriveSlaTerms`). Si no hay ninguna de ese grupo, no hay de
   * dónde sacarlos y la línea no se pinta — antes que inventar un número que
   * la pantalla presentaría como un hecho legal.
   */
  const deadlines: Array<{ key: string; days: number }> = []
  if (terms.acceso != null) deadlines.push({ key: 'deadlineAcceso', days: terms.acceso })
  if (terms.reclamo != null) deadlines.push({ key: 'deadlineReclamo', days: terms.reclamo })

  return (
    <Callout
      icon={<Scales className="h-5 w-5" weight="duotone" aria-hidden="true" />}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
        <div className="min-w-0 flex-1 space-y-2">
          <Eyebrow>{t(`${NS}.intro.eyebrow`)}</Eyebrow>
          <p className="max-w-[62ch] text-sm leading-relaxed text-fg-muted">
            {t(`${NS}.intro.body`)}
          </p>
          <p className="max-w-[62ch] text-sm leading-relaxed text-fg-muted">
            {t(`${NS}.intro.consequence`)}
          </p>
        </div>

        {deadlines.length > 0 && (
          <div className="shrink-0 space-y-2 md:w-64 md:border-l md:border-border md:pl-8">
            <MonoLabel className="text-fg-subtle">
              {t(`${NS}.intro.deadlinesTitle`)}
            </MonoLabel>
            <ul className="space-y-1.5">
              {deadlines.map(({ key, days }) => (
                <li key={key} className="text-sm text-fg-muted">
                  {t(`${NS}.intro.${key}`).replace('{days}', String(days))}
                </li>
              ))}
            </ul>
            <p className="text-xs leading-snug text-fg-subtle">
              {t(`${NS}.intro.deadlinesSource`)}
            </p>
          </div>
        )}
      </div>
    </Callout>
  )
}

// ─── Banda de atención ────────────────────────────────────────────────────────

/**
 * Sólo aparece cuando hay algo que atender. Un banner permanente se vuelve
 * invisible; uno que aparece sólo cuando importa, se lee.
 */
function AttentionBanner({
  overdue,
  urgent,
  onFocus,
}: {
  overdue: number
  urgent: number
  onFocus: () => void
}) {
  const { t } = useI18n()
  if (overdue === 0 && urgent === 0) return null

  const critical = overdue > 0
  const count = critical ? overdue : urgent
  const key = critical
    ? count === 1 ? 'attention.overdueTitle' : 'attention.overdueTitlePlural'
    : count === 1 ? 'attention.urgentTitle' : 'attention.urgentTitlePlural'

  const label = t(`${NS}.${key}`)
    .replace('{count}', String(count))
    .replace('{days}', String(ARCO_URGENT_THRESHOLD_DAYS))

  return (
    <Banner
      role="status"
      variant={critical ? 'danger' : 'warning'}
      icon={
        critical ? (
          <WarningCircle className="h-5 w-5" weight="fill" aria-hidden="true" />
        ) : (
          <Clock className="h-5 w-5" weight="fill" aria-hidden="true" />
        )
      }
    >
      {/* `span`, no `div`: Banner pinta sus children dentro de un `<p>` y un
          bloque ahí es HTML inválido — rompe la hidratación y la pantalla no
          llega a montar. */}
      <span className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium">{label}</span>
        <Button variant="outline" size="sm" hideArrow onClick={onFocus}>
          {t(`${NS}.attention.cta`)}
        </Button>
      </span>
    </Banner>
  )
}

// ─── Indicador de frescura ────────────────────────────────────────────────────

function formatUpdatedAgo(t: (k: string) => string, at: Date | null): string | null {
  if (!at) return null
  const minutes = Math.floor((Date.now() - at.getTime()) / 60_000)
  if (minutes < 1) return t(`${NS}.live.updatedJustNow`)
  if (minutes < 60) return t(`${NS}.live.updatedMinutes`).replace('{count}', String(minutes))
  return t(`${NS}.live.updatedHours`).replace('{count}', String(Math.floor(minutes / 60)))
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

function RequestsTable({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  emptyTitle,
  emptyBody,
}: {
  /** Sólo las filas de la página actual. */
  rows: ArcoRequestRow[]
  /** Total del filtro activo — lo que cuenta el pie, no `rows.length`. */
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  emptyTitle: string
  emptyBody: string
}) {
  const { t } = useI18n()

  if (total === 0) {
    return <EmptyState icon={CheckCircle} title={emptyTitle} description={emptyBody} />
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader className="bg-surface-muted">
          <TableRow>
            <TableHead className="px-4 py-2.5">{t(`${NS}.table.type`)}</TableHead>
            <TableHead className="px-4 py-2.5">{t(`${NS}.table.requester`)}</TableHead>
            <TableHead className="px-4 py-2.5">{t(`${NS}.table.status`)}</TableHead>
            <TableHead className="px-4 py-2.5">{t(`${NS}.table.sla`)}</TableHead>
            <TableHead className="px-4 py-2.5">{t(`${NS}.table.submitted`)}</TableHead>
            <TableHead className="px-4 py-2.5 text-right">{t(`${NS}.table.actions`)}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                'border-t border-border transition-colors hover:bg-surface-muted',
                // Franja izquierda: el estado del plazo se lee sin recorrer la fila.
                row.isOverdue && 'border-l-2 border-l-danger',
                row.isUrgent && 'border-l-2 border-l-warning',
              )}
            >
              <TableCell className="px-4 py-3">
                <Badge variant={TYPE_VARIANT[row.type]}>{t(`${NS}.type.${row.type}`)}</Badge>
                <p className="mt-1 text-xs leading-snug text-fg-subtle">
                  {t(`${NS}.typeMeaning.${row.type}`)}
                </p>
              </TableCell>

              <TableCell className="min-w-[180px] px-4 py-3">
                <p className="text-sm font-medium text-fg">{row.requesterName}</p>
                {/* La cédula sólo existe hasheada; ver `cedulaRef`. */}
                <p
                  className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-fg-subtle"
                  title={t(`${NS}.table.refHint`)}
                >
                  {t(`${NS}.table.ref`)} {row.cedulaRef}
                </p>
              </TableCell>

              <TableCell className="whitespace-nowrap px-4 py-3">
                <ArcoStatusBadge status={row.status} />
              </TableCell>

              <TableCell className="whitespace-nowrap px-4 py-3">
                <SlaCountdownBadge
                  remainingDays={row.slaRemainingDays}
                  isClosed={row.isClosed}
                  isPaused={row.status === 'pending_email_verification'}
                />
              </TableCell>

              <TableCell className="whitespace-nowrap px-4 py-3">
                <span className="font-mono text-xs tabular-nums text-fg-muted">
                  {new Date(row.submittedAt).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </TableCell>

              <TableCell className="whitespace-nowrap px-4 py-3 text-right">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  hideArrow
                  aria-label={t(`${NS}.actions.view`).replace('{name}', row.requesterName)}
                >
                  <Link href={`/panel/inmobiliaria/cobros/cobranza/arco/${row.id}`}>
                    <ArrowSquareOut className="h-4 w-4" weight="regular" aria-hidden="true" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {/* El pie se monta siempre que haya filas —acá arriba ya se devolvió el
          vacío—, aunque entren todas en una página: dice «Mostrando 1–3 de 3» y
          deja elegir cuántas ver (Nico, 2026-09-02). */}
      {total > 0 && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </Card>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function ArcoInboxPage() {
  const { t } = useI18n()
  const {
    requests,
    kpis,
    slaTerms,
    countsByType,
    needsAttention,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refetch,
  } = useArcoRequests()

  const [activeTab, setTab] = useState<TabValue>('all')
  /** Filtro transversal a las pestañas, activado desde la banda de atención. */
  const [onlyAttention, setOnlyAttention] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const filteredRows = useMemo(() => {
    const base = onlyAttention ? needsAttention : requests
    return activeTab === 'all' ? base : base.filter((r) => r.type === activeTab)
  }, [requests, needsAttention, onlyAttention, activeTab])

  /**
   * Página efectiva, acotada al total actual.
   *
   * Hacen falta dos guardas y por motivos distintos:
   *  · cambiar de pestaña o de filtro reduce el total → estando en la página 3
   *    de «Todas», pasar a «Oposición» (2 filas) mostraría una tabla vacía;
   *  · el polling cada minuto puede achicar la lista sin que el usuario toque
   *    nada (alguien resolvió una solicitud) → misma página vacía, pero sin
   *    ninguna acción a la cual reaccionar.
   *
   * Acotar al renderizar cubre ambos casos sin un efecto que persiga al estado.
   */
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const visibleRows = useMemo(
    () => filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRows, safePage, pageSize],
  )

  /** Todo cambio de filtro vuelve a la primera página. */
  const changeTab = (tab: TabValue) => {
    setTab(tab)
    setPage(1)
  }

  const overdueByTab = useMemo(() => {
    const map: Record<TabValue, number> = {
      all: 0, acceso: 0, rectificacion: 0, cancelacion: 0, oposicion: 0,
    }
    for (const r of requests) {
      if (!r.isOverdue) continue
      map.all += 1
      map[r.type] += 1
    }
    return map
  }, [requests])

  const urgentCount = needsAttention.length - kpis.overdue
  const updatedAgo = formatUpdatedAgo(t, lastUpdatedAt)

  // Primera carga: esqueleto. Los refetch posteriores no desmontan la vista.
  if (isLoading && requests.length === 0 && !error) {
    return <PageSkeleton variant="list" />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 text-fg">{t(`${NS}.title`)}</h1>
          <p
            className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle"
            aria-live="polite"
          >
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                isRefreshing ? 'animate-pulse bg-primary' : 'bg-success',
              )}
              aria-hidden="true"
            />
            {isRefreshing
              ? t(`${NS}.live.refreshing`)
              : `${updatedAgo ?? t(`${NS}.live.auto`)} · ${t(`${NS}.live.auto`)}`}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => void refetch()}
          disabled={isRefreshing}
          aria-label={t('common.refresh')}
        >
          <ArrowClockwise
            className={cn('mr-1.5 h-4 w-4', isRefreshing && 'animate-spin')}
            weight="regular"
            aria-hidden="true"
          />
          {t('common.refresh')}
        </Button>
      </div>

      <IntroPanel terms={slaTerms} />

      {/* Error: no reemplaza la tabla — los datos viejos siguen sirviendo. */}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-danger-soft p-3">
          <Warning className="h-5 w-5 shrink-0 text-danger" weight="fill" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">{t(`${NS}.error.load`)}</p>
            <p className="text-xs text-fg-muted">{t(`${NS}.error.loadHint`)}</p>
          </div>
          <Button variant="outline" size="sm" hideArrow onClick={() => void refetch()}>
            {t(`${NS}.error.retry`)}
          </Button>
        </div>
      )}

      <AttentionBanner
        overdue={kpis.overdue}
        urgent={urgentCount}
        onFocus={() => {
          setOnlyAttention(true)
          changeTab('all')
        }}
      />

      {/* KPIs — KpiCard del DS: número mono tabular, tile de icono y elevación
          los resuelve Cadence. `sublabel` explica qué cuenta cada uno. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard
          icon={<WarningCircle className="h-5 w-5 text-danger" weight="duotone" />}
          label={t(`${NS}.kpi.overdue`)}
          sublabel={t(`${NS}.kpi.overdueHint`)}
          value={String(kpis.overdue)}
        />
        <KpiCard
          icon={<ShieldCheck className="h-5 w-5 text-success" weight="duotone" />}
          label={t(`${NS}.kpi.onTime`)}
          sublabel={t(`${NS}.kpi.onTimeHint`)}
          value={String(kpis.onTime)}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-fg-subtle" weight="duotone" />}
          label={t(`${NS}.kpi.pendingVerification`)}
          sublabel={t(`${NS}.kpi.pendingVerificationHint`)}
          value={String(kpis.pendingVerification)}
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5 text-fg-subtle" weight="duotone" />}
          label={t(`${NS}.kpi.closed`)}
          sublabel={t(`${NS}.kpi.closedHint`)}
          value={String(kpis.closed)}
        />
      </div>

      {/* Filtro activo desde la banda de atención */}
      {onlyAttention && (
        <div className="flex items-center gap-2">
          <Badge variant="warning">{t(`${NS}.attention.cta`)}</Badge>
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => {
              setOnlyAttention(false)
              setPage(1)
            }}
          >
            {t('common.all')}
          </Button>
        </div>
      )}

      {/* Pestañas por tipo + tabla */}
      <Tabs value={activeTab} onValueChange={(v) => changeTab(v as TabValue)}>
        <TabsList variant="underline" className="flex-wrap">
          {TABS.map((tab) => {
            const count = tab === 'all' ? requests.length : countsByType[tab]
            const hasOverdue = overdueByTab[tab] > 0
            return (
              <TabsTrigger key={tab} value={tab} className="inline-flex items-center gap-1.5">
                {t(`${NS}.tab.${tab}`)}
                <Badge
                  variant={hasOverdue ? 'destructive' : 'secondary'}
                  className="px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                >
                  {count}
                </Badge>
                {/* El color no puede ser la única señal (DESIGN.md §7). */}
                {hasOverdue && (
                  <span className="sr-only">
                    {t(`${NS}.kpi.overdue`)}: {overdueByTab[tab]}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-4">
          <RequestsTable
            rows={visibleRows}
            total={filteredRows.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            emptyTitle={
              activeTab === 'all' && !onlyAttention
                ? t(`${NS}.empty.title`)
                : t(`${NS}.empty.filteredTitle`)
            }
            emptyBody={
              activeTab === 'all' && !onlyAttention
                ? t(`${NS}.empty.body`)
                : t(`${NS}.empty.filteredBody`).replace(
                    '{type}',
                    activeTab === 'all' ? '' : t(`${NS}.type.${activeTab}`).toLowerCase(),
                  )
            }
          />
        </div>
      </Tabs>
    </div>
  )
}
