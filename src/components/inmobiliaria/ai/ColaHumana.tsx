'use client'

/**
 * ColaHumana — F1 of the Agent Workspace initiative.
 *
 * The transversal "human queue" surface: renders a list of WorkItem[] (any
 * agent) prioritized by severidad, each as a card that surfaces the agent's
 * suggested action + evidence and the real backend actions (Aprobar / Rechazar
 * / …). Generalized from cobranza's EscalationCard (RBAC + claim/assign/resolve
 * kanban) into a prop-driven, agent-agnostic component.
 *
 * Content (titulo, accionSugerida, action labels) is backend-provided Spanish;
 * the chrome labels live under the `inmobiliaria.ai.workspace.*` i18n
 * namespace (extracted from the original inline literals — es output is
 * byte-identical).
 *
 * Styling vocabulary harvested from EscalationCard (mvp:docs/COLOR_SYSTEM.md),
 * mapped to the brand contract tones: danger #C0392B = error/critical,
 * warning #A8730F = attention, success #3F8A53 = ok; theme tokens for chrome.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/components/ui/toast'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  Clock,
  CheckCircle,
  XCircle,
  WarningCircle,
  ShieldWarning,
  Hourglass,
  CaretRight,
} from '@phosphor-icons/react'

import { StatusBadge, type SemanticTone } from '@leasefy/cadence'

import type {
  Severidad,
  WorkItem,
  WorkItemAction,
  WorkItemFlag,
} from '@/lib/api/work-item'
import { useI18n } from '@/lib/i18n'
import type { TranslationParams } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'

// ── Vocabulary ──────────────────────────────────────────────────────────────
// Exported (F6): the workspace primitives (SalaAgente, AccionSugerida, the
// detail page) reuse these maps + label helpers so estado/severidad/flag
// chips render identically everywhere. Label TEXT lives in the
// `inmobiliaria.ai.workspace.*` i18n namespace; the helpers take `t` (from
// useI18n) and degrade to the raw backend value when a key is unknown —
// t() echoes the key path on a miss, which we never want to render.

const WORKSPACE_NS = 'inmobiliaria.ai.workspace'

/** Shape of useI18n().t — primitives thread it into the shared helpers. */
export type TranslateFn = (key: string, params?: TranslationParams) => string

/** Vocabulary lookup with raw-value fallback for out-of-contract keys. */
export function workspaceVocab(t: TranslateFn, group: string, key: string): string {
  const full = `${WORKSPACE_NS}.${group}.${key}`
  const label = t(full)
  return label === full ? key : label
}

export const severidadLabel = (t: TranslateFn, sev: string): string =>
  workspaceVocab(t, 'severidad', sev)

/**
 * Estado chip label. When `agente` is provided, the per-agent override
 * `inmobiliaria.ai.workspace.pages.{agente}.estado.{estado}` wins (e.g.
 * cotizador renders its own domain vocabulary); on a t() miss (key echo)
 * it degrades to the generic workspace estado vocabulary.
 */
export const estadoLabel = (t: TranslateFn, estado: string, agente?: string): string => {
  if (agente) {
    const override = `${WORKSPACE_NS}.pages.${agente}.estado.${estado}`
    const label = t(override)
    if (label !== override) return label
  }
  return workspaceVocab(t, 'estado', estado)
}

export const flagLabel = (t: TranslateFn, flag: string): string =>
  workspaceVocab(t, 'flag', flag)

export const SEVERIDAD_TOKEN: Record<Severidad, { bg: string; text: string; ring: string }> = {
  critica: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    ring: 'ring-danger/30 animate-pulse',
  },
  alta: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    ring: 'ring-danger/30',
  },
  media: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    ring: 'ring-warning/30',
  },
  baja: {
    bg: 'bg-success-soft',
    text: 'text-success',
    ring: 'ring-success/30',
  },
}

const SEVERIDAD_RANK: Record<Severidad, number> = { critica: 3, alta: 2, media: 1, baja: 0 }

/** Flag chip icon + classes; label text resolves via flagLabel(t, flag). */
export const FLAG_META: Record<WorkItemFlag, { icon: typeof WarningCircle; cls: string }> = {
  necesita_humano: {
    icon: WarningCircle,
    cls: 'bg-warning-soft text-warning ring-warning/30',
  },
  t323: {
    icon: ShieldWarning,
    cls: 'bg-danger-soft text-danger ring-danger/30',
  },
  en_espera: {
    icon: Hourglass,
    cls: 'bg-surface-muted text-fg-muted ring-border',
  },
}

export function relativeTime(iso: string, t: TranslateFn): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (deltaSec < 60) return t(`${WORKSPACE_NS}.tiempo.s`, { n: deltaSec })
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return t(`${WORKSPACE_NS}.tiempo.m`, { n: deltaMin })
  const deltaHr = Math.round(deltaMin / 60)
  if (deltaHr < 24) return t(`${WORKSPACE_NS}.tiempo.h`, { n: deltaHr })
  return t(`${WORKSPACE_NS}.tiempo.d`, { n: Math.round(deltaHr / 24) })
}

/** Maps a work-item action kind to the Cadence Button variant. */
export const ACTION_KIND_VARIANT: Record<
  WorkItemAction['kind'],
  'default' | 'destructive' | 'outline'
> = {
  primary: 'default',
  danger: 'destructive',
  neutral: 'outline',
}

/** Maps a severidad to a Cadence StatusBadge tone (BRAND-CONTRACT §2). */
export const SEVERIDAD_TONE: Record<Severidad, SemanticTone> = {
  critica: 'critical',
  alta: 'critical',
  media: 'warning',
  baja: 'success',
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface ColaHumanaProps {
  items: WorkItem[]
  isLoading?: boolean
  /**
   * El error ENTERO, no su mensaje: `FalloDeCarga` lo clasifica (404, 401,
   * red, servidor) y decide solo si reintentar tiene sentido. Un `string`
   * sigue sirviendo (los hooks viejos guardan `err.message`).
   */
  error?: unknown
  /** Volver a pedir la cola cuando el fallo es de los que pueden cambiar. */
  onReintentar?: () => void | Promise<unknown>
  /**
   * Agent id used to resolve per-agent estado overrides
   * (`inmobiliaria.ai.workspace.pages.{agente}.estado.*`) in all estado chips.
   */
  agente?: string
  /** Posts the action's body to its endpoint; returns ok/error for toasting. */
  onAction: (
    item: WorkItem,
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  /** Optional: open the work-item detail. */
  onOpen?: (item: WorkItem) => void
  /** Title for the empty state (defaults to the generic "Cola vacía"). */
  emptyTitle?: string
  /** Copy for the empty state. */
  emptyHint?: string
  /** Optional CTA below the empty-state hint (small primary pill link). */
  emptyAction?: { label: string; href: string }
}

// ── Item card ───────────────────────────────────────────────────────────────

function WorkItemCard({
  item,
  agente,
  onAction,
  onOpen,
}: {
  item: WorkItem
  agente?: string
  onAction: ColaHumanaProps['onAction']
  onOpen?: (item: WorkItem) => void
}) {
  const { t } = useI18n()
  const [reasonForActionId, setReasonForActionId] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  async function run(action: WorkItemAction, body?: Record<string, unknown>) {
    setBusyActionId(action.id)
    const res = await onAction(item, action, body)
    setBusyActionId(null)
    if (res.ok) {
      toast.success(t(`${WORKSPACE_NS}.acciones.toastOk`, { label: action.label }))
      setReasonForActionId(null)
      setReasonText('')
    } else {
      toast.error(t(`${WORKSPACE_NS}.acciones.toastFail`, { error: res.error ?? 'error' }))
    }
  }

  function handleClick(action: WorkItemAction) {
    if (action.requiresReason) {
      // First click reveals the reason input; submit happens from the panel.
      setReasonForActionId((cur) => (cur === action.id ? null : action.id))
      return
    }
    void run(action)
  }

  const pendingReasonAction = item.actions.find((a) => a.id === reasonForActionId)

  return (
    <div
      className="rounded-lg border border-border bg-surface p-3 space-y-2"
      data-testid={`work-item-${item.id}`}
    >
      {/* Header: severidad + estado + flags + relative time */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge
            tone={SEVERIDAD_TONE[item.severidad] ?? 'warning'}
            pulse={item.severidad === 'critica'}
          >
            {severidadLabel(t, item.severidad)}
          </StatusBadge>
          <span className="inline-flex items-center text-[11px] text-fg-muted px-2 py-0.5 rounded-full ring-1 ring-border bg-surface-muted">
            {estadoLabel(t, item.estado, agente)}
          </span>
          {item.flags.map((flag) => {
            // Unknown flags are silently skipped (finite-map fallback).
            const meta = FLAG_META[flag] ?? null
            if (!meta) return null
            const Icon = meta.icon
            return (
              <span
                key={flag}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
                {flagLabel(t, flag)}
              </span>
            )
          })}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted tabular-nums">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {relativeTime(item.createdAt, t)}
        </span>
      </div>

      {/* Body: title + suggested action + evidence.
          ALLOWLIST: whole-card clickable region (multiline title + suggested-action
          panel + evidence). List-row/whole-card precedent — Button can't host the
          rich multiline body; accessible name supplied via aria-label. */}
      <button
        type="button"
        onClick={() => onOpen?.(item)}
        disabled={!onOpen}
        className="w-full text-left space-y-1.5 focus:outline-none focus:ring-2 focus:ring-primary rounded-md disabled:cursor-default"
        aria-label={t(`${WORKSPACE_NS}.acciones.abrir`, { titulo: item.titulo })}
      >
        <p className="text-sm font-semibold text-fg flex items-center gap-1">
          {item.titulo}
          {onOpen && <CaretRight className="w-3.5 h-3.5 text-fg-muted" aria-hidden="true" />}
        </p>

        {/* Suggested action — the heart of "how the agent's suggestion surfaces" */}
        <div className="rounded-lg bg-surface-muted/50 px-2.5 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-fg">{item.accionSugerida.label}</p>
            {typeof item.accionSugerida.confianza === 'number' && (
              <span className="text-[11px] font-mono text-fg-muted tabular-nums shrink-0">
                {t(`${WORKSPACE_NS}.acciones.confianza`, {
                  pct: Math.round(item.accionSugerida.confianza * 100),
                })}
              </span>
            )}
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            {item.accionSugerida.razon}
          </p>
          {item.accionSugerida.evidencia && item.accionSugerida.evidencia.length > 0 && (
            <dl className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5">
              {item.accionSugerida.evidencia.map((e, i) => (
                <div key={`${e.label}-${i}`} className="flex items-center gap-1">
                  <dt className="text-[11px] text-fg-muted">{e.label}:</dt>
                  <dd className="text-[11px] font-medium text-fg tabular-nums">{e.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </button>

      {/* Reason input (revealed by a requiresReason action) */}
      {pendingReasonAction && (
        <div className="space-y-1.5 rounded-lg border border-border p-2">
          <label className="text-[11px] text-fg-muted" htmlFor={`reason-${item.id}`}>
            {t(`${WORKSPACE_NS}.acciones.motivoPara`, {
              accion: pendingReasonAction.label.toLowerCase(),
            })}
          </label>
          <Textarea
            id={`reason-${item.id}`}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={2}
            className="w-full text-xs resize-none"
            placeholder={t(`${WORKSPACE_NS}.acciones.motivoPlaceholder`)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              hideArrow
              disabled={reasonText.trim().length === 0 || busyActionId !== null}
              onClick={() => void run(pendingReasonAction, { reason: reasonText.trim() })}
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {t(`${WORKSPACE_NS}.acciones.confirmar`)}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => {
                setReasonForActionId(null)
                setReasonText('')
              }}
            >
              {t(`${WORKSPACE_NS}.acciones.cancelar`)}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {item.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={ACTION_KIND_VARIANT[action.kind]}
              size="sm"
              hideArrow
              disabled={busyActionId !== null}
              aria-pressed={action.requiresReason ? reasonForActionId === action.id : undefined}
              onClick={() => handleClick(action)}
            >
              {action.kind === 'primary' && <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {action.kind === 'danger' && <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── List ────────────────────────────────────────────────────────────────────

export function ColaHumana({
  items,
  isLoading,
  error,
  onReintentar,
  agente,
  onAction,
  onOpen,
  emptyTitle,
  emptyHint,
  emptyAction,
}: ColaHumanaProps) {
  const { t } = useI18n()
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const rank = SEVERIDAD_RANK[b.severidad] - SEVERIDAD_RANK[a.severidad]
        if (rank !== 0) return rank
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [items],
  )

  // La cola es una lista de registros sin techo: el endpoint unificado devuelve
  // los work-items del agente y acá se pintaban todos. Mismo pie que las tablas
  // del panel (lo comparten las cinco colas: pagos, estudio, matching, avalúos
  // y asegurabilidad). El orden por severidad se calcula sobre la lista
  // COMPLETA antes de recortar, así la página 1 sigue trayendo lo más urgente.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(sorted, { resetKey: agente })

  // Los cuatro estados, en el orden de la casa: cargando → falló → vacío →
  // hay datos. La carga y el fallo van ANTES que el vacío para que la cola
  // nunca diga «no hay casos» mientras todavía no sabe.
  if (isLoading) {
    // Esqueleto con la forma de lo que llega: tarjetas apiladas, no una
    // grilla. Un esqueleto que no respeta la forma salta peor que ninguno.
    return (
      <div
        className="space-y-2"
        role="status"
        aria-label="Cargando"
        data-testid="cola-humana-loading"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg border border-border bg-surface-muted/40 animate-pulse"
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  if (error) {
    // El cartel de la casa decide qué decir y si ofrecer reintentar: un 403 no
    // se anuncia igual que una red caída, y sobre un 404 no se reintenta.
    return (
      <div data-testid="cola-humana-error">
        <FalloDeCarga error={error} queEs="la cola" onReintentar={onReintentar} />
      </div>
    )
  }

  if (sorted.length === 0) {
    // El vacío de la casa: círculo gris, título, una línea y, si la pantalla
    // lo pide, una salida. `SinDatos` pinta la salida como el botón primario
    // del DS —pill, foco cobalto— en vez del `<Link>` con clases a mano.
    return (
      <div
        className="rounded-lg border border-border bg-surface overflow-hidden"
        data-testid="cola-humana-empty"
      >
        <SinDatos
          queSon="casos"
          icono={CheckCircle}
          titulo={emptyTitle ?? t(`${WORKSPACE_NS}.cola.vacia`)}
          descripcion={emptyHint ?? t(`${WORKSPACE_NS}.cola.vaciaHint`)}
          accion={
            emptyAction ? (
              <Button asChild variant="outline" data-testid="cola-humana-empty-action">
                <Link href={emptyAction.href}>{emptyAction.label}</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="cola-humana">
      {pageItems.map((item) => (
        <WorkItemCard key={item.id} item={item} agente={agente} onAction={onAction} onOpen={onOpen} />
      ))}

      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}
