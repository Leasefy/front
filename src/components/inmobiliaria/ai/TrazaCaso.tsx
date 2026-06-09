'use client'

/**
 * TrazaCaso — F6 of the Agent Workspace initiative (AGENT-WORKSPACE-SPEC §1.4).
 *
 * Read-only vertical timeline of a work-item's traza (audit entries): action
 * label (es-CO map with raw-slug fallback), actorType badge (user/agent/system),
 * relative + absolute timestamp and collapsible JSON details.
 *
 * Details are rendered via plain <pre>{JSON.stringify(...)}</pre> — NEVER via
 * raw-HTML injection sinks (same forensic invariant as the cobranza audit page,
 * T-34-07-02).
 */

import { ClockCounterClockwise } from '@phosphor-icons/react'

import type { ActorType, TrazaEntry } from '@/lib/api/agent-workspace'
import { relativeTime } from './ColaHumana'

// ── Vocabulary ──────────────────────────────────────────────────────────────

/** Shared actor chip metadata — also reused by SalaAgente's feed. */
export const ACTOR_META: Record<ActorType, { label: string; cls: string; dot: string }> = {
  user: {
    label: 'Humano',
    cls: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 ring-sky-200 dark:ring-sky-900',
    dot: 'bg-sky-500',
  },
  agent: {
    label: 'Agente',
    cls: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 ring-violet-200 dark:ring-violet-900',
    dot: 'bg-violet-500',
  },
  system: {
    label: 'Sistema',
    cls: 'bg-muted text-muted-foreground ring-border',
    dot: 'bg-neutral-400',
  },
}

/** Render-site fallback: unknown actorType degrades to the system chip. */
export function actorMeta(actorType: string) {
  return ACTOR_META[actorType as ActorType] ?? ACTOR_META.system
}

/** es-CO labels for known action slugs; unknown slugs are humanized raw. */
const ACTION_LABEL: Record<string, string> = {
  detectado: 'Detectado por el agente',
  sugerido: 'Sugerencia del agente',
  en_revision: 'Enviado a revisión humana',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  ejecutando: 'Ejecución iniciada',
  resuelto: 'Resuelto',
  fallo: 'Falló',
  creado: 'Creado',
  match_sugerido: 'Cruce sugerido',
  match_confirmado: 'Cruce confirmado',
  match_rechazado: 'Cruce rechazado',
}

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action.replace(/_/g, ' ')
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
}

export function TrazaCaso({ entries, isLoading, error }: TrazaCasoProps) {
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
        className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-400"
        data-testid="traza-caso-error"
      >
        No se pudo cargar la traza: {error}
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
        <p className="text-sm font-medium text-foreground">Sin actividad registrada</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Las acciones del agente y del equipo aparecerán aquí.
        </p>
      </div>
    )
  }

  return (
    <ol className="space-y-0" data-testid="traza-caso">
      {entries.map((entry, idx) => {
        const meta = actorMeta(entry.actorType)
        const hasDetails = entry.details && Object.keys(entry.details).length > 0
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
                <p className="text-sm font-medium text-foreground">{actionLabel(entry.action)}</p>
                <span
                  className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {relativeTime(entry.occurredAt)} · {absolute(entry.occurredAt)}
                {entry.actorId ? ` · ${entry.actorId}` : ''}
              </p>
              {hasDetails && (
                <details className="group">
                  <summary className="cursor-pointer text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground select-none">
                    Detalles
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
