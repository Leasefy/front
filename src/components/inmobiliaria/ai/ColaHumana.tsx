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
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Clock,
  CheckCircle,
  XCircle,
  WarningCircle,
  ShieldWarning,
  Hourglass,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

// ── Fila de la cola ─────────────────────────────────────────────────────────
//
// Nico (2026-09-08), sobre «Candidatos sugeridos»: «acá no veo que estés
// usando la tabla como tenemos en la plataforma». Era cierto: la cola pintaba
// tarjetas apiladas mientras Contratos, Postulaciones, Inquilinos y Agenda
// usan la misma tabla. Ahora la comparten las cinco colas (matching, estudio,
// asegurabilidad, pagos y avalúos), con el mismo contenedor, los mismos
// encabezados y el mismo pie que el resto del panel.
//
// Lo que la tarjeta tenía y la fila conserva: el caso, lo que el agente
// propone con su confianza y su razón, la evidencia, y los botones reales.
// El motivo de un rechazo se despliega en una fila propia a todo el ancho —
// un textarea metido en una celda angosta no se puede escribir.

function FilaDeCaso({
  item,
  agente,
  columnas,
  onAction,
  onOpen,
}: {
  item: WorkItem
  agente?: string
  /** Cuántas columnas tiene la tabla: lo necesita la fila del motivo. */
  columnas: number
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
      // El primer clic despliega el motivo; el envío sale del panel de abajo.
      setReasonForActionId((cur) => (cur === action.id ? null : action.id))
      return
    }
    void run(action)
  }

  const pendingReasonAction = item.actions.find((a) => a.id === reasonForActionId)
  const abrible = Boolean(onOpen)

  return (
    <>
      <TableRow
        data-testid={`work-item-${item.id}`}
        className={abrible ? 'cursor-pointer' : undefined}
        onClick={abrible ? () => onOpen?.(item) : undefined}
        onKeyDown={
          abrible
            ? (ev) => {
                if (ev.key !== 'Enter' && ev.key !== ' ') return
                ev.preventDefault()
                onOpen?.(item)
              }
            : undefined
        }
        role={abrible ? 'button' : undefined}
        tabIndex={abrible ? 0 : undefined}
        aria-label={abrible ? t(`${WORKSPACE_NS}.acciones.abrir`, { titulo: item.titulo }) : undefined}
      >
        {/* Caso: el título, lo que el agente propone y con qué evidencia. */}
        <TableCell className="max-w-[420px] align-top">
          <p className="font-medium text-fg">{item.titulo}</p>

          <p className="mt-0.5 flex items-baseline gap-2 text-xs">
            <span className="font-medium text-fg-muted">{item.accionSugerida.label}</span>
            {typeof item.accionSugerida.confianza === 'number' && (
              <span className="shrink-0 tabular-nums text-fg-subtle">
                {t(`${WORKSPACE_NS}.acciones.confianza`, {
                  pct: Math.round(item.accionSugerida.confianza * 100),
                })}
              </span>
            )}
          </p>

          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted line-clamp-2">
            {item.accionSugerida.razon}
          </p>

          {item.accionSugerida.evidencia && item.accionSugerida.evidencia.length > 0 && (
            <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
              {item.accionSugerida.evidencia.map((e, i) => (
                <div key={`${e.label}-${i}`} className="flex items-center gap-1">
                  <dt className="text-[11px] text-fg-subtle">{e.label}:</dt>
                  <dd className="text-[11px] font-medium tabular-nums text-fg-muted">{e.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </TableCell>

        {/* Severidad + banderas: por qué esto está arriba en la cola. */}
        <TableCell className="align-top">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              tone={SEVERIDAD_TONE[item.severidad] ?? 'warning'}
              pulse={item.severidad === 'critica'}
            >
              {severidadLabel(t, item.severidad)}
            </StatusBadge>
            {item.flags.map((flag) => {
              // Una bandera fuera de contrato se salta en silencio.
              const meta = FLAG_META[flag] ?? null
              if (!meta) return null
              const Icon = meta.icon
              return (
                <span
                  key={flag}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${meta.cls}`}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {flagLabel(t, flag)}
                </span>
              )
            })}
          </div>
        </TableCell>

        <TableCell className="align-top">
          <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-muted ring-1 ring-border">
            {estadoLabel(t, item.estado, agente)}
          </span>
        </TableCell>

        <TableCell className="whitespace-nowrap align-top tabular-nums text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {relativeTime(item.createdAt, t)}
          </span>
        </TableCell>

        {/* Los botones viven en la fila pero no la abren: un clic en «Aprobar»
            que además navegue al detalle es un clic que hace dos cosas. */}
        <TableCell
          className="align-top"
          onClick={(ev) => ev.stopPropagation()}
          onKeyDown={(ev) => ev.stopPropagation()}
        >
          {item.actions.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                  {action.kind === 'primary' && <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                  {action.kind === 'danger' && <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </TableCell>
      </TableRow>

      {/* El motivo, a todo el ancho y pegado a su caso. */}
      {pendingReasonAction && (
        <TableRow data-testid={`work-item-motivo-${item.id}`}>
          <TableCell colSpan={columnas} className="bg-surface-muted/40">
            <div className="space-y-1.5">
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
                className="w-full max-w-2xl resize-none text-xs"
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
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
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
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Lista ───────────────────────────────────────────────────────────────────

/** Las cinco columnas de la cola, en el orden en que se leen. */
const COLUMNAS = ['caso', 'severidad', 'estado', 'antiguedad', 'acciones'] as const

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
    return (
      <div data-testid="cola-humana-loading">
        <EsqueletoTabla columnas={COLUMNAS.length} filas={5} />
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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" data-testid="cola-humana">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNAS.map((c) => (
              <TableHead
                key={c}
                className={c === 'acciones' ? 'whitespace-nowrap text-right' : 'whitespace-nowrap'}
              >
                {t(`${WORKSPACE_NS}.cola.columnas.${c}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            // El vacío vive DENTRO del cuerpo para que los encabezados se
            // sigan viendo: la tabla existe, lo que no hay son casos.
            <TableRow data-testid="cola-humana-empty">
              <TableCell colSpan={COLUMNAS.length} className="p-0">
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
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((item) => (
              <FilaDeCaso
                key={item.id}
                item={item}
                agente={agente}
                columnas={COLUMNAS.length}
                onAction={onAction}
                onOpen={onOpen}
              />
            ))
          )}
        </TableBody>
      </Table>

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
