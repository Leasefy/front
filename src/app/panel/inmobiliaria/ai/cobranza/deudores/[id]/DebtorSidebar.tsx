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
import { MonoLabel } from '@leasefy/cadence'
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
      <aside className="rounded-xl border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-1/2 bg-surface-muted rounded mb-3" />
        <div className="h-3 w-3/4 bg-surface-muted rounded mb-2" />
        <div className="h-3 w-2/3 bg-surface-muted rounded" />
      </aside>
    )
  }

  if (!data) {
    return (
      <aside className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-fg-muted">
          {t(`${NS}.detail.empty`)}
        </p>
      </aside>
    )
  }

  const contactAttempts = data.sidebar?.contactAttemptsCount ?? 0
  const kpis = data.kpis ?? null

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
    <aside className="rounded-xl border border-border bg-surface p-4 space-y-4">
      {/* Zone eyebrow — brand mono + dot (FeatureAnnouncementCard pattern) */}
      <h2 className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0"
        />
        <MonoLabel className="text-fg-subtle">
          {t(`${NS}.detalle.contexto`)}
        </MonoLabel>
      </h2>

      {/* Human case state — the headline of the context */}
      {caseStateKey && (
        <span
          data-testid="case-state-badge"
          className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-muted text-xs font-medium text-fg-muted"
        >
          {t(caseStateKey)}
        </span>
      )}

      {/* Paused notice */}
      {data.isPaused && data.carterapausedUntil && (
        <div className="rounded-md bg-warning-soft border border-warning/30 px-3 py-2 text-xs text-warning">
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
            <p className="text-xs font-medium text-fg-muted">
              {t(`${NS}.detalle.saldoPendiente`)}
            </p>
            <p className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-fg dark:text-white tabular-nums">
              {formatCurrency(kpis.totalOwed)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-fg-muted">
                {t(`${NS}.detalle.pagosRecibidos`)}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
                {kpis.paymentsCount}
              </p>
              {/* Cuánto entró, no sólo cuántas veces. «Saldo pendiente» y esto
                  eran el MISMO número —los pagos aprobados— con dos títulos
                  distintos; ahora cada uno responde su propia pregunta. */}
              {kpis.totalCollected != null && kpis.totalCollected > 0 && (
                <p className="text-xs text-fg-muted tabular-nums">
                  {formatCurrency(kpis.totalCollected)}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-fg-muted">
                {t(`${NS}.detalle.llamadasRealizadas`)}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
                {kpis.callsCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contact attempts */}
      <div>
        <p className="text-xs font-medium text-fg-muted">
          {t(`${NS}.detail.sidebar.contactAttempts`)}
        </p>
        <p className="mt-1 text-sm text-fg font-mono">
          {contactAttempts}
        </p>
      </div>

      {/* PII masks */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div>
          <p className="text-xs font-medium text-fg-muted">
            {t(`${NS}.deudores.columns.cedula`)}
          </p>
          <div className="mt-1">{renderMask('cedula', data.cedulaMasked)}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-muted">
            {t(`${NS}.deudores.columns.phone`)}
          </p>
          <div className="mt-1">{renderMask('phone', data.phoneMasked)}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-muted">
            {t(`${NS}.deudores.columns.email`)}
          </p>
          <div className="mt-1">{renderMask('email', data.emailMasked)}</div>
        </div>
        {data.fiadorCedulaMasked && (
          <div>
            <p className="text-xs font-medium text-fg-muted">
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
