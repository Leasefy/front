'use client'
// Phase 30 plan 30-06 | 30-07 | COTI-UI-03 | XR-02 | XR-05
// Cotizador streaming detail page.
// T-30-06-E: PageGuard enforces cotizador:view before any component mounts.

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { PageGuard } from '@/components/auth/PageGuard'
import { useQuoteStream } from '@/lib/hooks/cotizador/use-quote-stream'
import { useQuoteMetadata } from '@/lib/hooks/cotizador/use-quote-metadata'
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

  // F-02 fix: fetch persisted quote metadata in parallel with the SSE stream.
  // Surfaces canon/ciudad/tipo + cedulaHashPrefix8 + createdAt into the page
  // header + PDF inputs summary. codeudoresCount is not persisted in the DB
  // (wizard input only — used at quote-time, dropped after), so it stays 0.
  const { data: metadata } = useQuoteMetadata(quoteId)

  const allFinal =
    carriers.length > 0 && carriers.every(c => c.status !== 'pending')
  const isStubMode = carriers.length > 0 && carriers.every(c => c.isStub)

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
