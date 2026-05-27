'use client'
// Phase 30 plan 30-06 | 30-07 | COTI-UI-03 | XR-02 | XR-05
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

  const allFinal =
    carriers.length > 0 && carriers.every(c => c.status !== 'pending')
  const isStubMode = carriers.length > 0 && carriers.every(c => c.isStub)

  // TODO (plan 30-01): wire quote metadata (cedula, canon, ciudad, tipo, codeudores)
  // from the quote metadata endpoint. For now we display quoteId[:8] as reference
  // and "—" for all inputs until the metadata endpoint is available.
  const timestamp = new Date().toISOString()

  // Build VerdictPdfProps from available data.
  // cedula_display is a hash-redacted string — first 2 + "•••" + last 3 chars of quoteId
  // (quoteId is a quote UUID, not raw cédula — T-30-07-01 safe).
  const cedula_display =
    quoteId.length >= 8
      ? `${quoteId.slice(0, 2)}•••${quoteId.slice(-3)}`
      : quoteId

  const verdictPdfProps: VerdictPdfProps | undefined = allFinal
    ? {
        quote: {
          cedula_hash: quoteId,
          cedula_display,
          canon: 0,         // Phase 30-01 TODO: replace with real metadata
          ciudad: '—',      // Phase 30-01 TODO: replace with real metadata
          tipo: '—',        // Phase 30-01 TODO: replace with real metadata
          codeudores: 0,    // Phase 30-01 TODO: replace with real metadata
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

  // Filename: cotizacion-{first 8 hex chars of quoteId}-{YYYY-MM-DD}
  const pdfFilenamePrefix = `cotizacion-${quoteId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}`

  const handleBack = () => router.push('/panel/inmobiliaria/ai/cotizador')
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
            onBack={handleBack}
            locale={locale}
            verdictPdfProps={verdictPdfProps}
            pdfFilenamePrefix={pdfFilenamePrefix}
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
