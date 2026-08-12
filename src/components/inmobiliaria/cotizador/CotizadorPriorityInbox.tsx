'use client'

/**
 * CotizadorPriorityInbox — visión #4 "Consultas que necesitan atención".
 *
 * The home-page inbox for the asegurabilidad agent: a severidad-prioritized
 * list of the consultas (work-items) that need a human look — each row surfaces
 * the masked caso, an estado chip, and the agent's suggested action, linking to
 * the per-quote detail. Data comes from the unified human-queue endpoint via
 * `useAgentWorkItems('cotizador')`; the severidad/estado vocabulary + tokens are
 * reused verbatim from <ColaHumana> so chips read identically everywhere.
 *
 * Tolerant-degrade: 404 / agent-not-deployed → friendly EmptyState (the hook
 * normalizes those to an empty list, NOT an error). Loading → skeleton rows.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { CaretRight, Tray, Clock } from '@phosphor-icons/react'

import { MonoLabel } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import type { Severidad, WorkItem } from '@/lib/api/work-item'
import {
  SEVERIDAD_TOKEN,
  severidadLabel,
  estadoLabel,
  relativeTime,
} from '@/components/inmobiliaria/ai/ColaHumana'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'

const NS = 'inmobiliaria.ai.cotizador.overview.inbox'

/** Highest severidad first, then most-recent first (matches ColaHumana). */
const SEVERIDAD_RANK: Record<Severidad, number> = { critica: 3, alta: 2, media: 1, baja: 0 }

function detailHref(item: WorkItem): string {
  return `/panel/inmobiliaria/ai/asegurabilidad/${item.id}`
}

/** Best-effort masked label for the caso row title. */
function casoLabel(item: WorkItem): string {
  if (item.titulo) return item.titulo
  if (item.subject?.masked) return item.subject.masked
  return item.subject?.id ?? item.id
}

function InboxRow({ item, tf }: { item: WorkItem; tf: (k: string, fb: string) => string }) {
  const { t } = useI18n()
  // Finite map crashes on unknown keys — ALWAYS fall back (ColaHumana invariant).
  const sev = SEVERIDAD_TOKEN[item.severidad] ?? SEVERIDAD_TOKEN.media

  return (
    <Link
      href={detailHref(item)}
      className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
      data-testid={`cotizador-inbox-row-${item.id}`}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Chips row: severidad + estado + relative time */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <MonoLabel
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
          >
            {severidadLabel(t, item.severidad)}
          </MonoLabel>
          <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border bg-muted">
            {estadoLabel(t, item.estado, 'cotizador')}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {relativeTime(item.createdAt, t)}
          </span>
        </div>

        {/* Caso (masked title) */}
        <p className="text-sm font-semibold text-fg truncate">
          {casoLabel(item)}
        </p>

        {/* Acción sugerida */}
        <p className="text-xs text-fg-muted leading-snug">
          <span className="font-medium text-fg">
            {tf(`${NS}.accionSugerida`, 'Acción sugerida')}:
          </span>{' '}
          {item.accionSugerida?.label ?? '—'}
        </p>
      </div>
      <CaretRight
        className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}

export function CotizadorPriorityInbox() {
  const { t } = useI18n()
  const tf = (k: string, fb: string) => {
    const r = t(k)
    return r === k ? fb : r
  }

  const { items, total, isLoading, error, errorCrudo, refetch } = useAgentWorkItems('cotizador')

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const rank = SEVERIDAD_RANK[b.severidad] - SEVERIDAD_RANK[a.severidad]
        if (rank !== 0) return rank
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [items],
  )

  return (
    <section aria-label={tf(`${NS}.titulo`, 'Consultas que necesitan atención')}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">
            {tf(`${NS}.titulo`, 'Consultas que necesitan atención')}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {tf(`${NS}.desc`, 'Casos priorizados por urgencia que esperan tu decisión.')}
          </p>
        </div>
        {sorted.length > 0 && (
          <Link
            href="/panel/inmobiliaria/ai/asegurabilidad/cola"
            className="shrink-0 rounded text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
          >
            {tf(`${NS}.verTodas`, 'Ver todas')}
            {total > sorted.length ? ` (${total})` : ''}
          </Link>
        )}
      </div>

      {/* ── Los estados SIN filas van dentro de un recuadro ────────────────
          Sin él, el mensaje quedaba flotando sobre el fondo de la página y la
          sección no se leía como una sección: sólo se veía texto suelto en el
          medio de la nada. Cuando SÍ hay filas no hace falta —cada fila ya es
          una tarjeta con borde— y meterlas en otro recuadro anidaría tarjetas. */}
      {isLoading ? (
        <div className="space-y-2" data-testid="cotizador-inbox-loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[88px] rounded-xl border border-border bg-surface-muted/60 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <FalloDeCarga
            error={errorCrudo ?? error}
            queEs="la cola de consultas"
            onReintentar={refetch}
            className="border-0 bg-transparent"
          />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SinDatos
            queSon="consultas"
            icono={Tray}
            titulo={tf(`${NS}.empty.title`, 'Todo al día')}
            descripcion={tf(
              `${NS}.empty.description`,
              'No hay consultas pendientes de revisión. Aparecerán aquí cuando una requiera tu atención.',
            )}
          />
        </div>
      ) : (
        <div className="space-y-2" data-testid="cotizador-inbox">
          {sorted.map((item) => (
            <InboxRow key={item.id} item={item} tf={tf} />
          ))}
        </div>
      )}
    </section>
  )
}
