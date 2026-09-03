'use client'

/**
 * Llamadas — registro global de contactos del agente de cobranza.
 *
 * Qué muestra y por qué:
 *
 * La tabla vieja tenía canal, duración, hora, QA y un contador de alertas.
 * Nada de eso responde la pregunta con la que uno entra a esta pantalla:
 * QUÉ PASÓ EN LA LLAMADA. Ese dato existe desde Phase 13 — el CallSummarizer
 * escribe un resumen estructurado después de cada llamada (resultado,
 * promesa de pago, dificultad económica, señales de fraude, sentimiento y un
 * digest en español) — pero no salía del microservicio. Ahora sí, y las dos
 * columnas nuevas son las que importan: **qué pasó** y **qué prometió**.
 *
 * Columnas adaptativas: las que dependen del resumen (Promesa, Señales) sólo
 * se montan si al menos una fila tiene algo que poner. Una columna entera de
 * guiones no informa que no hay datos — informa que la pantalla está rota.
 * Ver la regla en CobranzaResultadosKpis / feedback_andamiaje_sobre_vacio.
 *
 * DS: tokens de Cadence (`bg-surface`, `text-fg`, `border-border`), primitivas
 * del DS vía el shim de `@/components/ui`; el fallo va con <FalloDeCarga>.
 * Refs DESIGN.md §2 (tokens), §11 (estados), §12 (badges), §16 (numéricos).
 */

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneCall, Warning, ShieldWarning, Handshake } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import { Button } from '@/components/ui'
import { TablePagination } from '@/components/ui/pagination'
import { Card, Chip } from '@leasefy/cadence'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import {
  useTablePagination,
  PAGE_SIZE_OPTIONS,
} from '@/lib/hooks/use-table-pagination'
import {
  useCalls,
  type CallSummary,
  type CallOutcomeFilter,
  type CallChannelFilter,
  type CallDirectionFilter,
} from '@/lib/hooks/cobranza/use-calls'
import {
  callOutcomeLabel,
  summaryOutcomeLabel,
  channelLabel,
  directionLabel,
  sentimentLabel,
  outcomeBadgeVariant,
} from '@/lib/cobranza/call-vocab'
import { formatCurrency } from '@/lib/format'

// ── Filtros ───────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS: CallOutcomeFilter[] = [
  'completed',
  'no_answer',
  'voicemail',
  'wrong_party',
  'failed',
  'opt_out',
  'escalated',
]

const CHANNEL_OPTIONS: CallChannelFilter[] = ['voice', 'whatsapp', 'sms', 'email']

const DIRECTION_OPTIONS: CallDirectionFilter[] = ['outbound', 'inbound']

// ── Utilidades ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

function formatRelative(iso: string, locale: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 2) return 'Hace un momento'
    if (minutes < 60) return `Hace ${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `Hace ${days}d`
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** «20 de agosto» — la fecha de una promesa no necesita el año si es cercana. */
function formatPromiseDate(isoDate: string | null): string | null {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

/**
 * El resultado que se muestra: el del resumen cuando existe (dice más que el
 * estado mecánico), el de la columna si no.
 */
function displayOutcome(call: CallSummary): { label: string | null; slug: string | null } {
  const fromSummary = call.summary?.outcome ?? null
  if (fromSummary) return { label: summaryOutcomeLabel(fromSummary), slug: fromSummary }
  return { label: callOutcomeLabel(call.outcome), slug: call.outcome }
}

// ── Celdas ────────────────────────────────────────────────────────────────────

function PromesaCell({ call }: { call: CallSummary }) {
  const promesa = call.summary?.paymentPromised
  if (!promesa) return <span className="text-fg-subtle">—</span>

  const fecha = formatPromiseDate(promesa.dueDate)

  return (
    <div className="flex flex-col items-end gap-0.5">
      {promesa.amountCop != null ? (
        <span className="font-mono tabular-nums text-fg">
          {formatCurrency(promesa.amountCop)}
        </span>
      ) : (
        <span className="text-fg-muted text-sm">Sin monto</span>
      )}
      {fecha && <span className="text-xs text-fg-muted whitespace-nowrap">{fecha}</span>}
    </div>
  )
}

function SenalesCell({ call }: { call: CallSummary }) {
  const s = call.summary
  const flags = call.complianceFlagsCount
  const fraude = s?.fraudFlagsCount ?? 0
  const hardship = s?.hardshipDetected ?? false
  // «neutral» no es una señal: es la ausencia de una. Contarlo como señal
  // deja la celda montada y vacía, porque después no se pinta.
  const sentimiento = s?.sentiment && s.sentiment !== 'neutral' ? s.sentiment : null

  const nada = flags === 0 && fraude === 0 && !hardship && !sentimiento
  if (nada) return <span className="text-fg-subtle">—</span>

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {fraude > 0 && (
        <span
          className="inline-flex items-center gap-1 text-danger text-xs font-medium"
          title="Señales de fraude detectadas en la llamada"
        >
          <ShieldWarning className="w-3.5 h-3.5" weight="fill" aria-hidden="true" />
          {fraude}
        </span>
      )}
      {flags > 0 && (
        <span
          className="inline-flex items-center gap-1 text-warning text-xs font-medium"
          title="Alertas de cumplimiento"
        >
          <Warning className="w-3.5 h-3.5" weight="fill" aria-hidden="true" />
          {flags}
        </span>
      )}
      {hardship && (
        <Badge variant="secondary" title="El deudor mencionó una dificultad económica">
          Dificultad
        </Badge>
      )}
      {sentimiento && sentimiento !== 'neutral' && (
        <span className="text-xs text-fg-muted">{sentimentLabel(sentimiento)}</span>
      )}
    </div>
  )
}

// ── Contenido ─────────────────────────────────────────────────────────────────

function LlamadasContent() {
  const { t, locale } = useI18n()
  const router = useRouter()

  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcomeFilter | undefined>()
  const [channelFilter, setChannelFilter] = useState<CallChannelFilter | undefined>()
  const [directionFilter, setDirectionFilter] = useState<CallDirectionFilter | undefined>()

  const { calls, isLoading, error, refetch } = useCalls({
    outcome: outcomeFilter,
    channel: channelFilter,
    direction: directionFilter,
  })

  useAutoRefresh(refetch)

  const navigateToCall = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/cobros/cobranza/llamadas/${id}`)
    },
    [router],
  )

  const hasFilters =
    outcomeFilter !== undefined || channelFilter !== undefined || directionFilter !== undefined

  const clearFilters = useCallback(() => {
    setOutcomeFilter(undefined)
    setChannelFilter(undefined)
    setDirectionFilter(undefined)
  }, [])

  /**
   * Paginado de presentación: el endpoint ya devuelve la página del cursor y
   * acá se recorta para que la tabla no crezca sin fin. `resetKey` con los
   * filtros — sin eso, filtrar estando en la página 3 deja la tabla vacía y se
   * lee como «no hay llamadas».
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(calls, {
    resetKey: `${outcomeFilter ?? ''}|${channelFilter ?? ''}|${directionFilter ?? ''}`,
  })

  /**
   * Qué columnas opcionales tienen algo que decir. Se calcula sobre TODAS las
   * llamadas cargadas, no sobre la página visible: si dependiera de la página,
   * las columnas aparecerían y desaparecerían al pasar de una a otra.
   */
  const columnas = useMemo(
    () => ({
      promesa: calls.some((c) => c.summary?.paymentPromised != null),
      senales: calls.some(
        (c) =>
          c.complianceFlagsCount > 0 ||
          (c.summary?.fraudFlagsCount ?? 0) > 0 ||
          c.summary?.hardshipDetected === true ||
          (c.summary?.sentiment != null && c.summary.sentiment !== 'neutral'),
      ),
      qa: calls.some((c) => c.qaScore != null),
      duracion: calls.some((c) => c.durationSeconds != null),
    }),
    [calls],
  )

  const columnCount =
    3 + // deudor, resultado, cuándo
    (columnas.promesa ? 1 : 0) +
    (columnas.senales ? 1 : 0) +
    (columnas.qa ? 1 : 0) +
    (columnas.duracion ? 1 : 0)

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (isLoading && calls.length === 0 && !error) {
    return (
      <main className="p-4 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <header className="mb-5 space-y-2">
          <div className="h-7 w-40 rounded bg-surface-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-surface-muted animate-pulse" />
        </header>
        <Card className="overflow-hidden">
          <Table>
            <TableBody className="animate-pulse">
              {Array.from({ length: 6 }, (_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <TableCell key={j}>
                      <div className="h-3 w-full rounded bg-surface-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    )
  }

  // ── Vacío global (sin filtros, sin datos, sin error) ─────────────────────────
  if (!isLoading && !hasFilters && calls.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={PhoneCall}
          title={t('inmobiliaria.ai.cobranza.llamadas.list.empty.title')}
          description={t('inmobiliaria.ai.cobranza.llamadas.list.empty.description')}
        />
      </main>
    )
  }

  // ── Error sin datos: la pantalla NO puede afirmar nada sobre las llamadas ────
  if (error && calls.length === 0) {
    return (
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Interpolaba el error crudo del agente dentro del mensaje —«respondió
            con un error (Failed to fetch)»—: no le dice nada a quien lo lee y
            filtra internals. `FalloDeCarga` lo deja en el DOM para diagnóstico
            y en pantalla dice qué pasó y si sirve reintentar. */}
        <FalloDeCarga
          error={error}
          queEs="las llamadas"
          onReintentar={() => void refetch()}
        />
      </main>
    )
  }

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-5 space-y-1">
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.ai.cobranza.llamadas.list.pageTitle')}
        </h1>
        <p className="text-sm text-fg-muted line-clamp-2 max-w-2xl">
          {t('inmobiliaria.ai.cobranza.llamadas.list.pageSubtitle')}
        </p>
      </div>

      {/*
        Contenedor canónico del panel: UNA tarjeta con su barra de filtros, la
        tabla y el pie de paginación. Los filtros vivían sueltos por encima de
        la tarjeta y la pantalla se leía como dos bloques sin relación.
      */}
      <Card className="overflow-hidden">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 border-b border-border px-4 py-3">
        <fieldset>
          <legend className="sr-only">
            {t('inmobiliaria.ai.cobranza.llamadas.list.filters.outcome')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {OUTCOME_OPTIONS.map((o) => (
              <Chip
                key={o}
                size="sm"
                selected={outcomeFilter === o}
                onClick={() => setOutcomeFilter((prev) => (prev === o ? undefined : o))}
              >
                {callOutcomeLabel(o)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">
            {t('inmobiliaria.ai.cobranza.llamadas.list.filters.channel')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((c) => (
              <Chip
                key={c}
                size="sm"
                selected={channelFilter === c}
                onClick={() => setChannelFilter((prev) => (prev === c ? undefined : c))}
              >
                {channelLabel(c)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">
            {t('inmobiliaria.ai.cobranza.llamadas.list.filters.direction')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {DIRECTION_OPTIONS.map((d) => (
              <Chip
                key={d}
                size="sm"
                selected={directionFilter === d}
                onClick={() => setDirectionFilter((prev) => (prev === d ? undefined : d))}
              >
                {directionLabel(d)}
              </Chip>
            ))}
          </div>
        </fieldset>

        {hasFilters && (
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={clearFilters}
            className="self-center px-0 h-auto"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/*
        Error CON datos en pantalla: el refresco falló pero lo que se ve sigue
        siendo válido, sólo que viejo. Se avisa sin borrar la tabla.
      */}
      {error && calls.length > 0 && (
        <div
          role="status"
          className="border-b border-border bg-warning-soft px-4 py-3 text-sm text-warning flex items-center gap-2"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>
            No pudimos actualizar la lista ({error}). Estás viendo la última carga que sí funcionó.
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-auto underline underline-offset-2 hover:opacity-80"
          >
            Reintentar
          </button>
        </div>
      )}

        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deudor</TableHead>
              <TableHead>Qué pasó</TableHead>
              {columnas.promesa && <TableHead numeric>Promesa</TableHead>}
              {columnas.senales && <TableHead>Señales</TableHead>}
              {columnas.duracion && <TableHead numeric>Duración</TableHead>}
              {columnas.qa && <TableHead numeric>QA</TableHead>}
              <TableHead>Cuándo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-12 text-center">
                  <p className="text-sm text-fg-muted">
                    Ninguna llamada coincide con los filtros seleccionados.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 text-sm text-primary underline underline-offset-2"
                  >
                    Limpiar filtros
                  </button>
                </TableCell>
              </TableRow>
            )}

            {pageItems.map((call) => {
              const outcome = displayOutcome(call)
              return (
                <TableRow
                  key={call.id}
                  onClick={() => navigateToCall(call.id)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigateToCall(call.id)
                  }}
                  className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Deudor + canal (el canal es metadato del contacto, no una columna propia) */}
                  <TableCell>
                    <div className="font-medium text-fg whitespace-nowrap">
                      {call.debtorNameMasked}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                      <span className="font-mono tabular-nums">{call.debtorCedulaMasked}</span>
                      <span aria-hidden="true">·</span>
                      <span>{channelLabel(call.channel)}</span>
                      {call.direction === 'inbound' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{directionLabel(call.direction)}</span>
                        </>
                      )}
                    </div>
                  </TableCell>

                  {/* Qué pasó — el resultado y, debajo, el digest del resumen */}
                  <TableCell className="max-w-md">
                    <div className="flex flex-col gap-1">
                      {outcome.label ? (
                        <Badge variant={outcomeBadgeVariant(outcome.slug)} className="w-fit">
                          {outcome.label}
                        </Badge>
                      ) : (
                        <span className="text-sm text-fg-muted">Todavía sin resultado</span>
                      )}
                      {call.summary?.digest && (
                        <p className="text-xs leading-relaxed text-fg-muted">
                          {call.summary.digest}
                        </p>
                      )}
                      {call.summary?.paymentPromised && !columnas.promesa && (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <Handshake className="w-3.5 h-3.5" aria-hidden="true" />
                          Prometió pagar
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {columnas.promesa && (
                    <TableCell numeric>
                      <PromesaCell call={call} />
                    </TableCell>
                  )}

                  {columnas.senales && (
                    <TableCell>
                      <SenalesCell call={call} />
                    </TableCell>
                  )}

                  {columnas.duracion && (
                    <TableCell numeric muted className="whitespace-nowrap">
                      {formatDuration(call.durationSeconds)}
                    </TableCell>
                  )}

                  {columnas.qa && (
                    <TableCell numeric className="whitespace-nowrap">
                      {call.qaScore != null ? (
                        <span
                          className={
                            call.qaScore >= 80
                              ? 'text-success'
                              : call.qaScore >= 60
                                ? 'text-warning'
                                : 'text-danger'
                          }
                        >
                          {Math.round(call.qaScore)}
                        </span>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell muted className="whitespace-nowrap">
                    {formatRelative(call.initiatedAt, locale)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
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
    </main>
  )
}

export default function LlamadasListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <LlamadasContent />
    </PageGuard>
  )
}
