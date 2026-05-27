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
        text:   'text-green-700 dark:text-green-400',
        bg:     'bg-green-50 dark:bg-green-950/30',
        border: 'border-green-200 dark:border-green-800',
        badge:  'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
      }
    case 'conditional':
      return {
        text:   'text-amber-700 dark:text-amber-400',
        bg:     'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        badge:  'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
      }
    case 'rejected':
      return {
        text:   'text-red-700 dark:text-red-400',
        bg:     'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        badge:  'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
      }
    case 'error':
      return {
        text:   'text-slate-600 dark:text-slate-400',
        bg:     'bg-slate-50 dark:bg-slate-950/20',
        border: 'border-slate-200 dark:border-slate-700',
        badge:  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      }
    case 'stub':
      return {
        text:   'text-violet-700 dark:text-violet-400',
        bg:     'bg-violet-50 dark:bg-violet-950/30',
        border: 'border-violet-200 dark:border-violet-800',
        badge:  'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
      }
    case 'pending':
    default:
      return {
        text:   'text-indigo-600 dark:text-indigo-400',
        bg:     'bg-indigo-50/60 dark:bg-indigo-950/20',
        border: 'border-indigo-200 dark:border-indigo-800',
        badge:  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
      }
  }
}

function StatusIcon({ status }: { status: CarrierState['status'] }) {
  switch (status) {
    case 'approved':
      return <CheckCircle weight="fill" className="w-4 h-4 text-green-500" />
    case 'rejected':
      return <XCircle weight="fill" className="w-4 h-4 text-red-500" />
    case 'error':
      return <Warning weight="fill" className="w-4 h-4 text-slate-500" />
    case 'stub':
      return <Question weight="fill" className="w-4 h-4 text-violet-500" />
    case 'pending':
      return <Spinner weight="bold" className="w-4 h-4 text-indigo-500 animate-spin" />
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
        'rounded-2xl border p-4 space-y-3 transition-colors duration-300',
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
          <div className="h-6 w-28 rounded-md bg-indigo-100 dark:bg-indigo-900/40" />
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
              <p className="text-body-sm text-red-600 dark:text-red-400 mt-0.5">
                {carrier.motivoRechazo}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {carrier.status === 'error' && (
        <div className="flex items-start gap-2">
          <Warning weight="bold" className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-body-sm text-muted-foreground">
            {carrier.motivoRechazo ?? t('inmobiliaria.ai.cotizador.detail.carrier.errorLabel')}
          </p>
        </div>
      )}

      {/* Stub */}
      {carrier.status === 'stub' && (
        <div className={['rounded-lg px-3 py-2 text-body-sm font-medium', colors.badge].join(' ')}>
          {t('inmobiliaria.ai.cotizador.detail.carrier.stubModeBadge')}
        </div>
      )}
    </motion.div>
  )
}
