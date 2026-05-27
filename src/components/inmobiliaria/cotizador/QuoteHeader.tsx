'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-05
// Sticky header for the cotizador streaming detail page.
// T-30-06-D: cedula is rendered masked only — raw cedula never present in mvp runtime (D-08).

import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/lib/cartera'
import { ChartLineUp } from '@phosphor-icons/react'

interface QuoteHeaderProps {
  quoteId: string
  /** Already-masked string or cedula_hash[:8] — rendered as: first2•••last3 */
  cedula: string
  /** ISO timestamp of quote creation */
  timestamp: string
  canonCop: number | null
  ciudad: string | null
  tipo: string | null
  codeudores: number | null
  /** Growing live from agent.cost_recorded events ($USD, 3 decimal places) */
  totalCostUsd: number
  isConnected: boolean
}

export function QuoteHeader({
  quoteId,
  cedula,
  timestamp,
  canonCop,
  ciudad,
  tipo,
  codeudores,
  totalCostUsd,
  isConnected,
}: QuoteHeaderProps) {
  const { t, locale } = useI18n()

  const maskedCedula =
    cedula.length >= 5
      ? `${cedula.slice(0, 2)}•••${cedula.slice(-3)}`
      : `${cedula}•••`

  const canonFormatted = canonCop
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(canonCop)
    : '—'

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">

        {/* Left: breadcrumb + inputs summary */}
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-caption text-muted-foreground font-mono">
            <span>Cotizador</span>
            <span>/</span>
            <span className="text-foreground font-medium">
              {t('inmobiliaria.ai.cotizador.detail.header.breadcrumbQuote')} #{quoteId.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-caption text-muted-foreground flex-wrap">
            <span className="font-mono">{maskedCedula}</span>
            {canonCop !== null && (
              <span>
                <span className="opacity-60">{t('inmobiliaria.ai.cotizador.detail.header.canon')}: </span>
                {canonFormatted}
              </span>
            )}
            {ciudad && (
              <span>
                <span className="opacity-60">{t('inmobiliaria.ai.cotizador.detail.header.ciudad')}: </span>
                {ciudad}
              </span>
            )}
            {tipo && (
              <span>
                <span className="opacity-60">{t('inmobiliaria.ai.cotizador.detail.header.tipo')}: </span>
                {tipo}
              </span>
            )}
            {codeudores !== null && (
              <span>
                <span className="opacity-60">{t('inmobiliaria.ai.cotizador.detail.header.codeudores')}: </span>
                {codeudores}
              </span>
            )}
            <span className="opacity-50">{relativeTime(timestamp, locale)}</span>
          </div>
        </div>

        {/* Right: live cost pill + connection status */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-3 py-1">
            <ChartLineUp
              weight="regular"
              className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0"
            />
            <span className="font-mono text-numeric text-sm text-indigo-700 dark:text-indigo-300">
              ${totalCostUsd.toFixed(3)}
            </span>
            <span
              className={[
                'w-2 h-2 rounded-full shrink-0',
                isConnected
                  ? 'bg-green-400 animate-pulse'
                  : 'bg-muted-foreground/40',
              ].join(' ')}
              aria-hidden="true"
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono pr-1">
            {isConnected
              ? t('inmobiliaria.ai.cotizador.detail.header.liveLabel')
              : t('inmobiliaria.ai.cotizador.detail.header.disconnectedLabel')}
          </span>
        </div>
      </div>
    </header>
  )
}
