'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-02 | XR-05
// Cotizador streaming detail page.
// T-30-06-E: PageGuard enforces cotizador:view before any component mounts.

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { PageGuard } from '@/components/auth/PageGuard'
import { useQuoteStream } from '@/lib/hooks/cotizador/use-quote-stream'
import { QuoteHeader } from '@/components/inmobiliaria/cotizador/QuoteHeader'
import { CarrierStreamGrid } from '@/components/inmobiliaria/cotizador/CarrierStreamGrid'
import { StreamCompleteBanner } from '@/components/inmobiliaria/cotizador/StreamCompleteBanner'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

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

  const allFinal =
    carriers.length > 0 && carriers.every(c => c.status !== 'pending')
  const isStubMode = carriers.length > 0 && carriers.every(c => c.isStub)

  // TODO (plan 30-01): wire quote metadata (cedula, canon, ciudad, tipo, codeudores)
  // from the quote metadata endpoint. For now we display quoteId[:8] as reference
  // and "—" for all inputs until the metadata endpoint is available.
  const timestamp = new Date().toISOString()

  const handleBack = () => router.push('/panel/inmobiliaria/ai/cotizador')
  const handleDownloadPdf = () => {
    // Wired in plan 30-07
  }
  const handleReQuote = () => {
    // Phase 33 placeholder — button is disabled
  }

  if (!canView) {
    // Layout already handles 403, but belt-and-suspenders guard
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <QuoteHeader
        quoteId={quoteId}
        cedula={quoteId.slice(0, 8)}
        timestamp={timestamp}
        canonCop={null}
        ciudad={null}
        tipo={null}
        codeudores={null}
        totalCostUsd={totalCostUsd}
        isConnected={isConnected}
      />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

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
            onDownloadPdf={handleDownloadPdf}
            onBack={handleBack}
            locale={locale}
          />
        )}

        {/* Carrier cards grid (always rendered — shows pending skeletons while streaming) */}
        <CarrierStreamGrid carriers={carriers} locale={locale} />
      </main>
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
