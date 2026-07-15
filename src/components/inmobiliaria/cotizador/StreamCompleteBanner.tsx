'use client'
// Phase 30 plan 30-06 | 30-07 | COTI-UI-03 | XR-05
// Phase 38 plan 38-07 (D-38-09) — PDF download migrated to backend endpoint.
// The hook now takes { agencyId, quoteId, filenamePrefix } instead of the
// rich VerdictPdfProps object — backend renders the PDF.

import { CheckCircle, FilePdf, ArrowCounterClockwise, ArrowLeft } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { usePdfDownload } from '@/lib/cotizador/use-pdf-download'

interface StreamCompleteBannerProps {
  carrierCount: number
  totalCostUsd: number
  isStubMode: boolean         // true when all carriers are stubs
  onReQuote: () => void       // Phase 33 placeholder
  /** @deprecated — PDF download is now handled internally via usePdfDownload */
  onDownloadPdf?: () => void
  onBack: () => void          // navigate to cotizador overview
  locale?: string
  /** Agency id for the backend PDF URL (required for non-stub mode) */
  agencyId?: string
  /** Quote id for the backend PDF URL (required for non-stub mode) */
  quoteId?: string
  /** Prefix for the filename: cotizacion-{cedula_hash_first8}-{YYYY-MM-DD} */
  pdfFilenamePrefix?: string
}

export function StreamCompleteBanner({
  carrierCount,
  totalCostUsd,
  isStubMode,
  onReQuote,
  onBack,
  agencyId,
  quoteId,
  pdfFilenamePrefix,
}: StreamCompleteBannerProps) {
  const { t } = useI18n()

  // Build safe defaults so usePdfDownload is always called (Rules of Hooks).
  // The button is disabled when agencyId or quoteId are missing — the safe
  // strings are placeholders only.
  const safeAgencyId = agencyId ?? ''
  const safeQuoteId = quoteId ?? ''
  const safeFilenamePrefix = pdfFilenamePrefix ?? 'cotizacion-00000000'

  const { downloadPdf, isGenerating } = usePdfDownload({
    agencyId: safeAgencyId,
    quoteId: safeQuoteId,
    filenamePrefix: safeFilenamePrefix,
  })

  if (isStubMode) {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-surface-muted p-5 flex items-center justify-between gap-4 flex-wrap"
      >
        <p className="text-sm font-medium text-fg-muted">
          {t('inmobiliaria.ai.cotizador.detail.banner.stubModeWarning')}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={onBack}
          >
            <ArrowLeft weight="regular" className="w-4 h-4" />
            {t('inmobiliaria.ai.cotizador.detail.banner.backButton')}
          </Button>
        </div>
      </div>
    )
  }

  // PDF button is functional only when we have both ids
  const pdfReady = Boolean(agencyId) && Boolean(quoteId)

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-success/30 bg-success-soft p-5 flex items-center justify-between gap-4 flex-wrap"
    >
      {/* Left: completion summary */}
      <div className="flex items-center gap-3">
        <CheckCircle weight="fill" className="w-6 h-6 text-success shrink-0" />
        <div>
          <p className="font-medium text-success text-sm">
            {t('inmobiliaria.ai.cotizador.detail.banner.allReadyTemplate')
              .replace('{count}', String(carrierCount))
              .replace('{total}', String(carrierCount))
              .replace('{cost}', totalCostUsd.toFixed(3))}
          </p>
        </div>
      </div>

      {/* Right: CTAs */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Re-cotizar — Phase 33 placeholder, disabled */}
        <Button
          variant="outline"
          size="sm"
          hideArrow
          disabled
          aria-disabled="true"
          title={t('inmobiliaria.ai.cotizador.detail.banner.reQuoteTooltip')}
          onClick={onReQuote}
        >
          <ArrowCounterClockwise weight="regular" className="w-4 h-4" />
          {t('inmobiliaria.ai.cotizador.detail.banner.reQuoteButton')}
        </Button>

        {/* Descargar PDF — wired via usePdfDownload (backend endpoint) */}
        <Button
          variant="secondary"
          size="sm"
          hideArrow
          onClick={downloadPdf}
          disabled={isGenerating || !pdfReady}
          isLoading={isGenerating}
        >
          {!isGenerating && <FilePdf weight="regular" className="w-4 h-4" />}
          {isGenerating
            ? t('inmobiliaria.ai.cotizador.pdf.downloading')
            : t('inmobiliaria.ai.cotizador.pdf.download')}
        </Button>

        {/* Volver */}
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={onBack}
        >
          <ArrowLeft weight="regular" className="w-4 h-4" />
          {t('inmobiliaria.ai.cotizador.detail.banner.backButton')}
        </Button>
      </div>
    </div>
  )
}
