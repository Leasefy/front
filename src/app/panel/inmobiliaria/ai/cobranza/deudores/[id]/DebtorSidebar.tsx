'use client'

/**
 * DebtorSidebar — Phase 31 plan 31-09.
 *
 * Renders the next-action card + contact-attempts countdown + isPaused badge.
 * Includes a 1s relative-time ticker (no realtime channel needed per CONTEXT).
 *
 * Also renders the 4 masked PII rows (cedula, phone, email, fiador_cedula).
 * Each row's <Mask> is wired with rawValue + countdownSeconds from the
 * PIIRevealContext via the parent's lifted state (Task 6 wiring).
 */

import * as React from 'react'
import { useEffect, useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import type { DebtorDetailResponse } from '@/lib/hooks/cobranza/use-debtor-detail'
import { usePIIRevealContext, type PIIFieldKey } from '@/lib/context/PIIRevealContext'

void React

interface DebtorSidebarProps {
  data: DebtorDetailResponse | null
  isLoading: boolean
  onRevealRequest: (field: PIIFieldKey) => void
}

function formatRelative(iso: string, now: number, locale: string): string {
  const diffMs = new Date(iso).getTime() - now
  const futureLabel = locale === 'es' ? 'en' : 'in'
  const pastLabelEs = 'hace'
  const isFuture = diffMs >= 0
  const absMs = Math.abs(diffMs)
  const mins = Math.floor(absMs / 60_000)
  if (mins < 1) return locale === 'es' ? 'ahora mismo' : 'just now'
  if (mins < 60) {
    return isFuture
      ? `${futureLabel} ${mins}min`
      : `${locale === 'es' ? pastLabelEs : 'ago'} ${mins}min`
  }
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hrs < 24) {
    return isFuture
      ? `${futureLabel} ${hrs}h ${remMins}m`
      : `${locale === 'es' ? pastLabelEs : 'ago'} ${hrs}h`
  }
  const days = Math.floor(hrs / 24)
  return isFuture
    ? `${futureLabel} ${days}d`
    : `${locale === 'es' ? pastLabelEs : 'ago'} ${days}d`
}

export function DebtorSidebar({ data, isLoading, onRevealRequest }: DebtorSidebarProps) {
  const { t, locale } = useI18n()
  const ctx = usePIIRevealContext()
  // 1s ticker for relative time strings; PIIRevealContext already exposes
  // a tick but this keeps the sidebar autonomous if used elsewhere.
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (isLoading && !data) {
    return (
      <aside className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 animate-pulse">
        <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
        <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
        <div className="h-3 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </aside>
    )
  }

  if (!data) {
    return (
      <aside className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.detail.empty')}
        </p>
      </aside>
    )
  }

  const nextAction = data.sidebar?.nextAction ?? null
  const contactAttempts = data.sidebar?.contactAttemptsCount ?? 0

  const renderMask = (
    field: PIIFieldKey,
    masked: string | null | undefined,
  ): React.ReactNode => {
    const revealed = ctx.getRevealed(field)
    const countdownSeconds = revealed
      ? Math.max(0, (revealed.expiresAt - now) / 1000)
      : null
    return (
      <Mask
        field={field}
        value={masked ?? null}
        rawValue={revealed?.value ?? null}
        countdownSeconds={countdownSeconds}
        onReveal={() => onRevealRequest(field)}
      />
    )
  }

  return (
    <aside className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
        {t('inmobiliaria.ai.cobranza.detail.sidebar.title')}
      </h2>

      {/* Paused badge */}
      {data.isPaused && data.carterapausedUntil && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {t('inmobiliaria.ai.cobranza.detail.sidebar.paused').replace(
            '{{date}}',
            new Date(data.carterapausedUntil).toLocaleDateString(locale),
          )}
        </div>
      )}

      {/* Next action card */}
      <div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.detail.sidebar.nextAction')}
        </p>
        {nextAction ? (
          <p className="mt-1 text-sm text-neutral-900 dark:text-white">
            {nextAction.channel} ·{' '}
            <span className="text-violet-700 dark:text-violet-300 font-mono text-xs">
              {formatRelative(nextAction.plannedFor, now, locale)}
            </span>
            {nextAction.templateName && (
              <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {nextAction.templateName}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.detail.sidebar.noNextAction')}
          </p>
        )}
      </div>

      {/* Contact attempts */}
      <div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.detail.sidebar.contactAttempts')}
        </p>
        <p className="mt-1 text-sm text-neutral-900 dark:text-white font-mono">
          {contactAttempts}
        </p>
      </div>

      {/* PII masks */}
      <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.deudores.columns.cedula')}
          </p>
          <div className="mt-1">{renderMask('cedula', data.cedulaMasked)}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.deudores.columns.phone')}
          </p>
          <div className="mt-1">{renderMask('phone', data.phoneMasked)}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.deudores.columns.email')}
          </p>
          <div className="mt-1">{renderMask('email', data.emailMasked)}</div>
        </div>
        {data.fiadorCedulaMasked && (
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Cédula del fiador
            </p>
            <div className="mt-1">
              {renderMask('fiador_cedula', data.fiadorCedulaMasked)}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
