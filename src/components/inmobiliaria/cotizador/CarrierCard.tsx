'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-05
// Single carrier state card with entrance animation.

import { Warning, CheckCircle, XCircle, Question } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Spinner } from '@/components/ui/spinner'
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
        text:   'text-success',
        bg:     'bg-success-soft',
        border: 'border-success/30',
        badge:  'bg-success-soft text-success',
      }
    case 'conditional':
      return {
        text:   'text-warning',
        bg:     'bg-warning-soft',
        border: 'border-warning/30',
        badge:  'bg-warning-soft text-warning',
      }
    case 'rejected':
      return {
        text:   'text-danger',
        bg:     'bg-danger-soft',
        border: 'border-danger/30',
        badge:  'bg-danger-soft text-danger',
      }
    case 'error':
      return {
        text:   'text-fg-muted',
        bg:     'bg-surface-muted',
        border: 'border-border',
        badge:  'bg-surface-muted text-fg-muted',
      }
    case 'stub':
      return {
        text:   'text-fg-muted',
        bg:     'bg-surface-muted',
        border: 'border-border',
        badge:  'bg-surface-muted text-fg-muted',
      }
    case 'pending':
    default:
      return {
        text:   'text-primary',
        bg:     'bg-primary-soft/60',
        border: 'border-primary/30',
        badge:  'bg-primary-soft text-primary',
      }
  }
}

function StatusIcon({ status }: { status: CarrierState['status'] }) {
  switch (status) {
    case 'approved':
      return <CheckCircle weight="fill" className="w-4 h-4 text-success" />
    case 'rejected':
      return <XCircle weight="fill" className="w-4 h-4 text-danger" />
    case 'error':
      return <Warning weight="fill" className="w-4 h-4 text-fg-muted" />
    case 'stub':
      return <Question weight="fill" className="w-4 h-4 text-fg-muted" />
    case 'pending':
      return <Spinner size="sm" />
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
        'rounded-lg border p-4 space-y-3 transition-colors duration-300',
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
              'rounded-full uppercase tracking-wide text-[10px] font-medium px-2 py-0.5',
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
          <div className="h-6 w-28 rounded-sm bg-primary-soft" />
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
              <p className="text-body-sm text-danger mt-0.5">
                {carrier.motivoRechazo}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {carrier.status === 'error' && (
        <div className="flex items-start gap-2">
          <Warning weight="bold" className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" />
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
