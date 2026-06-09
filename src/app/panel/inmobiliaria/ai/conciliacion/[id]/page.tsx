'use client'

/**
 * /ai/conciliacion/[id] — F6: the Conciliación case detail (Detalle de caso).
 *
 * Reads GET /ai-hub/work-items/conciliacion/{id} (item + contexto + traza) and
 * renders: breadcrumb · header with the ColaHumana estado/severidad/flag
 * vocabulary · left = <AccionSugerida> + contexto blocks · right = <TrazaCaso>.
 *
 * Actions post via runWorkItemAction (the runAction pattern), refetch, then
 * navigate back to the cola. Already-decided items (resuelto/rechazado) hide
 * the actions and show a Decisión block instead.
 */

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Bank, CaretLeft, CheckCircle, Clock, MagnifyingGlass, XCircle } from '@phosphor-icons/react'

import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { AccionSugerida } from '@/components/inmobiliaria/ai/AccionSugerida'
import { TrazaCaso } from '@/components/inmobiliaria/ai/TrazaCaso'
import {
  ESTADO_LABEL,
  FLAG_META,
  SEVERIDAD_LABEL,
  SEVERIDAD_TOKEN,
  relativeTime,
} from '@/components/inmobiliaria/ai/ColaHumana'

const COLA_HREF = '/panel/inmobiliaria/ai/conciliacion/cola'

function BackToCola() {
  return (
    <Link
      href={COLA_HREF}
      className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
    >
      <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
      <Bank className="w-3.5 h-3.5" aria-hidden="true" />
      Cola de conciliación
    </Link>
  )
}

export default function ConciliacionCasoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable, refetch } = useWorkItemDetail('conciliacion', id)

  async function handleAction(action: WorkItemAction, body?: Record<string, unknown>) {
    const res = await runWorkItemAction(action, body)
    if (res.ok) {
      // Refresh the detail (estado/traza change) and return to the cola.
      await refetch()
      router.push(COLA_HREF)
    }
    return res
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6" data-testid="caso-loading">
        <div className="h-5 w-48 rounded bg-muted/40 animate-pulse" />
        <div className="h-8 w-2/3 rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-48 rounded-xl border border-border bg-muted/40 animate-pulse" />
            <div className="h-32 rounded-xl border border-border bg-muted/40 animate-pulse" />
          </div>
          <div className="lg:col-span-2 h-64 rounded-xl border border-border bg-muted/40 animate-pulse" />
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <BackToCola />
        <div
          className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-400"
          data-testid="caso-error"
        >
          No se pudo cargar el caso: {error}
        </div>
      </div>
    )
  }

  // ── Not found (404 / missing) ─────────────────────────────────────────────
  if (!data || notAvailable) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <BackToCola />
        <div
          className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
          data-testid="caso-not-found"
        >
          <MagnifyingGlass
            className="w-8 h-8 mx-auto text-muted-foreground mb-2"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">Caso no encontrado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Puede que ya se haya resuelto o que el enlace no sea válido.
          </p>
          <Link
            href={COLA_HREF}
            className="inline-flex items-center gap-1 mt-3 text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition"
          >
            Volver a la cola
          </Link>
        </div>
      </div>
    )
  }

  const { item, contexto, traza } = data
  const sev = SEVERIDAD_TOKEN[item.severidad]
  const isDecided = item.estado === 'resuelto' || item.estado === 'rechazado'

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid={`caso-${item.id}`}>
      {/* Breadcrumb + header */}
      <header className="space-y-2">
        <BackToCola />
        <h1 className="text-2xl font-semibold text-foreground">{item.titulo}</h1>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
          >
            {SEVERIDAD_LABEL[item.severidad]}
          </span>
          <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border bg-muted">
            {ESTADO_LABEL[item.estado]}
          </span>
          {item.flags.map((flag) => {
            const meta = FLAG_META[flag]
            const Icon = meta.icon
            return (
              <span
                key={flag}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
                {meta.label}
              </span>
            )
          })}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {relativeTime(item.createdAt)}
          </span>
        </div>
      </header>

      {/* 2-col: suggestion + contexto | traza */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {isDecided ? (
            /* Already decided — actions hidden, show the decision block */
            <div
              className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-2"
              data-testid="caso-decision"
            >
              <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                Decisión
              </p>
              <div className="flex items-center gap-2">
                {item.estado === 'resuelto' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" weight="duotone" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500" weight="duotone" aria-hidden="true" />
                )}
                <p className="text-sm font-semibold text-foreground">{ESTADO_LABEL[item.estado]}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.decidedBy ? `Por ${item.decidedBy}` : 'Decisión registrada'}
                {item.decidedAt ? ` · ${relativeTime(item.decidedAt)}` : ''}
              </p>
            </div>
          ) : (
            <AccionSugerida
              accion={item.accionSugerida}
              actions={item.actions}
              onAction={handleAction}
            />
          )}

          {/* Contexto blocks */}
          {contexto.map((block, i) => (
            <section
              key={`${block.title}-${i}`}
              className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-2"
              data-testid={`caso-contexto-${i}`}
            >
              <h2 className="text-sm font-semibold text-foreground">{block.title}</h2>
              <dl className="divide-y divide-border">
                {block.rows.map((row, j) => (
                  <div
                    key={`${row.label}-${j}`}
                    className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className="text-xs font-medium text-foreground tabular-nums text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        {/* Traza */}
        <aside className="lg:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Traza del caso</h2>
          <TrazaCaso entries={traza} />
        </aside>
      </div>
    </div>
  )
}
