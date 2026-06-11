'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-05
// Single carrier state card with entrance animation.

import { Warning, CheckCircle, XCircle, Question, Spinner } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

interface ColorClasses {
  text: string
  bg: string
  border: string
  badge: string
}

function verdictColorClasses(status: CarrierState['status']): ColorClasses {
  switch (status) {
    case 'approved':
      return {
        text:   'text-[#2C7A53] dark:text-[#3EAE70]',
        bg:     'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
        border: 'border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
        badge:  'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70]',
      }
    case 'conditional':
      return {
        text:   'text-[#B7791F] dark:text-[#D2992F]',
        bg:     'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
        border: 'border-[#B7791F]/30 dark:border-[#B7791F]/40',
        badge:  'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F]',
      }
    case 'rejected':
      return {
        text:   'text-[#C4503B] dark:text-[#E0664D]',
        bg:     'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
        border: 'border-[#C4503B]/30 dark:border-[#C4503B]/40',
        badge:  'bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D]',
      }
    case 'error':
      return {
        text:   'text-[#6B6B6B] dark:text-[#6B6B6B]',
        bg:     'bg-[#6B6B6B] dark:bg-[#6B6B6B]/20',
        border: 'border-[#6B6B6B] dark:border-[#6B6B6B]',
        badge:  'bg-[#6B6B6B] dark:bg-[#6B6B6B] text-[#6B6B6B] dark:text-[#6B6B6B]',
      }
    case 'stub':
      return {
        text:   'text-neutral-600 dark:text-neutral-300',
        bg:     'bg-neutral-100 dark:bg-neutral-800',
        border: 'border-neutral-200 dark:border-neutral-700',
        badge:  'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
      }
    case 'pending':
    default:
      return {
        text:   'text-[#1A40FF] dark:text-[#5570FF]',
        bg:     'bg-[#EEF1FF]/60 dark:bg-[#1A40FF]/20',
        border: 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40',
        badge:  'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]',
      }
  }
}

function StatusIcon({ status }: { status: CarrierState['status'] }) {
  switch (status) {
    case 'approved':
      return <CheckCircle weight="fill" className="w-4 h-4 text-[#2C7A53]" />
    case 'rejected':
      return <XCircle weight="fill" className="w-4 h-4 text-[#C4503B]" />
    case 'error':
      return <Warning weight="fill" className="w-4 h-4 text-[#6B6B6B]" />
    case 'stub':
      return <Question weight="fill" className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
    case 'pending':
      return <Spinner weight="bold" className="w-4 h-4 text-[#1A40FF] animate-spin" />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CarrierCardProps {
  carrier: CarrierState
  locale?: string
}

export function CarrierCard({ carrier }: CarrierCardProps) {
  const { t } = useI18n()
  const colors = verdictColorClasses(carrier.status)

  const statusLabel = t(`inmobiliaria.ai.cotizador.detail.carrier.${carrier.status}Label`)

  const primaFormatted = carrier.primaMensualCop
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(carrier.primaMensualCop)
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={[
        'rounded-xl border p-4 space-y-3 transition-colors duration-300',
        colors.bg,
        colors.border,
      ].join(' ')}
      aria-label={`${carrier.carrier} — ${statusLabel}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={carrier.status} />
          <span className="font-heading font-semibold text-foreground truncate">
            {carrier.carrier}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {carrier.latencyMs !== null && (
            <span className="text-caption font-mono text-muted-foreground rounded-full bg-muted px-2 py-0.5">
              {carrier.latencyMs}{t('inmobiliaria.ai.cotizador.detail.carrier.latencyMs')}
            </span>
          )}
          <span
            className={[
              'rounded-full font-mono uppercase tracking-wide text-[10px] font-label px-2 py-0.5',
              colors.badge,
            ].join(' ')}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Pending skeleton */}
      {carrier.status === 'pending' && (
        <div className="space-y-2 animate-pulse">
          <div className="h-6 w-28 rounded-sm bg-[#EEF1FF] dark:bg-[#1A40FF]/15" />
          <div className="h-3 w-40 rounded bg-muted" />
        </div>
      )}

      {/* Approved / Conditional */}
      {(carrier.status === 'approved' || carrier.status === 'conditional') && primaFormatted && (
        <div className="space-y-2">
          <div className={['font-mono stat-number text-2xl font-bold', colors.text].join(' ')}>
            {primaFormatted}
            <span className="text-xs font-normal text-muted-foreground ml-1">/mes</span>
          </div>
          {carrier.condiciones.length > 0 && (
            <div className="space-y-1">
              <p className="text-caption text-muted-foreground font-medium">
                {t('inmobiliaria.ai.cotizador.detail.carrier.condicionesTitle')}
              </p>
              <ul className="space-y-0.5">
                {carrier.condiciones.map((c, i) => (
                  <li key={i} className="text-body-sm text-muted-foreground flex items-start gap-1.5">
                    <span className="opacity-40 mt-0.5">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Rejected */}
      {carrier.status === 'rejected' && (
        <div className="space-y-1.5">
          {carrier.motivoRechazo && (
            <div>
              <p className="text-caption text-muted-foreground font-medium">
                {t('inmobiliaria.ai.cotizador.detail.carrier.motivoRechazoTitle')}
              </p>
              <p className="text-body-sm text-[#C4503B] dark:text-[#E0664D] mt-0.5">
                {carrier.motivoRechazo}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {carrier.status === 'error' && (
        <div className="flex items-start gap-2">
          <Warning weight="bold" className="w-4 h-4 text-[#6B6B6B] shrink-0 mt-0.5" />
          <p className="text-body-sm text-muted-foreground">
            {carrier.motivoRechazo ?? t('inmobiliaria.ai.cotizador.detail.carrier.errorLabel')}
          </p>
        </div>
      )}

      {/* Stub */}
      {carrier.status === 'stub' && (
        <div className={['rounded-md px-3 py-2 text-body-sm font-medium', colors.badge].join(' ')}>
          {t('inmobiliaria.ai.cotizador.detail.carrier.stubModeBadge')}
        </div>
      )}
    </motion.div>
  )
}
