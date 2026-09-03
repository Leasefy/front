'use client'

/**
 * EstudioDetailClient — estudio de inquilino, vista de caso (orquestador 3-zonas).
 *
 * Espejo de cobranza/deudores/[id]/DebtorDetailClient: layout
 *   contexto (izq) | expediente con tabs (centro) | recomendación IA (der)
 * sobre el run funcional (useEstudioRun → GET /tenant-scoring/:runId →
 * deriveEstudioDecision). Tabs lazy-mount (la inactiva se desmonta) y el tab
 * activo se refleja en ?tab= (router.replace, scroll:false).
 *
 * Estados del run: skeleton (primera carga) · 404 (notAvailable) · en proceso
 * (pending/processing) · error (failed) · completado (decisión). UX-only:
 * `onAction` relayea el código (T-323: nunca un rechazo automático).
 */

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FileMagnifyingGlass, ArrowClockwise } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/data-display/EmptyState'
import { useEstudioRun } from '@/lib/hooks/estudio/use-estudio-run'
import type { EstudioActionCode } from '@/lib/estudio/decision'
import { EstudioDetailSkeleton } from '@/components/skeleton/panel/EstudioDetailSkeleton'
import { EstudioSidebar } from './EstudioSidebar'
import { EstudioRecommendationRail } from './EstudioRecommendationRail'
import { DecisionTab } from './tabs/DecisionTab'
import { IndicadoresTab } from './tabs/IndicadoresTab'
import { DocumentosTab } from './tabs/DocumentosTab'
import { ConsistenciaTab } from './tabs/ConsistenciaTab'
import { RacionalTab } from './tabs/RacionalTab'
import { HistorialTab } from './tabs/HistorialTab'
import { ConversacionesTab } from './tabs/ConversacionesTab'
import { CodeudoresTab } from './tabs/CodeudoresTab'
import { ReporteTab } from './tabs/ReporteTab'
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'

const NS = 'inmobiliaria.ai.estudio'

type TabKey =
  | 'decision'
  | 'indicadores'
  | 'documentos'
  | 'consistencia'
  | 'racional'
  | 'historial'
  | 'conversaciones'
  | 'codeudores'
  | 'reporte'
const TAB_KEYS: TabKey[] = [
  'decision',
  'indicadores',
  'documentos',
  'consistencia',
  'racional',
  'historial',
  'conversaciones',
  'codeudores',
  'reporte',
]

/** Fallback (es) por si la clave i18n aún no existe. */
const TAB_LABELS_ES: Record<TabKey, string> = {
  decision: 'Decisión',
  indicadores: 'Indicadores',
  documentos: 'Documentos',
  consistencia: 'Consistencia',
  racional: 'Racional',
  historial: 'Historial',
  conversaciones: 'Conversaciones',
  codeudores: 'Codeudores',
  reporte: 'Reporte',
}

export default function EstudioDetailClient({ runId }: { runId: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { status, result, decision, isLoading, error, notAvailable, refetch } = useEstudioRun(runId)

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  const queryTab = searchParams.get('tab')
  const [activeTab, setTab] = useState<TabKey>(
    (TAB_KEYS as string[]).includes(queryTab ?? '') ? (queryTab as TabKey) : 'decision',
  )

  const onTabChange = useCallback(
    (k: TabKey) => {
      setTab(k)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', k)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const onAction = useCallback(
    (code: EstudioActionCode) => {
      // UX-only: donde hay un destino natural navegamos; el resto queda como
      // placeholder de la visión hasta que tenga backend (compartir/descargar/
      // codeudor/contrato/…). T-323: ninguna acción descarta automáticamente.
      if (code === 'enviar_a_asegurabilidad') {
        router.push('/panel/inmobiliaria/ai/asegurabilidad/nueva')
      } else if (code === 'buscar_otro_candidato' || code === 'sugerir_inmueble_menor') {
        router.push('/panel/inmobiliaria/ai/matching')
      }
    },
    [router],
  )

  // ── Skeleton (primera carga, sin respuesta aún) ──────────────────────────
  if (isLoading && status === null && !notAvailable && !error) {
    return <EstudioDetailSkeleton />
  }

  // ── 404 — run inexistente o ajeno ────────────────────────────────────────
  if (notAvailable) {
    return (
      <main className="p-4 lg:p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={FileMagnifyingGlass}
          title={tf(`${NS}.detalle.noDisponibleTitulo`, 'Estudio no disponible')}
          description={tf(
            `${NS}.detalle.noDisponibleDesc`,
            'Este estudio no existe o no pertenece a tu agencia.',
          )}
          primaryCta={{
            label: tf(`${NS}.detalle.volverLista`, 'Volver a estudios'),
            href: '/panel/inmobiliaria/ai/estudio/estudios',
          }}
        />
      </main>
    )
  }

  const inProgress = status === 'pending' || status === 'processing'

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <header className="mb-5">
        <VolverALaLista
          href="/panel/inmobiliaria/ai/estudio/estudios"
          label={t('inmobiliaria.ai.volverA.estudios')}
          className="mb-2"
        />
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {tf(`${NS}.detalle.titulo`, 'Detalle del estudio')}
        </h1>
        <p className="text-fg-subtle mt-0.5 text-xs tabular-nums">{runId.slice(0, 8)}</p>
      </header>

      {/* Error banner (no bloqueante) */}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-3"
        >
          <span className="text-sm text-danger">
            {tf(`${NS}.detalle.error`, 'No se pudo cargar el estudio')}: {error}
          </span>
          <Button variant="outline" size="sm" hideArrow onClick={() => void refetch()}>
            <ArrowClockwise className="w-3.5 h-3.5" weight="bold" aria-hidden="true" />
            {tf(`${NS}.detalle.reintentar`, 'Reintentar')}
          </Button>
        </div>
      )}

      {/* 3-zonas: contexto | expediente | recomendación */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[320px_minmax(0,1fr)_320px] lg:items-start">
        {/* IZQUIERDA — contexto */}
        <div className="lg:sticky lg:top-4 min-w-0">
          <EstudioSidebar decision={decision} result={result} isLoading={isLoading} />
        </div>

        {/* CENTRO — expediente (tabs) */}
        <section className="min-w-0 space-y-4">
          <h2 className="flex items-center gap-2">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {tf(`${NS}.detalle.expediente`, 'Expediente')}
            </span>
          </h2>

          {inProgress || !decision || !result ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              {inProgress ? (
                <>
                  <Spinner size="md" className="mx-auto" aria-hidden="true" />
                  <p className="mt-3 text-sm text-fg-muted">
                    {tf(`${NS}.detalle.enProceso`, 'El estudio está en proceso. Te mostraremos la decisión apenas termine.')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-fg-muted">
                  {tf(`${NS}.detalle.sinDatos`, 'Aún no hay datos del estudio.')}
                </p>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabKey)}>
              <TabsList
                variant="underline"
                aria-label={tf(`${NS}.detalle.expediente`, 'Expediente')}
              >
                {TAB_KEYS.map((k) => (
                  <TabsTrigger
                    key={k}
                    value={k}
                    data-testid={`tab-${k}`}
                    className="whitespace-nowrap"
                  >
                    {tf(`${NS}.detalle.tabs.${k}`, TAB_LABELS_ES[k])}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab}>
                {activeTab === 'decision' && <DecisionTab decision={decision} onAction={onAction} />}
                {activeTab === 'indicadores' && <IndicadoresTab decision={decision} />}
                {activeTab === 'documentos' && <DocumentosTab result={result} />}
                {activeTab === 'consistencia' && <ConsistenciaTab result={result} />}
                {activeTab === 'racional' && <RacionalTab decision={decision} result={result} />}
                {activeTab === 'historial' && <HistorialTab decision={decision} result={result} />}
                {activeTab === 'conversaciones' && (
                  <ConversacionesTab decision={decision} result={result} />
                )}
                {activeTab === 'codeudores' && <CodeudoresTab decision={decision} result={result} />}
                {activeTab === 'reporte' && <ReporteTab decision={decision} result={result} />}
              </TabsContent>
            </Tabs>
          )}
        </section>

        {/* DERECHA — recomendación IA */}
        <div className="lg:sticky lg:top-4 min-w-0">
          <EstudioRecommendationRail decision={decision} runId={runId} onAction={onAction} />
        </div>
      </div>
    </main>
  )
}
