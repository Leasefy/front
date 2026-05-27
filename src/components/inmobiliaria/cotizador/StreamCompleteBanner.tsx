'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-05
// Completion banner shown when all carriers have final verdicts.
// Re-cotizar is aria-disabled (Phase 33 placeholder).
// Descargar PDF is prop-wired, pending plan 30-07.

import { CheckCircle, FilePdf, ArrowCounterClockwise, ArrowLeft } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

interface StreamCompleteBannerProps {
  carrierCount: number
  totalCostUsd: number
  isStubMode: boolean        // true when all carriers are stubs
  onReQuote: () => void      // Phase 33 placeholder
  onDownloadPdf: () => void  // Plan 30-07
  onBack: () => void         // navigate to cotizador overview
  locale?: string
}

export function StreamCompleteBanner({
  carrierCount,
  totalCostUsd,
  isStubMode,
  onReQuote,
  onDownloadPdf,
  onBack,
}: StreamCompleteBannerProps) {
  const { t } = useI18n()

  if (isStubMode) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-5 flex items-center justify-between gap-4 flex-wrap"
      >
        <p className="text-body-sm font-medium text-violet-700 dark:text-violet-400">
          {t('inmobiliaria.ai.cotizador.detail.banner.stubModeWarning')}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft weight="regular" className="w-4 h-4" />
            {t('inmobiliaria.ai.cotizador.detail.banner.backButton')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-5 flex items-center justify-between gap-4 flex-wrap"
    >
      {/* Left: completion summary */}
      <div className="flex items-center gap-3">
        <CheckCircle weight="fill" className="w-6 h-6 text-green-500 shrink-0" />
        <div>
          <p className="font-medium text-green-700 dark:text-green-400 text-sm">
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
          disabled
          aria-disabled="true"
          title={t('inmobiliaria.ai.cotizador.detail.banner.reQuoteTooltip')}
          onClick={onReQuote}
        >
          <ArrowCounterClockwise weight="regular" className="w-4 h-4" />
          {t('inmobiliaria.ai.cotizador.detail.banner.reQuoteButton')}
        </Button>

        {/* Descargar PDF — wired in plan 30-07 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onDownloadPdf}
        >
          <FilePdf weight="regular" className="w-4 h-4" />
          {t('inmobiliaria.ai.cotizador.detail.banner.downloadPdfButton')}
        </Button>

        {/* Volver */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft weight="regular" className="w-4 h-4" />
          {t('inmobiliaria.ai.cotizador.detail.banner.backButton')}
        </Button>
      </div>
    </div>
  )
}
