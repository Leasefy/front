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

import { formatRelativeTime } from '@/lib/format'
import { useCallback, useMemo, useState } from 'react'
import { PhoneCall, Warning, ShieldWarning, Handshake, Funnel, MagnifyingGlass } from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { LlamadaDetalleSheet } from '@/components/inmobiliaria/cobranza/LlamadaDetalleSheet'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableBodyAnimado,
  TableRow,
  TableRowAnimada,
  TableHead,
  TableCell,
} from '@/components/ui'
import { Button } from '@/components/ui'
import { TablePagination } from '@/components/ui/pagination'
import { Card, Chip, CrossFade, Presence } from '@leasefy/cadence'
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
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'

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

// VOZ §4 (revisora r25): «3 min 20 s», no «3m 20s».
function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds} s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}

/**
 * «Qué pasó», las pestañas de la tabla (revisora r25, Llamadas #1): se cuentan
 * sobre las llamadas cargadas. Una llamada con promesa es «Prometió» aunque
 * traiga señales: lo que se hace con ella es seguir la promesa.
 */
type QuePaso = 'todas' | 'promesa' | 'senales' | 'sin-respuesta'

function quePaso(c: CallSummary): Exclude<QuePaso, 'todas'> | null {
  if (c.summary?.paymentPromised != null) return 'promesa'
  if ((c.complianceFlagsCount ?? 0) > 0 || (c.summary?.fraudFlagsCount ?? 0) > 0 || c.summary?.hardshipDetected) return 'senales'
  if (c.outcome === 'no_answer' || c.outcome === 'voicemail') return 'sin-respuesta'
  return null
}

/** Sin tildes ni mayúsculas, para buscar «garcia» y encontrar «García». */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// C7 (r25): «hace 3 horas», no «Hace 3h» (VOZ §4). La regla vive en `formatRelativeTime`.
function formatRelative(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const texto = formatRelativeTime(iso, locale.startsWith('en') ? 'en' : 'es')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
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
        <span className="text-fg-muted text-body-sm">Sin monto</span>
      )}
      {fecha && <span className="text-caption text-fg-muted whitespace-nowrap">{fecha}</span>}
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
          className="inline-flex items-center gap-1 text-danger text-caption font-medium"
          title="Señales de fraude detectadas en la llamada"
        >
          <ShieldWarning className="w-3.5 h-3.5" weight="fill" aria-hidden="true" />
          {fraude}
        </span>
      )}
      {flags > 0 && (
        <span
          className="inline-flex items-center gap-1 text-warning text-caption font-medium"
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
        <span className="text-caption text-fg-muted">{sentimentLabel(sentimiento)}</span>
      )}
    </div>
  )
}

// ── Contenido ─────────────────────────────────────────────────────────────────

function LlamadasContent() {
  const { t, locale } = useI18n()

  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcomeFilter | undefined>()
  const [channelFilter, setChannelFilter] = useState<CallChannelFilter | undefined>()
  const [directionFilter, setDirectionFilter] = useState<CallDirectionFilter | undefined>()
  const [pestana, setPestana] = useState<QuePaso>('todas')
  const [buscar, setBuscar] = useState('')
  // Revisora r25 (#2): el detalle en el cajón que ya existía, sin salir de la lista.
  const [abierta, setAbierta] = useState<string | null>(null)

  const { calls, isLoading, error, refetch } = useCalls({
    outcome: outcomeFilter,
    channel: channelFilter,
    direction: directionFilter,
  })

  useAutoRefresh(refetch)

  // El detalle se abre en el cajón; la página sigue viva (el PDF de la
  // transcripción vive allá y el pie del cajón la enlaza).
  const navigateToCall = useCallback((id: string) => setAbierta(id), [])

  const hasFilters =
    outcomeFilter !== undefined || channelFilter !== undefined || directionFilter !== undefined

  const clearFilters = useCallback(() => {
    setOutcomeFilter(undefined)
    setChannelFilter(undefined)
    setDirectionFilter(undefined)
    setPestana('todas')
    setBuscar('')
  }, [])

  const q = normalizar(buscar)
  const conteos = useMemo(() => {
    const n = { promesa: 0, senales: 0, 'sin-respuesta': 0 }
    for (const c of calls) {
      const k = quePaso(c)
      if (k) n[k] += 1
    }
    return n
  }, [calls])
  const visibles = useMemo(
    () =>
      calls.filter(
        (c) =>
          (pestana === 'todas' || quePaso(c) === pestana) &&
          (!q || normalizar(c.debtorNameMasked ?? '').includes(q)),
      ),
    [calls, pestana, q],
  )

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
  } = useTablePagination(visibles, {
    resetKey: `${outcomeFilter ?? ''}|${channelFilter ?? ''}|${directionFilter ?? ''}|${pestana}|${q}`,
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

  // El encabezado va en TODAS las ramas (revisora r25 #3: el vacío y el fallo
  // quedaban sin título ni para qué sirve).
  const encabezado = (
    <EncabezadoDePantalla
      seccion="Cobranza"
      titulo={t('inmobiliaria.ai.cobranza.llamadas.list.pageTitle')}
      descripcion="Qué pasó en cada llamada y mensaje del agente: lo que se prometió, las señales y cuándo."
    />
  )
  const cuantosFiltros = [outcomeFilter, channelFilter, directionFilter].filter(Boolean).length

  // ── Skeleton ────────────────────────────────────────────────────────────────
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // llamadas, → vacío, → fallo); lo que ya estaba al montarse no se anima.
  if (isLoading && calls.length === 0 && !error) {
    return (
      <CrossFade swapKey="esqueleto">
      <div className="p-6 lg:p-8 space-y-6" aria-busy="true">
        {encabezado}
        <Card className="overflow-hidden">
          <div className="space-y-2 border-b border-border px-4 py-5 sm:px-6" aria-hidden="true">
            <span className="block h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <span className="block h-9 w-56 animate-pulse rounded bg-surface-muted" />
          </div>
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
      </div>
      </CrossFade>
    )
  }

  // ── Vacío global (sin filtros, sin datos, sin error) ─────────────────────────
  if (!isLoading && !hasFilters && calls.length === 0 && !error) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-6">
        {encabezado}
        <EmptyState
          icon={PhoneCall}
          title={t('inmobiliaria.ai.cobranza.llamadas.list.empty.title')}
          description={t('inmobiliaria.ai.cobranza.llamadas.list.empty.description')}
          primaryCta={{ label: 'Ver los casos', href: '/panel/inmobiliaria/pagos/cobranza/deudores' }}
        />
      </div>
      </CrossFade>
    )
  }

  // ── Error sin datos: la pantalla NO puede afirmar nada sobre las llamadas ────
  if (error && calls.length === 0) {
    return (
      <CrossFade swapKey="fallo">
      <div className="p-6 lg:p-8 space-y-6">
        {encabezado}
        {/* `FalloDeCarga` deja el error crudo en el DOM para diagnóstico y en
            pantalla dice qué pasó y si sirve reintentar. */}
        <FalloDeCarga
          error={error}
          queEs="las llamadas"
          onReintentar={refetch}
        />
      </div>
      </CrossFade>
    )
  }

  // LA RESPUESTA, en plata y dentro de la tarjeta (C3): cuánto se prometió en
  // las llamadas que se ven. Los conteos van en las pestañas, una sola vez.
  // El endpoint trae las más recientes (una página del cursor): la cifra lo
  // dice así, sin hablar de «todas».
  const prometido = calls.reduce((s, c) => s + (c.summary?.paymentPromised?.amountCop ?? 0), 0)
  const recientes = `${calls.length.toLocaleString('es-CO')} ${calls.length === 1 ? 'llamada reciente' : 'llamadas recientes'}`

  return (
    <CrossFade swapKey="llamadas">
    <div className="p-6 lg:p-8 space-y-6">
      {encabezado}

      {/*
        Contenedor canónico del panel: UNA tarjeta con la respuesta, las
        pestañas de «Qué pasó», el buscador, la tabla y el pie de paginación.
      */}
      <Card className="overflow-hidden">
      {calls.length > 0 ? (
        <div className="border-b border-border px-4 py-5 sm:px-6">
          <CifraHeroe
            data-testid="llamadas-promesas"
            rotulo="Prometido en las llamadas"
            cifra={formatCurrency(prometido)}
            contexto={`en ${conteos.promesa === 1 ? '1 promesa' : `${conteos.promesa} promesas`} de ${recientes}`}
            esCero={conteos.promesa === 0}
            cuandoEsCero={`Nadie prometió pagar en las ${recientes}.`}
          />
        </div>
      ) : null}

      <div className="border-b border-border px-4 py-3">
        <PestanasDeEstado<QuePaso>
          etiqueta="Qué pasó"
          valor={pestana}
          onCambio={setPestana}
          pestanas={[
            { valor: 'todas', etiqueta: 'Todas', cuantos: calls.length, fija: true, testid: 'llamadas-pestana-todas' },
            { valor: 'promesa', etiqueta: 'Prometió', cuantos: conteos.promesa, testid: 'llamadas-pestana-promesa' },
            { valor: 'senales', etiqueta: 'Con señales', cuantos: conteos.senales, tono: 'aviso', testid: 'llamadas-pestana-senales' },
            { valor: 'sin-respuesta', etiqueta: 'Sin respuesta', cuantos: conteos['sin-respuesta'], testid: 'llamadas-pestana-sin-respuesta' },
          ]}
        />
      </div>

      {/* Buscar por deudor y lo demás en «Filtros (n)»: eran 13 chips en tres grupos. */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="llamadas-buscar" className="sr-only">
            Buscar por deudor
          </label>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input
            id="llamadas-buscar"
            type="search"
            className="pl-9"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por deudor"
            data-testid="llamadas-buscar"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" hideArrow className="shrink-0" data-testid="llamadas-filtros">
                <Funnel className="h-4 w-4" aria-hidden="true" />
                Filtros
                {cuantosFiltros > 0 ? (
                  <span className="font-mono text-caption tabular-nums">({cuantosFiltros})</span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-4 p-4">
              <fieldset className="space-y-2">
                <legend className="text-caption font-medium text-fg-muted">
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
              <fieldset className="space-y-2">
                <legend className="text-caption font-medium text-fg-muted">
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
              <fieldset className="space-y-2">
                <legend className="text-caption font-medium text-fg-muted">
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
            </PopoverContent>
          </Popover>
          <Presence show={hasFilters || pestana !== 'todas' || q !== ''} direction="none" initial={false}>
            <Button variant="link" size="sm" hideArrow onClick={clearFilters} className="h-auto shrink-0 px-0">
              Limpiar filtros
            </Button>
          </Presence>
        </div>
      </div>

      {/*
        Error CON datos en pantalla: el refresco falló pero lo que se ve sigue
        siendo válido, sólo que viejo. Se avisa sin borrar la tabla.
      */}
      <Presence
          show={Boolean(error && calls.length > 0)}
          role="status"
          className="border-b border-border bg-warning-soft px-4 py-3 text-body-sm text-warning flex items-center gap-2"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>
            {/* C5 (r25): sin el error crudo entre paréntesis. */}
            No pudimos actualizar la lista. Estás viendo la última carga que sí funcionó.
          </span>
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={() => void refetch()}
            className="ml-auto px-0 h-auto text-body-sm text-warning underline hover:opacity-80"
          >
            Reintentar
          </Button>
      </Presence>

        <div className="overflow-x-auto max-md:overflow-visible">
        <Table className="max-md:block">
          <TableHeader className="max-md:hidden">
            <TableRow>
              <TableHead>Deudor</TableHead>
              <TableHead>Qué pasó</TableHead>
              {columnas.promesa && <TableHead numeric>Promesa</TableHead>}
              {columnas.senales && <TableHead>Señales</TableHead>}
              {columnas.duracion && <TableHead numeric>Duración</TableHead>}
              {columnas.qa && <TableHead numeric>Calidad</TableHead>}
              <TableHead>Cuándo</TableHead>
            </TableRow>
          </TableHeader>
          {/* Filtrar o paginar: las filas entran escalonadas (techo 320 ms) y
              las que sobran salen; filtrado a cero, la fila del vacío entra. */}
          <TableBodyAnimado className="max-md:block">
            {visibles.length === 0 && !isLoading && (
              <TableRowAnimada key="vacio" className="max-md:block">
                <TableCell colSpan={columnCount} className="py-12 text-center max-md:block">
                  <p className="text-body-sm text-fg-muted">
                    {q ? `Ninguna llamada reciente es de «${buscar.trim()}».` : 'Ninguna llamada coincide con los filtros seleccionados.'}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    hideArrow
                    onClick={clearFilters}
                    className="mt-2 px-0 h-auto text-body-sm text-fg underline"
                  >
                    Limpiar filtros
                  </Button>
                </TableCell>
              </TableRowAnimada>
            )}

            {pageItems.map((call) => {
              const outcome = displayOutcome(call)
              return (
                <TableRowAnimada
                  key={call.id}
                  onClick={() => navigateToCall(call.id)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigateToCall(call.id)
                  }}
                  className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                >
                  {/* Deudor + canal (el canal es metadato del contacto, no una columna propia) */}
                  <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                    <div className="font-medium text-fg whitespace-nowrap">
                      {call.debtorNameMasked}
                    </div>
                    <div className="flex items-center gap-1.5 text-caption text-fg-muted">
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
                  <TableCell className="max-w-md max-md:col-span-2 max-md:row-start-2 max-md:block max-md:max-w-none max-md:p-0">
                    <div className="flex flex-col gap-1">
                      {outcome.label ? (
                        <Badge variant={outcomeBadgeVariant(outcome.slug)} className="w-fit">
                          {outcome.label}
                        </Badge>
                      ) : (
                        <span className="text-body-sm text-fg-muted">Todavía sin resultado</span>
                      )}
                      {call.summary?.digest && (
                        <p className="text-caption leading-relaxed text-fg-muted">
                          {call.summary.digest}
                        </p>
                      )}
                      {call.summary?.paymentPromised && !columnas.promesa && (
                        <span className="inline-flex items-center gap-1 text-caption text-success">
                          <Handshake className="w-3.5 h-3.5" aria-hidden="true" />
                          Prometió pagar
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {columnas.promesa && (
                    <TableCell numeric className="max-md:col-start-2 max-md:row-start-3 max-md:block max-md:p-0">
                      <PromesaCell call={call} />
                    </TableCell>
                  )}

                  {columnas.senales && (
                    <TableCell className="max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0">
                      <SenalesCell call={call} />
                    </TableCell>
                  )}

                  {columnas.duracion && (
                    <TableCell numeric muted className="whitespace-nowrap max-md:hidden">
                      {formatDuration(call.durationSeconds)}
                    </TableCell>
                  )}

                  {columnas.qa && (
                    <TableCell numeric className="whitespace-nowrap max-md:hidden">
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

                  <TableCell muted className="whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right max-md:text-caption">
                    {formatRelative(call.initiatedAt, locale)}
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

      <LlamadaDetalleSheet callId={abierta} onClose={() => setAbierta(null)} />
    </div>
    </CrossFade>
  )
}

export default function LlamadasListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <LlamadasContent />
    </PageGuard>
  )
}
