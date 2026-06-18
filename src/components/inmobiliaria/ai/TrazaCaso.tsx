'use client'

/**
 * TrazaCaso — F6 of the Agent Workspace initiative (AGENT-WORKSPACE-SPEC §1.4).
 *
 * Read-only vertical timeline of a work-item's traza (audit entries): action
 * label (es-CO map with per-agent estado override + raw-slug fallback),
 * actorType badge (user/agent/system), relative + absolute timestamp and
 * collapsible details — flat (all-primitive) objects render as label/value
 * rows; nested objects keep the raw JSON under "Datos técnicos".
 *
 * JSON details are rendered via plain <pre>{JSON.stringify(...)}</pre> — NEVER
 * via raw-HTML injection sinks (same forensic invariant as the cobranza audit
 * page, T-34-07-02).
 */

import { ClockCounterClockwise } from '@phosphor-icons/react'

import type { ActorType, TrazaEntry } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { relativeTime, type TranslateFn } from './ColaHumana'

// ── Vocabulary ──────────────────────────────────────────────────────────────

/** Shared actor chip styling — also reused by SalaAgente's feed. Label text
 *  resolves via actorLabel(t, actorType) (inmobiliaria.ai.workspace.actor.*).
 *  Brand contract: humanos/system = gris (informational), agent = tint primary
 *  (la voz del agente es el momento de marca; purple es off-brand). */
export const ACTOR_META: Record<ActorType, { cls: string; dot: string }> = {
  user: {
    cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 ring-neutral-300 dark:ring-neutral-700',
    dot: 'bg-neutral-500 dark:bg-neutral-400',
  },
  agent: {
    cls: 'bg-primary-soft text-primary ring-primary/30 dark:ring-primary/30',
    dot: 'bg-primary dark:bg-primary',
  },
  system: {
    cls: 'bg-muted text-muted-foreground ring-border',
    dot: 'bg-neutral-400',
  },
}

/** Render-site fallback: unknown actorType degrades to the system chip. */
export function actorMeta(actorType: string) {
  return ACTOR_META[actorType as ActorType] ?? ACTOR_META.system
}

/** Actor chip label; unknown actorType degrades to the system label. */
export function actorLabel(t: TranslateFn, actorType: string): string {
  const known = actorType in ACTOR_META ? actorType : 'system'
  return t(`inmobiliaria.ai.workspace.actor.${known}`)
}

/** Labels for known action slugs (inmobiliaria.ai.workspace.traza.accion.*);
 *  when `agente` is provided and the slug matches a per-agent estado override
 *  (inmobiliaria.ai.workspace.pages.{agente}.estado.*), the override wins —
 *  same vocabulary contract as ColaHumana's estadoLabel. Unknown slugs are
 *  humanized raw — t() echoes the key path on a miss. */
function actionLabel(t: TranslateFn, action: string, agente?: string): string {
  if (agente) {
    const override = `inmobiliaria.ai.workspace.pages.${agente}.estado.${action}`
    const overridden = t(override)
    if (overridden !== override) return overridden
  }
  const full = `inmobiliaria.ai.workspace.traza.accion.${action}`
  const label = t(full)
  return label === full ? action.replace(/_/g, ' ') : label
}

/** A details object is "flat" when every value is a primitive — those render
 *  as label/value rows instead of raw JSON. */
function isFlatDetails(details: Record<string, unknown>): boolean {
  return Object.values(details).every(
    (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v),
  )
}

function absolute(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Component ───────────────────────────────────────────────────────────────

export interface TrazaCasoProps {
  entries: TrazaEntry[]
  isLoading?: boolean
  error?: string | null
  /**
   * Agent id used to resolve per-agent estado overrides
   * (`inmobiliaria.ai.workspace.pages.{agente}.estado.*`) when a traza action
   * slug labels an estado.
   */
  agente?: string
}

export function TrazaCaso({ entries, isLoading, error, agente }: TrazaCasoProps) {
  const { t } = useI18n()
  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="traza-caso-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl border border-border bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-danger/30 bg-danger-soft text-danger"
        data-testid="traza-caso-error"
      >
        {t('inmobiliaria.ai.workspace.traza.error', { error })}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center"
        data-testid="traza-caso-empty"
      >
        <ClockCounterClockwise
          className="w-7 h-7 mx-auto text-muted-foreground mb-2"
          weight="duotone"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.workspace.traza.emptyTitle')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('inmobiliaria.ai.workspace.traza.emptyBody')}
        </p>
      </div>
    )
  }

  // "Datos técnicos" lives under pages.comun (new contract); degrade to the
  // classic "Detalles" label while the key isn't in the locale yet (key echo).
  const datosTecnicosKey = 'inmobiliaria.ai.workspace.pages.comun.datosTecnicos'
  const datosTecnicosLabel = t(datosTecnicosKey)
  const techSummary =
    datosTecnicosLabel === datosTecnicosKey
      ? t('inmobiliaria.ai.workspace.traza.detalles')
      : datosTecnicosLabel

  return (
    <ol className="space-y-0" data-testid="traza-caso">
      {entries.map((entry, idx) => {
        const meta = actorMeta(entry.actorType)
        const hasDetails = entry.details && Object.keys(entry.details).length > 0
        const flatDetails = hasDetails && isFlatDetails(entry.details)
        const isLast = idx === entries.length - 1
        return (
          <li key={entry.id} className="relative flex gap-3 pb-4" data-testid={`traza-entry-${entry.id}`}>
            {/* Dot + connector */}
            <div className="flex flex-col items-center pt-1.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} aria-hidden="true" />
              {!isLast && <span className="w-px flex-1 bg-border mt-1" aria-hidden="true" />}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">
                  {actionLabel(t, entry.action, agente)}
                </p>
                <span
                  className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
                >
                  {actorLabel(t, entry.actorType)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {[relativeTime(entry.occurredAt, t), absolute(entry.occurredAt), entry.actorId ?? '']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {hasDetails && flatDetails && (
                /* Flat object (all-primitive values) → readable label/value rows */
                <details className="group">
                  <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground select-none">
                    {t('inmobiliaria.ai.workspace.traza.detalles')}
                  </summary>
                  <dl className="mt-1 max-h-40 overflow-y-auto rounded-md bg-muted/40 p-2 divide-y divide-border">
                    {Object.entries(entry.details).map(([label, value]) => (
                      <div
                        key={label}
                        className="py-1 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                      >
                        <dt className="text-[11px] text-muted-foreground min-w-0 truncate">{label}</dt>
                        <dd className="text-[11px] font-medium text-foreground tabular-nums text-right break-words">
                          {value === null ? '—' : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
              {hasDetails && !flatDetails && (
                <details className="group">
                  <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground select-none">
                    {techSummary}
                  </summary>
                  {/* Plain <pre> JSON — never raw-HTML sinks (T-34-07-02). */}
                  <pre className="mt-1 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto rounded-md bg-muted/40 p-2">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
