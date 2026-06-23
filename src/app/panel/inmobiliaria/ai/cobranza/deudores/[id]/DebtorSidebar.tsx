'use client'

/**
 * DebtorSidebar — vista de caso (visión #14), zona IZQUIERDA "Contexto".
 *
 * Renders the human case state (humanCaseState key computed by the parent),
 * the case KPIs the API already sends (kpis.totalOwed / paymentsCount /
 * callsCount — previously dropped on the floor), the contact-attempts
 * counter, the paused notice, and the 4 masked PII rows.
 *
 * The next-action card moved to DebtorActionRail (right zone). The 1s ticker
 * stays — it drives the PII reveal countdown.
 *
 * Each PII row's <Mask> is wired with rawValue + countdownSeconds from the
 * PIIRevealContext via the parent's lifted state (Task 6 wiring).
 */

import * as React from 'react'
import { useEffect, useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/lib/cartera'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import type { DebtorDetailResponse } from '@/lib/hooks/cobranza/use-debtor-detail'
import { usePIIRevealContext, type PIIFieldKey } from '@/lib/context/PIIRevealContext'

void React

const NS = 'inmobiliaria.ai.cobranza'

interface DebtorSidebarProps {
  data: DebtorDetailResponse | null
  isLoading: boolean
  onRevealRequest: (field: PIIFieldKey) => void
  /** Full i18n key from humanCaseState() — computed by the parent. */
  caseStateKey?: string | null
}

export function DebtorSidebar({
  data,
  isLoading,
  onRevealRequest,
  caseStateKey = null,
}: DebtorSidebarProps) {
  const { t, locale, formatCurrency } = useI18n()
  const ctx = usePIIRevealContext()
  // 1s ticker — drives the PII reveal countdown seconds.
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (isLoading && !data) {
    return (
      <aside className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 animate-pulse">
        <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
        <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
        <div className="h-3 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </aside>
    )
  }

  if (!data) {
    return (
      <aside className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t(`${NS}.detail.empty`)}
        </p>
      </aside>
    )
  }

  const kpis = data.kpis ?? null

  // ── Contact attempts (NEW backend field, optional) ──────────────────────────
  // sidebar.contactAttempts.total is the REAL total; fall back to the legacy
  // contactAttemptsCount when the richer object hasn't shipped yet.
  const contactAttemptsObj = data.sidebar?.contactAttempts ?? null
  const contactAttemptsTotal =
    contactAttemptsObj?.total ?? data.sidebar?.contactAttemptsCount ?? 0
  const lastAttemptAt = contactAttemptsObj?.lastAttemptAt ?? null
  const byChannel = contactAttemptsObj?.byChannel ?? null

  // ── Recommended next step (NEW backend field, optional) ─────────────────────
  const recommended = data.sidebar?.recommendedNextStep ?? null
  const hasRecommendation = Boolean(recommended?.action)

  const channelLabels: Record<'voice' | 'whatsapp' | 'email', string> = {
    voice: locale === 'es' ? 'Voz' : 'Voice',
    whatsapp: 'WhatsApp',
    email: 'Email',
  }

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
    <aside className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
      {/* Zone eyebrow — brand mono + dot (FeatureAnnouncementCard pattern) */}
      <h2 className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-[2px] bg-[#1A40FF] shrink-0"
        />
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400 dark:text-neutral-500">
          {t(`${NS}.detalle.contexto`)}
        </span>
      </h2>

      {/* Human case state — the headline of the context */}
      {caseStateKey && (
        <span
          data-testid="case-state-badge"
          className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-200"
        >
          {t(caseStateKey)}
        </span>
      )}

      {/* Paused notice */}
      {data.isPaused && data.carterapausedUntil && (
        <div className="rounded-md bg-[#B7791F]/10 dark:bg-[#B7791F]/20 border border-[#B7791F]/30 dark:border-[#B7791F]/40 px-3 py-2 text-xs text-[#B7791F] dark:text-[#D2992F]">
          {t(`${NS}.detail.sidebar.paused`).replace(
            '{{date}}',
            new Date(data.carterapausedUntil).toLocaleDateString(locale),
          )}
        </div>
      )}

      {/* Case KPIs — the API already sends these (kpis.*) */}
      {kpis && (
        <div className="space-y-3" data-testid="sidebar-kpis">
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {t(`${NS}.detalle.saldoPendiente`)}
            </p>
            <p className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-[#0B1220] dark:text-white tabular-nums">
              {formatCurrency(kpis.totalOwed)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {t(`${NS}.detalle.pagosRecibidos`)}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                {kpis.paymentsCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {t(`${NS}.detalle.llamadasRealizadas`)}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                {kpis.callsCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Intentos de contacto (NEW — real total + último contacto + por canal) */}
      <div data-testid="sidebar-contact-attempts">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {locale === 'es' ? 'Intentos de contacto' : 'Contact attempts'}
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
          {contactAttemptsTotal}{' '}
          <span className="font-normal text-neutral-500 dark:text-neutral-400">
            {locale === 'es' ? 'intentos' : 'attempts'}
          </span>
        </p>
        {lastAttemptAt && (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {locale === 'es' ? 'Último contacto ' : 'Last contact '}
            {relativeTime(lastAttemptAt, locale)}
          </p>
        )}
        {byChannel && contactAttemptsTotal > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(['voice', 'whatsapp', 'email'] as const).map((ch) =>
              byChannel[ch] > 0 ? (
                <span
                  key={ch}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 tabular-nums"
                >
                  {channelLabels[ch]} {byChannel[ch]}
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>

      {/* Siguiente paso recomendado (NEW — only when action is non-null) */}
      {hasRecommendation && recommended && (
        <div
          data-testid="sidebar-recommended-next-step"
          className="rounded-md bg-[#1A40FF]/[0.06] dark:bg-[#1A40FF]/[0.12] border border-[#1A40FF]/20 dark:border-[#1A40FF]/30 px-3 py-2.5"
        >
          <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#1A40FF] dark:text-[#5570FF]">
            {locale === 'es' ? 'Siguiente paso recomendado' : 'Recommended next step'}
          </p>
          {recommended.label && (
            <p className="mt-1 text-sm font-semibold text-[#0B1220] dark:text-white">
              {recommended.label}
            </p>
          )}
          {recommended.reason && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {recommended.reason}
            </p>
          )}
        </div>
      )}

      {/* PII masks */}
      <div className="space-y-2 pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t(`${NS}.deudores.columns.cedula`)}
          </p>
          <div className="mt-1">{renderMask('cedula', data.cedulaMasked)}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t(`${NS}.deudores.columns.phone`)}
          </p>
          <div className="mt-1">{renderMask('phone', data.phoneMasked)}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t(`${NS}.deudores.columns.email`)}
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
