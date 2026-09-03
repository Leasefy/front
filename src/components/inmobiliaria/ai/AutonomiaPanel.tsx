'use client'

/**
 * AutonomiaPanel — F6 of the Agent Workspace initiative (AGENT-WORKSPACE-SPEC §1.4).
 *
 * Read-only autonomy posture for an agent: the 3 mode pills (🌑 Sombra /
 * 🤝 Copiloto / 🚀 Autónomo) with the active mode highlighted, the read-only
 * nota, the valla (guardrail) list, and the T-323 callout when the agent
 * decides over personas. No interactivity day-1 — all agents ship 🤝 Copiloto.
 */

import { Scales } from '@phosphor-icons/react'

import type { AgentAutonomiaResponse, AutonomiaModo } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'

// ── Vocabulary ──────────────────────────────────────────────────────────────

const NS = 'inmobiliaria.ai.workspace.autonomia'

/** Emoji per mode; label + hint text live under `${NS}.modo.*`. */
const MODO_EMOJI: Record<AutonomiaModo, string> = {
  sombra: '🌑',
  copiloto: '🤝',
  autonomo: '🚀',
}

const MODOS: AutonomiaModo[] = ['sombra', 'copiloto', 'autonomo']

// ── Component ───────────────────────────────────────────────────────────────

export interface AutonomiaPanelProps {
  data: AgentAutonomiaResponse | null
  isLoading?: boolean
  error?: string | null
}

export function AutonomiaPanel({ data, isLoading, error }: AutonomiaPanelProps) {
  const { t } = useI18n()
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="autonomia-panel-loading">
        <div className="h-12 rounded-lg border border-border bg-muted/40 animate-pulse" />
        <div className="h-32 rounded-lg border border-border bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-danger/30 bg-danger-soft text-danger"
        data-testid="autonomia-panel-error"
      >
        {t(`${NS}.error`, { error })}
      </div>
    )
  }

  if (!data) {
    // 404 / notAvailable — graceful empty state, NOT an error banner.
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center"
        data-testid="autonomia-panel-empty"
      >
        <Scales className="w-8 h-8 mx-auto text-muted-foreground mb-2" weight="duotone" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{t(`${NS}.emptyTitle`)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t(`${NS}.emptyBody`)}</p>
      </div>
    )
  }

  // Visible hint of the ACTIVE mode (the title= tooltips are invisible on
  // touch). Unknown modo → key echo → render nothing (never the raw key).
  const activeHintKey = `${NS}.modo.${data.modo}Hint`
  const activeHint = t(activeHintKey)

  return (
    <div className="space-y-4" data-testid="autonomia-panel">
      {/* Mode pills (read-only) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t(`${NS}.grupoAria`)}>
        {MODOS.map((modo) => {
          const isActive = data.modo === modo
          const isAvailable = data.modosDisponibles.includes(modo)
          return (
            <span
              key={modo}
              data-testid={`autonomia-modo-${modo}`}
              aria-current={isActive ? 'true' : undefined}
              title={isAvailable ? t(`${NS}.modo.${modo}Hint`) : t(`${NS}.noDisponible`)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ring-1 transition ${
                isActive
                  ? 'bg-primary-soft text-primary ring-primary/30 font-medium'
                  : 'bg-muted text-muted-foreground ring-border'
              } ${!isAvailable ? 'opacity-40' : ''}`}
            >
              <span aria-hidden="true">{MODO_EMOJI[modo]}</span>
              {t(`${NS}.modo.${modo}`)}
            </span>
          )
        })}
      </div>

      {/* Active-mode hint, visible (tooltips don't exist on touch) */}
      {activeHint !== activeHintKey && (
        <p className="text-xs text-muted-foreground" data-testid="autonomia-modo-hint">
          {activeHint}
        </p>
      )}

      {/* Read-only nota */}
      {data.nota && (
        <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2" data-testid="autonomia-nota">
          {data.nota}
        </p>
      )}

      {/* T-323 callout */}
      {data.t323 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft text-warning"
          data-testid="autonomia-t323"
        >
          {t(`${NS}.t323`)}
        </div>
      )}

      {/* Valla (guardrails) */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-2" data-testid="autonomia-valla">
        <h2 className="text-sm font-semibold text-foreground">{t(`${NS}.vallaTitle`)}</h2>
        {data.valla.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t(`${NS}.vallaEmpty`)}</p>
        ) : (
          <dl className="divide-y divide-border">
            {data.valla.map((regla) => (
              <div
                key={regla.id}
                className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                data-testid={`autonomia-valla-${regla.id}`}
              >
                <dt className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      regla.estado === 'activo' ? 'bg-success' : 'bg-fg-subtle'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{regla.label}</span>
                </dt>
                <dd className="text-xs font-medium text-foreground tabular-nums shrink-0">
                  {regla.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}
