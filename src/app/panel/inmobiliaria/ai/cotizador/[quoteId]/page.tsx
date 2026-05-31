'use client'
// Phase 30 plan 30-06 | 30-07 | COTI-UI-03 | XR-02 | XR-05
// Phase 33 plan 33-05 | COTI-UI-04 | COTI-UI-05 | XR-05
// Cotizador streaming detail page.
// T-30-06-E: PageGuard enforces cotizador:view before any component mounts.
// D-33-10 / D-33-11: Phase 33 wires the two header actions ("Pedir explicación"
// + "Re-cotizar con cambios") and the ReQuoteOfBadge subtitle.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { PageGuard } from '@/components/auth/PageGuard'
import { useQuoteStream } from '@/lib/hooks/cotizador/use-quote-stream'
import { useQuoteMetadata } from '@/lib/hooks/cotizador/use-quote-metadata'
import { QuoteHeader } from '@/components/inmobiliaria/cotizador/QuoteHeader'
import { CarrierStreamGrid } from '@/components/inmobiliaria/cotizador/CarrierStreamGrid'
import { StreamCompleteBanner } from '@/components/inmobiliaria/cotizador/StreamCompleteBanner'
import { CounterfactualModal } from '@/components/cotizador/CounterfactualModal'
import { ReQuoteOfBadge } from '@/components/cotizador/ReQuoteOfBadge'
import { CotizadorQuoteDetailSkeleton } from '@/components/skeleton/panel/CotizadorQuoteDetailSkeleton'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import type { VerdictPdfProps } from '@/lib/cotizador/pdf-verdict-document'

// ---------------------------------------------------------------------------
// Inner component (rendered inside PageGuard — auth is guaranteed)
// ---------------------------------------------------------------------------

function QuoteDetailContent({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const { agency } = useAuth()
  const { canAccess } = usePermissionsContext()
  const { t, locale } = useI18n()

  const canView = canAccess('cotizador', 'view')

  const { carriers, totalCostUsd, isConnected, error, reconnect } = useQuoteStream(
    quoteId,
    agency?.id ?? null,
  )

  // F-02 fix: fetch persisted quote metadata in parallel with the SSE stream.
  // Surfaces canon/ciudad/tipo + cedulaHashPrefix8 + createdAt into the page
  // header + PDF inputs summary. codeudoresCount is not persisted in the DB
  // (wizard input only — used at quote-time, dropped after), so it stays 0.
  const { data: metadata } = useQuoteMetadata(quoteId)

  // Phase 33: counterfactual modal open flag (D-33-01..D-33-13).
  const [modalOpen, setModalOpen] = useState(false)

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

  // cedula_display uses the DB cedulaHashPrefix8 (8-char sha256 prefix) — not
  // quoteId. quoteId is a UUID, cedulaHashPrefix8 is hash-derived from the raw
  // cédula at submit time. Fall back to a UUID slice while metadata is loading.
  const cedula_display = metadata
    ? `${metadata.cedulaHashPrefix8.slice(0, 2)}•••${metadata.cedulaHashPrefix8.slice(-3)}`
    : `${quoteId.slice(0, 2)}•••${quoteId.slice(-3)}`

  const verdictPdfProps: VerdictPdfProps | undefined = allFinal
    ? {
        quote: {
          cedula_hash: metadata?.cedulaHashPrefix8 ?? quoteId.slice(0, 8),
          cedula_display,
          canon: metadata?.canonCop ?? 0,
          ciudad: metadata?.ciudad ?? '—',
          tipo: metadata?.tipoInmueble ?? '—',
          codeudores: 0, // Not persisted in DB — wizard-time input only
          createdAt: timestamp,
        },
        carriers: carriers.map(c => {
          // Map CarrierState status to VerdictPdfProps verdict
          // 'conditional' and 'pending' are not in VerdictPdfProps — map to nearest
          type PdfVerdict = VerdictPdfProps['carriers'][0]['verdict']
          const verdict: PdfVerdict =
            c.status === 'approved' ? 'approved'
            : c.status === 'rejected' ? 'rejected'
            : c.status === 'error' ? 'error'
            : 'stub' // covers pending, conditional, stub
          return {
            name: c.carrier,
            verdict,
            prima_mensual: c.primaMensualCop,
            condiciones: c.condiciones.length > 0 ? c.condiciones.join('. ') : null,
            motivo_rechazo: c.motivoRechazo,
          }
        }),
        agency: {
          name: agency?.name ?? 'Inmobiliaria',
          contact: agency?.email ?? '',
        },
      }
    : undefined

  // Filename: cotizacion-{cedulaHashPrefix8}-{YYYY-MM-DD} (PII-safe — NEVER raw cédula)
  const pdfFilenamePrefix = `cotizacion-${metadata?.cedulaHashPrefix8 ?? quoteId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}`

  const handleBack = () => router.push('/panel/inmobiliaria/ai/cotizador')

  // D-33-10: navigate to the re-quote wizard with the current quoteId as the
  // ?from= seed (Plan 33-06 wizard pre-fills from this).
  const handleReQuote = () => {
    router.push(`/panel/inmobiliaria/ai/cotizador/nueva?from=${quoteId}`)
  }

  // D-33-11: open the counterfactual modal.
  const handlePedirExplicacion = () => setModalOpen(true)

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

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

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
            className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-3"
          >
            <span className="text-body-sm text-amber-700 dark:text-amber-400">
              {t('inmobiliaria.ai.cotizador.detail.connectionInterrupted')}
            </span>
            <Button variant="outline" size="sm" onClick={reconnect}>
              {t('inmobiliaria.ai.cotizador.detail.retry')}
            </Button>
          </div>
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
            verdictPdfProps={verdictPdfProps}
            pdfFilenamePrefix={pdfFilenamePrefix}
          />
        )}

        {/* Carrier cards grid (always rendered — shows pending skeletons while streaming) */}
        <CarrierStreamGrid carriers={carriers} locale={locale} />
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
