'use client'

/**
 * WorkItemDetalle — F7/F8 of the Agent Workspace initiative.
 *
 * The shared "Detalle de caso" body, extracted from the F6 conciliación [id]
 * page once Estudio and Matching needed the same surface (3rd copy → extract).
 *
 * Renders: header with the ColaHumana
 * estado/severidad/flag vocabulary (t323 included) · left = <AccionSugerida>
 * + contexto blocks (+ optional cross-workspace link card) · right =
 * <TrazaCaso>. Handles loading, error, not-available (the agent doesn't
 * publish a detail resolver — 404), not-found (the item is missing) and
 * already-decided (Decisión block, actions hidden) states.
 *
 * Pure like the other primitives: the page owns the hook
 * (useWorkItemDetail) + runWorkItemAction + navigation; this component only
 * receives data and an onAction callback.
 */

import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Robot,
  XCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { CrossFade, MonoLabel, StatusBadge, type SemanticTone } from '@leasefy/cadence'

import type { WorkItemAction, WorkItemEstado } from '@/lib/api/work-item'
import type { WorkItemDetailResponse } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { AccionSugerida } from './AccionSugerida'
import { TrazaCaso } from './TrazaCaso'
import {
  FLAG_META,
  SEVERIDAD_TONE,
  estadoLabel,
  flagLabel,
  relativeTime,
  severidadLabel,
} from './ColaHumana'

const NS = 'inmobiliaria.ai.workspace.detalle'

/** Glow up 22-10: las banderas con el punto de StatusBadge (antes pastillas de 11 px con anillo). */
const TONO_DE_LA_BANDERA: Record<string, SemanticTone> = {
  necesita_humano: 'warning',
  t323: 'critical',
  en_espera: 'neutral',
}

/**
 * Estados where the human can still act. Everything else
 * (aprobado | ejecutando | resuelto | rechazado | fallo) shows the status
 * block and hides the action buttons.
 */
const ACTIONABLE_ESTADOS: ReadonlySet<WorkItemEstado> = new Set([
  'detectado',
  'sugerido',
  'en_revision',
])

// ── Props ───────────────────────────────────────────────────────────────────

/** Soft cross-link to a sibling workspace (AGENT-WORKSPACE-SPEC §1.5). */
export interface WorkItemDetalleCrossLink {
  /** The question the operator is likely asking, e.g. "¿Qué propiedad le calza?". */
  pregunta: string
  /** Destination label, e.g. "Workspace de Matching". */
  destino: string
  href: string
}

export interface WorkItemDetalleProps {
  data: WorkItemDetailResponse | null
  isLoading?: boolean
  error?: string | null
  /**
   * Backend 404 — the agent doesn't publish a detail resolver (yet). Renders
   * the "Detalle no disponible" state, NOT "Caso no encontrado".
   */
  notAvailable?: boolean
  /** Href of the agent's cola, used by the breadcrumb + not-found CTA. */
  colaHref: string
  /** Breadcrumb label, e.g. "Cola de conciliación". */
  colaLabel: string
  /** Phosphor icon for the breadcrumb; falls back to Robot (never crash). */
  icon?: Icon
  /**
   * Posts the action's body to its endpoint. `fallo` es el error entero para
   * el traductor (`error` es el código viejo y no se muestra).
   */
  onAction: (
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string; fallo?: unknown }>
  crossLink?: WorkItemDetalleCrossLink
  /** Optional CTA for the not-available/not-found states (pill link). */
  notFoundAction?: { label: string; href: string }
}

// ── Component ───────────────────────────────────────────────────────────────

export function WorkItemDetalle({
  data,
  isLoading,
  error,
  notAvailable,
  colaHref,
  colaLabel,
  icon,
  onAction,
  crossLink,
  notFoundAction,
}: WorkItemDetalleProps) {
  const { t } = useI18n()
  // Finite icon maps crash when a key is missing — ALWAYS fall back here.
  const BreadcrumbIcon = icon ?? Robot

  // ── Loading skeleton ──────────────────────────────────────────────────────
  // Movimiento: cada estado en un `CrossFade` con su clave (esqueleto → caso,
  // → fallo, → no disponible, → no encontrado); lo que ya estaba al montarse
  // no se anima.
  if (isLoading) {
    return (
      <CrossFade swapKey="esqueleto">
      <div className="p-6 lg:p-8 space-y-6" data-testid="caso-loading">
        <div className="h-5 w-48 rounded bg-muted/40 animate-pulse" />
        <div className="h-8 w-2/3 rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-48 rounded-lg border border-border bg-muted/40 animate-pulse" />
            <div className="h-32 rounded-lg border border-border bg-muted/40 animate-pulse" />
          </div>
          <div className="lg:col-span-2 h-64 rounded-lg border border-border bg-muted/40 animate-pulse" />
        </div>
      </div>
      </CrossFade>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    // 02-10-2026 · Por el cartel de la casa, no «No se pudo cargar el caso:
    // 500». Con la salida a la cola: sobre un 404 o un 403 reintentar no sirve.
    return (
      <CrossFade swapKey="fallo">
      <div className="p-6 lg:p-8 space-y-4">
        <div data-testid="caso-error">
          <FalloDeCarga
            error={error}
            queEs="el caso"
            volverA={{ label: t(`${NS}.volverACola`), href: colaHref }}
          />
        </div>
      </div>
      </CrossFade>
    )
  }

  // CTA de los empty states (estilo limpio: pill outlined ElevenLabs, único
  // elemento con énfasis): el notFoundAction de la página o, si no llega, el
  // clásico "Volver a la cola". Ambos comparten el mismo pill mudo.
  const emptyStateCta = notFoundAction ? (
    <Button asChild variant="outline" size="sm" hideArrow>
      <Link href={notFoundAction.href} data-testid="caso-not-found-action">
        {notFoundAction.label}
      </Link>
    </Button>
  ) : (
    <Button asChild variant="outline" size="sm" hideArrow>
      <Link href={colaHref}>{t(`${NS}.volverACola`)}</Link>
    </Button>
  )

  // ── Not available (404 — the backend doesn't publish the resolver) ────────
  // Distinct from "Caso no encontrado": the case may exist, but this agent
  // doesn't expose a detail endpoint yet.
  if (notAvailable) {
    return (
      <CrossFade swapKey="no-disponible">
      <div className="p-6 lg:p-8 space-y-4">
        <div
          role="status"
          aria-label={t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleTitle')}
          className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
          data-testid="caso-no-disponible"
        >
          {/* El ícono suelto, sin caja (Cadence 2). */}
          <BreadcrumbIcon weight="light" className="h-8 w-8 text-fg-subtle" aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="text-[15px] font-medium text-fg">
              {t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleTitle')}
            </p>
            <p className="text-sm text-fg-muted max-w-sm leading-relaxed mx-auto">
              {t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleBody')}
            </p>
          </div>
          <div className="mt-1">{emptyStateCta}</div>
        </div>
      </div>
      </CrossFade>
    )
  }

  // ── Not found (the item itself is missing) ────────────────────────────────
  if (!data) {
    return (
      <CrossFade swapKey="no-encontrado">
      <div className="p-6 lg:p-8 space-y-4">
        <div
          role="status"
          aria-label={t(`${NS}.notFoundTitle`)}
          className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
          data-testid="caso-not-found"
        >
          <MagnifyingGlass weight="light" className="h-8 w-8 text-fg-subtle" aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="text-[15px] font-medium text-fg">
              {t(`${NS}.notFoundTitle`)}
            </p>
            <p className="text-sm text-fg-muted max-w-sm leading-relaxed mx-auto">
              {t(`${NS}.notFoundBody`)}
            </p>
          </div>
          <div className="mt-1">{emptyStateCta}</div>
        </div>
      </div>
      </CrossFade>
    )
  }

  const { item, contexto, traza } = data
  const isActionable = ACTIONABLE_ESTADOS.has(item.estado)

  return (
    <CrossFade swapKey="caso">
    <div className="p-6 lg:p-8 space-y-6" data-testid={`caso-${item.id}`}>
      {/* Glow up 22-10 (la vara de Deuda del mes): la vuelta a la cola y el encabezado común
          —sección, el caso como título liviano de 40 px, la severidad y el estado al lado con su
          punto, y una línea con cuándo llegó y las banderas—. Antes un h1 suelto, sin salida, con
          pastillas de 11 px. */}
      <div className="space-y-3">
        <BackButton variant="subtle" href={colaHref} label={colaLabel} />
        <EncabezadoDePantalla
          seccion={t('inmobiliaria.nav.secAgentes')}
          titulo={item.titulo}
          junto={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={SEVERIDAD_TONE[item.severidad] ?? 'warning'} pulse={item.severidad === 'critica'}>
                {severidadLabel(t, item.severidad)}
              </StatusBadge>
              <StatusBadge tone="neutral" dot={false}>
                {estadoLabel(t, item.estado, item.agente)}
              </StatusBadge>
            </span>
          }
          descripcion={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {relativeTime(item.createdAt, t)}
              </span>
              {item.flags.map((flag) => {
                // Unknown flags are silently skipped (finite-map fallback).
                const meta = FLAG_META[flag] ?? null
                if (!meta) return null
                return (
                  <StatusBadge key={flag} tone={TONO_DE_LA_BANDERA[flag] ?? 'neutral'}>
                    {flagLabel(t, flag)}
                  </StatusBadge>
                )
              })}
            </span>
          }
        />
      </div>

      {/* 2-col: suggestion + contexto | traza */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {!isActionable ? (
            /* No longer actionable — actions hidden, show the status block */
            <div
              className="rounded-lg border border-border bg-card p-4 space-y-2"
              data-testid="caso-decision"
            >
              <MonoLabel className="text-muted-foreground">
                {t(`${NS}.decision`)}
              </MonoLabel>
              <div className="flex items-center gap-2">
                {item.estado === 'rechazado' || item.estado === 'fallo' ? (
                  <XCircle className="w-5 h-5 text-danger" weight="duotone" aria-hidden="true" />
                ) : item.estado === 'ejecutando' ? (
                  <Clock className="w-5 h-5 text-muted-foreground" weight="duotone" aria-hidden="true" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-success" weight="duotone" aria-hidden="true" />
                )}
                <p
                  className={`text-sm font-medium ${
                    item.estado === 'fallo' ? 'text-danger' : 'text-foreground'
                  }`}
                >
                  {estadoLabel(t, item.estado, item.agente)}
                </p>
              </div>
              <p className="text-caption text-muted-foreground">
                {[
                  item.decidedBy
                    ? t(`${NS}.decididoPor`, { nombre: item.decidedBy })
                    : t(`${NS}.decisionRegistrada`),
                  item.decidedAt ? relativeTime(item.decidedAt, t) : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ) : (
            <AccionSugerida
              accion={item.accionSugerida}
              actions={item.actions}
              onAction={onAction}
            />
          )}

          {/* Contexto blocks */}
          {contexto.map((block, i) => (
            <section
              key={`${block.title}-${i}`}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
              data-testid={`caso-contexto-${i}`}
            >
              <h2 className="text-sm font-medium text-foreground">{block.title}</h2>
              <dl className="divide-y divide-border">
                {block.rows.map((row, j) => (
                  <div
                    key={`${row.label}-${j}`}
                    className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <dt className="text-caption text-muted-foreground">{row.label}</dt>
                    <dd className="text-body-sm text-foreground tabular-nums text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          {/* Soft cross-link to a sibling workspace */}
          {crossLink && (
            <Link
              href={crossLink.href}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors group"
              data-testid="caso-cross-link"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{crossLink.pregunta}</p>
                <p className="text-caption text-muted-foreground mt-0.5">{crossLink.destino}</p>
              </div>
            </Link>
          )}
        </div>

        {/* Traza */}
        <aside className="lg:col-span-2 space-y-2">
          <h2 className="text-sm font-medium text-foreground">{t(`${NS}.trazaTitle`)}</h2>
          <TrazaCaso entries={traza} agente={item.agente} />
        </aside>
      </div>
    </div>
    </CrossFade>
  )
}
