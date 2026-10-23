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

import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { useTr } from '@/lib/i18n/use-tr'
import { useCarteraOverview } from '@/lib/hooks/cobranza/use-cartera-overview'
import { fechaCorta, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Funnel, MagnifyingGlass, Users } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { CARTERA_STAGES, STAGE_LABELS_ES, stageDisplayName, type CarteraStage } from '@/lib/cartera'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebtorList } from '@/lib/hooks/cobranza/use-debtor-list'
import { hashCedulaPrefix } from '@/lib/cobranza/hash-cedula-prefix'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { CobranzaImportCard } from '@/components/inmobiliaria/cobranza/CobranzaImportCard'
import { TraerLaCartera } from '@/components/cobranza-manual/TraerLaCartera'
import { AvisoPlazoSinFijarEnCobranza } from '@/components/inmobiliaria/cobranza/AvisoPlazoSinFijarEnCobranza'
import { usePlazoSinFijar } from '@/lib/hooks/use-plazo-sin-fijar'
import { CobranzaDeudoresListSkeleton } from '@/components/skeleton/panel/CobranzaDeudoresListSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { CrossFade, Presence, Stagger, StaggerItem } from '@leasefy/cadence'
// `Badge` sale del ADAPTADOR local, no de Cadence crudo: el crudo es h-5/11px
// y su variante `info` es hex fijo que no sigue el modo oscuro. Es el mismo
// Badge que usan las otras tablas del panel.
import { Button, Input, Badge } from '@/components/ui'
import { Card } from '@leasefy/cadence'
import { Chip, RangeSlider } from '@leasefy/cadence'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import {
  Table,
  TableHeader,
  TableBodyAnimado,
  TableRow,
  TableRowAnimada,
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

const BASE_DE_CASOS = '/panel/inmobiliaria/pagos/cobranza/deudores'

/** Las etapas que piden que alguien mire: llevan el punto ámbar en su pestaña. */
const ETAPAS_QUE_PIDEN_ATENCION = new Set<CarteraStage>(['S3', 'S4', 'S5'])

/** `varias`: llegaron dos o más etapas por la URL (`?stage=S2,S3`); ninguna pestaña es la activa. */
type PestanaDeEtapa = 'todas' | 'varias' | CarteraStage

export default function DeudoresListClient() {
  const { t, locale } = useI18n()
  const tr = useTr()
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
  const [channels, setChannels] = useState<Channel[]>(() => {
    const raw = searchParams.get('canal')
    if (!raw) return []
    return raw.split(',').filter((c): c is Channel => (CHANNELS as string[]).includes(c))
  })

  // Revisora r25 (Casos #4, 6b): la etapa y el canal viven en la URL; un enlace
  // o volver atrás deja la lista como estaba. `replace`: filtrar no es navegar.
  useEffect(() => {
    const q = new URLSearchParams(searchParams.toString())
    if (stages.length > 0) q.set('stage', stages.join(','))
    else q.delete('stage')
    if (channels.length > 0) q.set('canal', channels.join(','))
    else q.delete('canal')
    const nueva = q.toString()
    if (nueva === searchParams.toString()) return
    router.replace(nueva ? `${BASE_DE_CASOS}?${nueva}` : BASE_DE_CASOS, { scroll: false })
  }, [stages, channels, router, searchParams])
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
  // CONSISTENCIA (04-10-2026, CR-31): sin plazo fijado, que la lista esté vacía
  // es lo correcto; el vacío dice por qué y no manda a importar un CSV.
  const plazoSinFijar = usePlazoSinFijar()
  // LA RESPUESTA: a cuántos se está cobrando y en qué etapa. Es el mismo
  // panorama que lee la portada de Cobranza (conteo por etapa del agente); la
  // lista de abajo pagina por cursor y no sabe su total.
  const { data: panorama } = useCarteraOverview()
  const porEtapa = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of panorama?.stages ?? []) m.set(e.stage, e.count)
    return m
  }, [panorama])
  // La misma cuenta de la portada: en mora es todo menos «Pre-vencimiento».
  const totalDeCasos = useMemo(() => [...porEtapa.values()].reduce((a, n) => a + n, 0), [porEtapa])
  const porVencer = porEtapa.get('S0') ?? 0
  const enMora = totalDeCasos - porVencer
  // Revisora r27 (K1): la cifra con su barra. Sin plata (para Víctor), los
  // tramos van por GRAVEDAD de la mora, agrupando las etapas (las pestañas
  // dicen cada etapa): hasta 15 días · de 16 a 89 · siniestro o jurídico ·
  // ilocalizables.
  const tramosDeLaMora = useMemo(() => {
    const n = (...st: string[]) => st.reduce((a, x) => a + (porEtapa.get(x) ?? 0), 0)
    return [
      { clave: 'temprana', etiqueta: tr('Hasta 15 días'), monto: n('S1'), tono: 'neutro' as const },
      { clave: 'media', etiqueta: tr('De 16 a 89 días'), monto: n('S2', 'S3'), tono: 'aviso' as const },
      { clave: 'grave', etiqueta: tr('Siniestro o jurídico'), monto: n('S4', 'S5'), tono: 'critico' as const },
      { clave: 'ilocalizable', etiqueta: tr('Ilocalizables'), monto: n('SX'), tono: 'neutro' as const },
    ].map((t) => ({ ...t, cifra: t.monto.toLocaleString(!locale || locale.startsWith('es') ? 'es-CO' : 'en-US'), 'data-testid': `deudores-tramo-${t.clave}` }))
  }, [porEtapa, tr, locale])
  const pestana: PestanaDeEtapa = stages.length === 0 ? 'todas' : stages.length === 1 ? stages[0] : 'varias'

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

  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // lista, → «aún no hay cartera»); lo que ya estaba al montarse no se anima.
  if (isLoading && pages.length === 0) {
    return (
      <CrossFade swapKey="esqueleto">
        <CobranzaDeudoresListSkeleton />
      </CrossFade>
    )
  }

  // Revisora r25 (Casos #5): el vacío también lleva el encabezado de la
  // pantalla; sin él, quien llega no sabe dónde está.
  const encabezadoDelVacio = (
    <EncabezadoDePantalla
      seccion={t('inmobiliaria.ai.nav.cobranza')}
      titulo={t('inmobiliaria.ai.cobranza.deudores.title')}
      descripcion={t('inmobiliaria.ai.cobranza.deudores.subtitle')}
    />
  )

  if (
    !isLoading &&
    !hasActiveFilters &&
    pages.length === 0 &&
    !error
  ) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-6">
        {encabezadoDelVacio}
        {/* QA-IA-B (04-10-2026): sin días de plazo fijados la lista queda
            vacía aunque haya cuotas vencidas: se dice por qué. */}
        <AvisoPlazoSinFijarEnCobranza />
        {plazoSinFijar ? (
          <div data-testid="casos-vacio-sin-plazo">
            <EmptyState
              icon={Users}
              title={tr('Todavía no hay casos de cobranza')}
              description={tr('Es lo esperado: sin días de plazo fijados, las cuotas vencidas no entran a la cobranza. Cuando los fije, quienes sigan debiendo pasado el plazo aparecen aquí solos.')}
            />
          </div>
        ) : (
          <>
            {/* COBRANZA-MANUAL (04-10-2026; Nico: «Cobranza se llena con la
                cartera de los contratos»): la puerta principal es la cartera de
                los contratos; el CSV queda como opción extra, abajo. */}
            <div data-testid="casos-vacio-de-la-cartera">
              <EmptyState
                icon={Users}
                title={tr('Todavía no hay casos de cobranza')}
                description={tr('Aquí aparecen solos los inquilinos que pasan sus días de plazo sin pagar. Si acabas de fijar el plazo o de cargar contratos, tráelos ahora.')}
              />
            </div>
            <TraerLaCartera onTraida={() => void refetch()} />
            <section className="space-y-2" aria-labelledby="importar-otros-deudores">
              <h2 id="importar-otros-deudores" className="text-body-sm font-medium text-fg-muted">
                {tr('Otra opción: deudores que no están en Leasefy')}
              </h2>
              {/* Importar cartera — cableada al endpoint POST /cartera/import.
                  FAIL-SOFT: si el backend no está desplegado (404/red), el card
                  degrada sin romper. Tras un import exitoso refrescamos la lista
                  para salir del empty state. */}
              <CobranzaImportCard onImported={() => void refetch()} />
            </section>
          </>
        )}
      </div>
      </CrossFade>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    router.push(`/panel/inmobiliaria/pagos/cobranza/deudores/${id}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  //
  // GLOW UP (revisora r25, Casos #2 y C3): la cifra va DENTRO de la tarjeta,
  // encima de las pestañas, como «Deuda del mes». Antes iba suelta arriba con
  // sus siete tramos por etapa y, además, siete chips de etapa con los MISMOS
  // conteos: el mismo número dicho dos veces. Ahora hay una sola fila: las
  // etapas son las pestañas, con su conteo.
  //
  //   Card
  //    ├─ la cifra «En mora»       (border-b)
  //    ├─ pestañas por etapa       (border-b)
  //    ├─ buscador + Filtros (n)   (border-b)  ← canal y días, en un popover
  //    ├─ tabla / tarjetas
  //    └─ pie: paginador           (border-t)
  const fueraDeLasPestanas = channels.length + (daysMin !== DAYS_MIN_DEFAULT || daysMax !== DAYS_MAX_DEFAULT ? 1 : 0)
  const enEs = !locale || locale.startsWith('es')
  const cifraDe = (n: number) => n.toLocaleString(enEs ? 'es-CO' : 'en-US')

  return (
    <CrossFade swapKey="lista">
    <div className="p-6 lg:p-8 space-y-6">
      {/* COBRANZA-MANUAL: la cartera de los contratos llega cada noche; el
          botón del encabezado la trae ya. No contacta a nadie. */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.ai.nav.cobranza')}
        titulo={t('inmobiliaria.ai.cobranza.deudores.title')}
        descripcion={t('inmobiliaria.ai.cobranza.deudores.subtitle')}
        acciones={<TraerLaCartera compacto onTraida={() => void refetch()} />}
      />

      <AvisoPlazoSinFijarEnCobranza />

      <Card className="overflow-hidden">
        {/* ── 1 · LA RESPUESTA: cuántos están en mora ────────────────────── */}
        {/* Sin plata a propósito: ni el panorama ni la lista traen el saldo
            (para Víctor). Se cuenta como la portada: todo menos «Pre-vencimiento». */}
        <Presence show={Boolean(panorama)} direction="none">
          <CifraHeroe
            className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
            data-testid="deudores-en-cobranza"
            tamano="mediana"
            rotulo={tr('En mora')}
            cifra={cifraDe(enMora)}
            contexto={
              <>
                {enMora === 1 ? tr('inquilino') : tr('inquilinos')}
                {porVencer > 0 ? (
                  <span className="text-fg-subtle">
                    {' · '}
                    {porVencer === 1
                      ? tr('1 más con la cuota por vencer')
                      : tr('{n} más con la cuota por vencer', { n: cifraDe(porVencer) })}
                  </span>
                ) : null}
              </>
            }
            tramos={tramosDeLaMora}
            esCero={enMora === 0}
            cuandoEsCero={
              porVencer > 0
                ? tr('Nadie está en mora: los casos que hay todavía no vencen.')
                : tr('Nadie está en mora.')
            }
          />
        </Presence>

        {/* ── 2 · Las etapas, con su conteo: UNA fila ───────────────────── */}
        <div className="border-b border-border px-4 py-3 space-y-2 empty:hidden">
          <PestanasDeEstado<PestanaDeEtapa>
            data-testid="deudores-pestanas-de-etapa"
            etiqueta={t('inmobiliaria.ai.cobranza.deudores.filters.stage')}
            valor={pestana}
            onCambio={(v) => setStages(v === 'todas' || v === 'varias' ? [] : [v])}
            pestanas={[
              { valor: 'todas', etiqueta: tr('Todos'), cuantos: panorama ? totalDeCasos : null, fija: true, testid: 'stage-chip-todas' },
              ...CARTERA_STAGES.map((s) => ({
                valor: s,
                etiqueta: stageDisplayName(s, enEs ? 'es' : 'en'),
                cuantos: panorama ? (porEtapa.get(s) ?? 0) : null,
                tono: ETAPAS_QUE_PIDEN_ATENCION.has(s) ? ('aviso' as const) : undefined,
                testid: `stage-chip-${s}`,
              })),
            ]}
          />
          {pestana === 'varias' ? (
            <p className="text-caption text-fg-muted" data-testid="deudores-varias-etapas">
              {tr('Viendo')} {stages.map((s) => stageDisplayName(s, enEs ? 'es' : 'en')).join(' · ')}
              {' · '}
              <button type="button" onClick={() => setStages([])} className="underline underline-offset-2 hover:text-fg">
                {tr('Ver todas las etapas')}
              </button>
            </p>
          ) : null}
        </div>

        {/* ── 3 · Buscar y lo demás, en «Filtros (n)» ────────────────────── */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <label htmlFor="debtor-search" className="sr-only">
                {t('inmobiliaria.ai.cobranza.deudores.filters.search.label')}
              </label>
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <Input
                id="debtor-search"
                type="search"
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('inmobiliaria.ai.cobranza.deudores.filters.search.placeholder')}
                data-testid="deudores-buscar"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" hideArrow className="shrink-0" data-testid="deudores-filtros">
                  <Funnel className="h-4 w-4" aria-hidden="true" />
                  {t('inmobiliaria.ai.cobranza.deudores.filters.title')}
                  {fueraDeLasPestanas > 0 ? (
                    <span className="font-mono text-caption tabular-nums">({fueraDeLasPestanas})</span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-4 p-4">
                <fieldset className="space-y-2">
                  <legend className="text-caption font-medium text-fg-muted">
                    {t('inmobiliaria.ai.cobranza.deudores.filters.channel')}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((c) => (
                      <Chip
                        key={c}
                        size="sm"
                        selected={channels.includes(c)}
                        onClick={() => toggleChannel(c)}
                        data-testid={`channel-chip-${c}`}
                      >
                        {t(`inmobiliaria.ai.cobranza.deudores.channels.${c}` as Parameters<typeof t>[0])}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="flex w-full items-center justify-between text-caption font-medium text-fg-muted">
                    <span>{t('inmobiliaria.ai.cobranza.deudores.filters.daysInStage')}</span>
                    <span className="font-mono tabular-nums text-fg">
                      {tr('{a} a {b}', { a: daysMin, b: daysMax })}
                    </span>
                  </legend>
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
                </fieldset>
              </PopoverContent>
            </Popover>
            {/* Sólo aparece cuando hay algo que limpiar: un botón que no hace
                nada enseña a ignorar los botones. */}
            <Presence show={hasActiveFilters} direction="none" initial={false}>
              <Button variant="link" size="sm" onClick={clearFilters} hideArrow className="h-auto shrink-0 px-0">
                {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
              </Button>
            </Presence>
          </div>
          {/* Revisora r27 (UI): «Ordenado por días en la etapa» era un texto
              suelto que parecía un control; se dice sólo a los lectores de
              pantalla (el orden se ve en la columna). */}
          <span className="sr-only" data-testid="sort-label">
            {t('inmobiliaria.ai.cobranza.deudores.sort.daysInStageDesc')}
          </span>
        </div>
        {searchHint ? <p className="border-b border-border px-4 py-2 text-caption text-warning">{searchHint}</p> : null}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {/* C5 (r25): FalloDeCarga, nunca el error crudo pegado a la frase. */}
        {error ? (
          <div className="border-b border-border">
            <FalloDeCarga error={falloDelTexto(error)} queEs="los casos" onReintentar={() => refetch()} enmarcado={false} />
          </div>
        ) : null}

        {/* ── Vacío filtrado — DENTRO de la tarjeta, no flotando ────────── */}
        {/* Filtrar a cero ⇄ volver a ver casos: el uno sale y el otro entra. */}
        <CrossFade swapKey={!isLoading && pages.length === 0 && !error ? 'vacio-filtrado' : 'tabla'}>
        {!isLoading && pages.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Users className="w-7 h-7 text-fg-muted" weight="duotone" aria-hidden="true" />
            <p className="text-body-sm font-medium text-fg">
              {t('inmobiliaria.ai.cobranza.deudores.emptyFiltered')}
            </p>
            <p className="text-caption text-fg-muted max-w-sm">
              {tr('Ningún caso cumple con los filtros puestos. Quita alguno para ver el resto de la cartera.')}
            </p>
            <Button variant="outline" size="sm" hideArrow className="mt-2" onClick={clearFilters}>
              {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
            </Button>
          </div>
        ) : (
          <>
            {/* ── Tabla (md+) ───────────────────────────────────────────── */}
            {/* Revisora r25 (Casos #1): fuera Teléfono y Correo enmascarados
                —«•••» en todas las filas—; el documento va bajo el nombre y lo
                demás, en la ficha del caso. */}
            <div className="hidden md:block overflow-x-auto overscroll-contain">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.name')}</TableHead>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.stage')}</TableHead>
                    <TableHead className="text-right">{tr('Días en la etapa')}</TableHead>
                    <TableHead>{tr('Último movimiento')}</TableHead>
                    <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.channel')}</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Filtrar, buscar o paginar: las filas entran escalonadas
                    (techo 320 ms) y las que sobran salen. */}
                <TableBodyAnimado>
                  {pageItems.map((d) => (
                    <TableRowAnimada
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
                      <TableCell className="whitespace-nowrap">
                        <p className="font-medium text-fg">{d.fullName}</p>
                        <Mask field="cedula" value={d.cedulaMasked} className="text-caption text-fg-muted" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" title={STAGE_LABELS_ES[d.currentStage]}>
                          {stageDisplayName(d.currentStage, enEs ? 'es' : 'en')}
                        </Badge>
                      </TableCell>
                      {/* Números a la derecha y tabulares: es la columna por la
                          que está ordenada la tabla, se compara de un vistazo. */}
                      <TableCell className="text-right">
                        <Badge variant={daysBadgeVariant(d.daysInStage)}>{d.daysInStage}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-body-sm tabular-nums text-fg-muted">
                        {enEs ? fechaCorta(diaEnColombia(d.lastActivityAt)) : new Date(d.lastActivityAt).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell className="text-body-sm text-fg-muted">
                        {etiquetaDeCanal(d.channel, t)}
                      </TableCell>
                    </TableRowAnimada>
                  ))}
                </TableBodyAnimado>
              </Table>
            </div>

            {/* ── Tarjetas (sm) ─────────────────────────────────────────── */}
            <Stagger as="ul" layout={false} className="md:hidden divide-y divide-border">
              {pageItems.map((d) => (
                <StaggerItem as="li" key={d.id}>
                  <button
                    type="button"
                    onClick={() => navigateToDebtor(d.id)}
                    className="w-full min-h-11 text-left px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-body-sm font-medium text-fg truncate">{d.fullName}</p>
                      <Badge variant="outline" title={STAGE_LABELS_ES[d.currentStage]}>
                        {stageDisplayName(d.currentStage, enEs ? 'es' : 'en')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={daysBadgeVariant(d.daysInStage)}>
                        {d.daysInStage === 1 ? tr('1 día en la etapa') : tr('{n} días en la etapa', { n: d.daysInStage })}
                      </Badge>
                      <Mask field="cedula" value={d.cedulaMasked} />
                    </div>
                    <p className="text-caption text-fg-muted mt-1.5">
                      {etiquetaDeCanal(d.channel, t)}
                      {d.lastActivityAt
                        ? ` · ${enEs ? fechaCorta(diaEnColombia(d.lastActivityAt)) : new Date(d.lastActivityAt).toLocaleDateString(locale)}`
                        : ''}
                    </p>
                  </button>
                </StaggerItem>
              ))}
            </Stagger>
          </>
        )}
        </CrossFade>

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
        <Presence
          show={isLoadingMore}
          direction="none"
          className="border-t border-border px-4 py-2 text-center text-caption text-fg-muted"
        >
            {t('inmobiliaria.ai.cobranza.deudores.loadingMore')}
        </Presence>
      </Card>
    </div>
    </CrossFade>
  )
}
