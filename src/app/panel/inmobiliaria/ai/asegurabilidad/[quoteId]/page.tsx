'use client'
// Phase 30 plan 30-06 | 30-07 | COTI-UI-03 | XR-02 | XR-05
// Phase 33 plan 33-05 | COTI-UI-04 | COTI-UI-05 | XR-05
// Cotizador streaming detail page.
// T-30-06-E: PageGuard enforces cotizador:view before any component mounts.
// D-33-10 / D-33-11: Phase 33 wires the two header actions ("Pedir explicación"
// + "Re-cotizar con cambios") and the ReQuoteOfBadge subtitle.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { PageGuard } from '@/components/auth/PageGuard'
import { useQuoteStream } from '@/lib/hooks/cotizador/use-quote-stream'
import { useQuoteMetadata } from '@/lib/hooks/cotizador/use-quote-metadata'
import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import { AccionSugerida } from '@/components/inmobiliaria/ai/AccionSugerida'
import { QuoteHeader } from '@/components/inmobiliaria/cotizador/QuoteHeader'
import { CarrierStreamGrid } from '@/components/inmobiliaria/cotizador/CarrierStreamGrid'
import { VeredictoAsegurabilidad } from '@/components/inmobiliaria/cotizador/VeredictoAsegurabilidad'
import { MatrizAsegurabilidad } from '@/components/inmobiliaria/cotizador/MatrizAsegurabilidad'
import { RecoveryAsegurabilidad } from '@/components/inmobiliaria/cotizador/RecoveryAsegurabilidad'
import { deriveRecovery } from '@/lib/cotizador/verdict-derive'
import { StreamCompleteBanner } from '@/components/inmobiliaria/cotizador/StreamCompleteBanner'
import { CounterfactualModal } from '@/components/cotizador/CounterfactualModal'
import { ReQuoteOfBadge } from '@/components/cotizador/ReQuoteOfBadge'
import { CotizadorQuoteDetailSkeleton } from '@/components/skeleton/panel/CotizadorQuoteDetailSkeleton'
import { usePdfDownload } from '@/lib/cotizador/use-pdf-download'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { CasoSidebar } from './CasoSidebar'
import { RecomendacionRail } from './RecomendacionRail'
import { MatrizActionBar, type MatrizActionCode } from './MatrizActionBar'
import type { PostSeleccionCode } from './PostSeleccionSheet'

// ---------------------------------------------------------------------------
// Inner component (rendered inside PageGuard — auth is guaranteed)
// ---------------------------------------------------------------------------

function QuoteDetailContent({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const { agency } = useAuth()
  const { canAccess } = usePermissionsContext()
  const { t, locale } = useI18n()

  const canView = canAccess('cotizador', 'view')

  const { events, carriers, totalCostUsd, finalVerdict, partialRanking, isConnected, error, reconnect } = useQuoteStream(
    quoteId,
    agency?.id ?? null,
  )

  // W2: the agent.recovery frame is accumulated in `events` but not projected
  // into a named hook field — derive the latest one here. Feeds the recovery
  // "nadie lo asegura" paths (visión #10). Null when no recovery arrived.
  const recovery = deriveRecovery(events)

  // F-02 fix: fetch persisted quote metadata in parallel with the SSE stream.
  // Surfaces canon/ciudad/tipo + cedulaHashPrefix8 + createdAt into the page
  // header + PDF inputs summary. codeudoresCount is not persisted in the DB
  // (wizard input only — used at quote-time, dropped after), so it stays 0.
  const { data: metadata } = useQuoteMetadata(quoteId)

  // Phase 33: counterfactual modal open flag (D-33-01..D-33-13).
  const [modalOpen, setModalOpen] = useState(false)

  // F10: the cotizador work-item (read-only triage — actions usually []) for
  // this quote. 404 / notAvailable / error → the panel silently renders
  // nothing; the streaming page is untouched.
  const verdictItem = useWorkItemDetail('cotizador', quoteId)

  // ARIA live region — announce each carrier verdict transition (pending →
  // final) to screen readers (Phase 38 plan 38-04c / XR-06 / WCAG 4.1.3).
  // Strings are i18n-translated; raw SSE event payloads (debtor PII, condiciones)
  // never reach the live region.
  const [lastVerdictAnnouncement, setLastVerdictAnnouncement] = useState('')
  const prevCarrierStatusRef = useRef<Record<string, string>>({})

  useEffect(() => {
    for (const c of carriers) {
      const prevStatus = prevCarrierStatusRef.current[c.carrier]
      if (
        prevStatus === 'pending' &&
        c.status !== 'pending'
      ) {
        // i18n verdict label — falls back to raw status string only as a guard
        const verdictKey =
          c.status === 'approved' ? 'approvedLabel'
          : c.status === 'rejected' ? 'rejectedLabel'
          : c.status === 'conditional' ? 'conditionalLabel'
          : c.status === 'error' ? 'errorLabel'
          : c.status === 'stub' ? 'stubLabel'
          : null
        const resultLabel = verdictKey
          ? t(`inmobiliaria.ai.cotizador.detail.carrier.${verdictKey}`)
          : c.status
        setLastVerdictAnnouncement(
          t('inmobiliaria.ai.cotizador.detail.liveRegion.carrierVerdict', {
            carrier: c.carrier,
            result: resultLabel,
          }),
        )
      }
      prevCarrierStatusRef.current[c.carrier] = c.status
    }
  }, [carriers, t])

  const allFinal =
    carriers.length > 0 && carriers.every(c => c.status !== 'pending')
  const isStubMode = carriers.length > 0 && carriers.every(c => c.isStub)

  // D-33-10: header buttons visible whenever ≥1 carrier has a final verdict —
  // does NOT require allFinal so operators can re-quote / ask-why even when a
  // single carrier is still streaming.
  const hasAnyVerdict = carriers.some(c => c.status !== 'pending')

  // Prefer the persisted createdAt from metadata over Date.now() so refreshes
  // show the original quote timestamp instead of a moving target.
  const timestamp = metadata?.createdAt ?? new Date().toISOString()

  // Filename: cotizacion-{cedulaHashPrefix8}-{YYYY-MM-DD} (PII-safe — NEVER raw cédula)
  // Phase 38 plan 38-07 (D-38-09): PDF is now rendered server-side. The page
  // only forwards agencyId + quoteId + filenamePrefix to StreamCompleteBanner;
  // the prior in-component PDF props construction is removed.
  const pdfFilenamePrefix = `cotizacion-${metadata?.cedulaHashPrefix8 ?? quoteId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}`

  const handleBack = () => router.push('/panel/inmobiliaria/ai/asegurabilidad')

  // D-33-10: navigate to the re-quote wizard with the current quoteId as the
  // ?from= seed (Plan 33-06 wizard pre-fills from this).
  const handleReQuote = () => {
    router.push(`/panel/inmobiliaria/ai/asegurabilidad/nueva?from=${quoteId}`)
  }

  // D-33-11: open the counterfactual modal.
  const handlePedirExplicacion = () => setModalOpen(true)

  // Descargar PDF — reusa el endpoint backend (mismo path que StreamCompleteBanner).
  // El botón de la barra de acciones delega aquí cuando hay agency + quote.
  const { downloadPdf } = usePdfDownload({
    agencyId: agency?.id ?? '',
    quoteId,
    filenamePrefix: pdfFilenamePrefix,
  })

  // Patrón de honestidad: las acciones que aún NO tienen backend (avanzar /
  // comparar / codeudor / compartir / contrato + radicar / expediente /
  // notificar / propietario / guardar) NO inventan un endpoint — muestran un
  // aviso inline "Próximamente" (NO toast — aquí no hay sistema de toast para
  // estados informativos persistentes). Las que SÍ tienen destino natural
  // reutilizan los handlers existentes (descargar PDF / re-cotizar / resolver).
  const [proximamente, setProximamente] = useState<string | null>(null)

  // Barra de acciones (visión #8/#21): mapea cada código a su comportamiento.
  const handleMatrizAction = (code: MatrizActionCode) => {
    setProximamente(null)
    switch (code) {
      case 'descargar':
        void downloadPdf()
        return
      // Sin backend todavía → aviso honesto inline.
      case 'avanzar':
      case 'comparar':
      case 'codeudor':
      case 'compartir':
      case 'contrato':
        setProximamente(
          t(`inmobiliaria.ai.cotizador.detail.acciones.${code}`),
        )
        return
      default:
        return
    }
  }

  // Pasos post-selección (visión #22): los de destino natural navegan; el resto
  // queda como "Próximamente".
  const handlePostSeleccion = (code: PostSeleccionCode) => {
    setProximamente(null)
    if (code === 'contrato') {
      // mismo destino que "Enviar a contrato" — aún sin backend.
      setProximamente(t('inmobiliaria.ai.cotizador.detail.postSeleccion.contrato'))
      return
    }
    // radicar / expediente / notificar / propietario / guardar → próximamente.
    setProximamente(t(`inmobiliaria.ai.cotizador.detail.postSeleccion.${code}`))
  }

  // D-33-13: when the wrapper returns 404 (quote stale / wrong tenant), close
  // the modal and surface a toast — the user can navigate back to the index.
  const handleQuote404 = () => {
    setModalOpen(false)
    toast.error(t('inmobiliaria.ai.cotizador.askWhy.error404'))
  }

  if (!canView) {
    // Layout already handles 403, but belt-and-suspenders guard
    return null
  }

  // ── Skeleton guard (Phase 38 plan 38-04b / D-38-04 detail rule) ───────────
  // First real loading state for this page (RESEARCH Topic 9: previous count=1
  // was superficial). Fires while SSE is still connecting and no carriers have
  // arrived yet. NO EmptyState — dynamic route only loads when quote exists;
  // 404 path handles not-found.
  if (carriers.length === 0 && !isConnected && !error) {
    return <CotizadorQuoteDetailSkeleton />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <QuoteHeader
        quoteId={quoteId}
        cedula={metadata?.cedulaHashPrefix8 ?? quoteId.slice(0, 8)}
        timestamp={timestamp}
        canonCop={metadata?.canonCop ?? null}
        ciudad={metadata?.ciudad ?? null}
        tipo={metadata?.tipoInmueble ?? null}
        codeudores={null}
        totalCostUsd={totalCostUsd}
        isConnected={isConnected}
      />

      {/* Main content — ficha del caso en 3 columnas (visión #14):
          contexto (izq) | comparación + acciones (centro) | recomendación (der). */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ARIA live region — announces carrier verdict transitions to SR */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {lastVerdictAnnouncement}
        </div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:items-start">
          {/* ── IZQUIERDA — Caso (contexto) ──────────────────────────────── */}
          <div className="lg:sticky lg:top-4 min-w-0">
            <CasoSidebar
              metadata={metadata ?? null}
              finalVerdict={finalVerdict}
              isConnected={isConnected}
            />
          </div>

          {/* ── CENTRO — comparación + acciones (cableado UNCHANGED) ──────── */}
          <section className="min-w-0 space-y-6">
            {/* Re-quote lineage subtitle (D-33-11) — visible only when this quote
                originated as a re-quote of a previous one. */}
            {metadata?.reQuoteOf && (
              <ReQuoteOfBadge parentId={metadata.reQuoteOf} />
            )}

            {/* Phase 33 header action row (D-33-10): visible when operator has
                cotizador:view AND at least one carrier has a final verdict. */}
            {canView && hasAnyVerdict && (
              <div className="flex gap-2 justify-end" data-testid="phase33-action-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePedirExplicacion}
                  aria-label={t('inmobiliaria.ai.cotizador.detail.pedirExplicacionButton')}
                >
                  {t('inmobiliaria.ai.cotizador.detail.pedirExplicacionButton')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReQuote}
                  aria-label={t('inmobiliaria.ai.cotizador.detail.reQuoteButton')}
                >
                  {t('inmobiliaria.ai.cotizador.detail.reQuoteButton')}
                </Button>
              </div>
            )}

            {/* Reconnection error banner */}
            {error && !isConnected && (
              <div
                role="alert"
                className="rounded-xl border border-warning/30 bg-warning-soft p-4 flex items-center justify-between gap-3"
              >
                <span className="text-sm text-warning">
                  {t('inmobiliaria.ai.cotizador.detail.connectionInterrupted')}
                </span>
                <Button variant="outline" size="sm" hideArrow onClick={reconnect}>
                  {t('inmobiliaria.ai.cotizador.detail.retry')}
                </Button>
              </div>
            )}

            {/* CONCLUSIÓN + RECOMENDACIÓN en lenguaje natural — aparece cuando el
                agente emite agent.final_verdict. Mientras tanto, el grid de abajo
                muestra el estado de carga (skeletons pending). Si asegurabilidad
                es 'no' el componente NO renderiza recomendación (W2 = recovery). */}
            {finalVerdict && (
              <VeredictoAsegurabilidad
                finalVerdict={finalVerdict}
                partialRanking={partialRanking}
                carriers={carriers}
                stubMode={isStubMode}
              />
            )}

            {/* Completion banner — appears when all carriers final */}
            {allFinal && (
              <StreamCompleteBanner
                carrierCount={carriers.length}
                totalCostUsd={totalCostUsd}
                isStubMode={isStubMode}
                onReQuote={handleReQuote}
                onBack={handleBack}
                locale={locale}
                agencyId={agency?.id}
                quoteId={quoteId}
                pdfFilenamePrefix={pdfFilenamePrefix}
              />
            )}

            {/* F10 — verdict del agente como AccionSugerida (compact panel).
                Renders ONLY when the work-item detail resolves; cotizador items
                are read-only triage so `actions` is usually [] and the card shows
                the verdict narrative (label + confianza + razón + evidencia). */}
            {verdictItem.data && (
              <AccionSugerida
                accion={verdictItem.data.item.accionSugerida}
                actions={verdictItem.data.item.actions}
                onAction={async (action, body) => {
                  const res = await runWorkItemAction(action, body)
                  if (res.ok) void verdictItem.refetch()
                  return res
                }}
              />
            )}

            {/* Carrier cards grid (always rendered — shows pending skeletons while streaming) */}
            <CarrierStreamGrid carriers={carriers} locale={locale} />

            {/* ════════════════════════════════════════════════════════════
                W2 — SECCIONES INFERIORES (debajo de la conclusión de W1).
                Propiedad de W2: matriz comparativa + recovery + condicionado.
                Editar SOLO dentro de este bloque para no chocar con W1/W3.
                ════════════════════════════════════════════════════════════ */}

            {/* MATRIZ comparativa (visión #8, #13) — aseguradora × {resultado,
                condición, costo estimado, tiempo, recomendación}. Toggle matriz /
                tarjetas. Aparece cuando ≥1 aseguradora tiene veredicto; los stubs
                van etiquetados "Estimado · Prevalidación Leasefy". */}
            {hasAnyVerdict && <MatrizAsegurabilidad carriers={carriers} />}

            {/* Barra de acciones (visión #8/#21) — debajo de la matriz. Aparece
                con ≥1 veredicto. Descargar reusa el path de PDF; re-cotizar /
                resolver / reconectar usan los handlers existentes; el resto
                degrada a "Próximamente" (aviso inline abajo). */}
            {hasAnyVerdict && (
              <MatrizActionBar
                carriers={carriers}
                onReQuote={handleReQuote}
                onResolver={handlePedirExplicacion}
                onReconnect={reconnect}
                onDownload={allFinal && !isStubMode ? downloadPdf : undefined}
                onAction={handleMatrizAction}
              />
            )}

            {/* Aviso "Próximamente" (patrón de honestidad — NO toast): las
                acciones sin backend explican que están por llegar en lugar de
                fallar en silencio. */}
            {proximamente && (
              <div
                role="status"
                className="rounded-xl border border-border bg-surface-muted p-3 flex items-center justify-between gap-3"
              >
                <span className="text-sm text-fg-muted">
                  <span className="font-medium text-fg">
                    {proximamente}
                  </span>{' '}
                  {t('inmobiliaria.ai.cotizador.detail.acciones.proximamente') ===
                  'inmobiliaria.ai.cotizador.detail.acciones.proximamente'
                    ? 'estará disponible próximamente.'
                    : t('inmobiliaria.ai.cotizador.detail.acciones.proximamente')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  onClick={() => setProximamente(null)}
                  className="shrink-0 text-fg-muted"
                >
                  {t('inmobiliaria.ai.cotizador.detail.acciones.cerrar') ===
                  'inmobiliaria.ai.cotizador.detail.acciones.cerrar'
                    ? 'Cerrar'
                    : t('inmobiliaria.ai.cotizador.detail.acciones.cerrar')}
                </Button>
              </div>
            )}

            {/* RECOVERY "nadie lo asegura" (visión #10) + CONDICIONADO (visión #11).
                - Recovery: solo cuando final_verdict.asegurabilidad === 'no'.
                  CTA "Re-cotizar con cambios" reutiliza el flujo existente
                  (handleReQuote → wizard ?from=).
                - Condicionado: cuando hay carriers conditional; "Resolver
                  condiciones" abre el CounterfactualModal (handlePedirExplicacion). */}
            <RecoveryAsegurabilidad
              asegurabilidad={finalVerdict?.asegurabilidad ?? null}
              recovery={recovery}
              carriers={carriers}
              onReQuote={handleReQuote}
              onResolverCondiciones={handlePedirExplicacion}
            />
            {/* ═══════════════ FIN SECCIONES INFERIORES W2 ════════════════ */}
          </section>

          {/* ── DERECHA — Recomendación + post-selección ─────────────────── */}
          <div className="lg:sticky lg:top-4 min-w-0">
            <RecomendacionRail
              finalVerdict={finalVerdict}
              carriers={carriers}
              onAvanzar={() => handleMatrizAction('avanzar')}
              onReQuote={handleReQuote}
              onPostSeleccion={handlePostSeleccion}
            />
          </div>
        </div>
      </main>

      {/* Phase 33 counterfactual modal — mounted at root so portal stacking
          is unaffected by the sticky header z-index. codeudores: 0 is the
          documented limitation (wizard-only input, not persisted per D-08). */}
      <CounterfactualModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        quoteId={quoteId}
        originalCarriers={carriers}
        originalInputs={{
          canonCop: metadata?.canonCop ?? 0,
          ciudad: metadata?.ciudad ?? '',
          tipo: metadata?.tipoInmueble ?? '',
          codeudores: 0,
        }}
        onQuote404={handleQuote404}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Default export — wrapped with PageGuard
// ---------------------------------------------------------------------------

export default function QuoteDetailPage({
  params,
}: {
  params: { quoteId: string }
}) {
  return (
    <PageGuard module="cotizador" action="view">
      <QuoteDetailContent quoteId={params.quoteId} />
    </PageGuard>
  )
}
