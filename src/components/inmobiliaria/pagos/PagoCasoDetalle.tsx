'use client'

/**
 * PagoCasoDetalle — vista individual de UN pago a 3 COLUMNAS (visión punto 11).
 *
 *   IZQ    → Contexto: inquilino/propietario, contrato, inmueble, valor, concepto,
 *            fecha límite, estado (<PagoEstadoBadge>), canal, método, responsable.
 *   CENTRO → Actividad / línea de tiempo del caso (link generado/enviado/abierto,
 *            intentos, pago recibido, conciliación, notificaciones, cambios de
 *            estado, errores, ajustes) — reusa <TrazaCaso>.
 *   DER    → Recomendación IA: siguiente mejor acción, riesgo, motivo,
 *            automatización activa y botones de acción (<AccionSugerida>).
 *
 * SOLO UX sobre la base ya funcional. NO inventa endpoints/entidades: consume el
 * mismo `WorkItemDetailResponse` (item/contexto/traza) que ya carga la página vía
 * useWorkItemDetail, y posta a las acciones reales del backend (triple-gate de AP)
 * a través de runWorkItemAction → onAction. T-323: nunca auto-rechaza; cuando un
 * caso ya fue decidido, las acciones se ocultan y se muestra el bloque de decisión.
 *
 * Estado del pago vía <PagoEstadoBadge> + vocabulario de src/lib/pagos/estados.ts.
 * Tonos por TOKENS del DS (primary/success/warning/danger + *-soft + fg/surface) —
 * CERO hex inline. Reusa el vocabulario severidad/estado/flags de <ColaHumana>.
 */

import Link from 'next/link'
import {
  Clock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Sparkle,
  ArrowSquareOut,
} from '@phosphor-icons/react'

import { Card } from '@/components/ui'
import type { WorkItemAction, WorkItemEstado } from '@/lib/api/work-item'
import type { WorkItemDetailResponse } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { AccionSugerida } from '@/components/inmobiliaria/ai/AccionSugerida'
import { TrazaCaso } from '@/components/inmobiliaria/ai/TrazaCaso'
import {
  FLAG_META,
  SEVERIDAD_TOKEN,
  estadoLabel,
  flagLabel,
  relativeTime,
  severidadLabel,
} from '@/components/inmobiliaria/ai/ColaHumana'
import { PagoEstadoBadge } from '@/components/inmobiliaria/pagos/PagoEstadoBadge'

// ── Estado accionable ─────────────────────────────────────────────────────────
// Mismos estados accionables que el detalle transversal: en el resto
// (aprobado | ejecutando | resuelto | rechazado | fallo) se ocultan las acciones
// y se muestra el bloque de decisión (T-323: nunca actuar fuera de revisión).

const ACTIONABLE_ESTADOS: ReadonlySet<WorkItemEstado> = new Set([
  'detectado',
  'sugerido',
  'en_revision',
])

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PagoCasoDetalleProps {
  data: WorkItemDetailResponse
  /** Posta el body de la acción a su endpoint real; devuelve ok/error para el toast. */
  onAction: (
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  /** Cross-link a la operación profunda (Tesorería · AP). */
  crossLink?: { pregunta: string; destino: string; href: string }
}

// ── Subcomponentes ──────────────────────────────────────────────────────────────

/** Encabezado de columna (eyebrow mono + título) — mismo ritmo en las 3 columnas. */
function ColumnaHeader({ children }: { children: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{children}</p>
  )
}

// ── Componente ──────────────────────────────────────────────────────────────────

export function PagoCasoDetalle({ data, onAction, crossLink }: PagoCasoDetalleProps) {
  const { t } = useI18n()
  const { item, contexto, traza } = data

  // Finite maps crashean ante claves desconocidas → SIEMPRE degradan (invariante SalaAgente).
  const sev = SEVERIDAD_TOKEN[item.severidad] ?? SEVERIDAD_TOKEN.media
  const isActionable = ACTIONABLE_ESTADOS.has(item.estado)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" data-testid={`pago-caso-${item.id}`}>
      {/* ── IZQ · Contexto ───────────────────────────────────────────────────── */}
      <div className="space-y-4 lg:col-span-4">
        <ColumnaHeader>Contexto del pago</ColumnaHeader>

        {/* Estado + severidad + flags + antigüedad */}
        <Card>
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <PagoEstadoBadge estado={item.estado} />
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
              >
                {severidadLabel(t, item.severidad)}
              </span>
              {item.flags.map((flag) => {
                const meta = FLAG_META[flag] ?? null
                if (!meta) return null
                const FlagIcon = meta.icon
                return (
                  <span
                    key={flag}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${meta.cls}`}
                  >
                    <FlagIcon className="h-3 w-3" aria-hidden="true" />
                    {flagLabel(t, flag)}
                  </span>
                )
              })}
            </div>
            <div className="flex items-center gap-1 text-xs text-fg-muted tabular-nums">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Creado {relativeTime(item.createdAt, t)}</span>
            </div>
          </div>
        </Card>

        {/* Bloques de contexto del backend (inquilino/propietario, contrato,
            inmueble, valor, concepto, fecha límite, canal, método, responsable). */}
        {contexto.length > 0 ? (
          contexto.map((block, i) => (
            <Card key={`${block.title}-${i}`} data-testid={`pago-contexto-${i}`}>
              <div className="space-y-2 p-5">
                <h2 className="text-base font-semibold text-fg">{block.title}</h2>
                <dl className="divide-y divide-border">
                  {block.rows.map((row, j) => (
                    <div
                      key={`${row.label}-${j}`}
                      className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-xs text-fg-muted">{row.label}</dt>
                      <dd className="text-right text-xs font-medium text-fg tabular-nums">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <div className="p-5">
              <p className="text-sm text-fg-muted">
                Este caso aún no reporta bloques de contexto. La información del inquilino o
                propietario, contrato e inmueble aparecerá cuando el agente la publique.
              </p>
            </div>
          </Card>
        )}

        {/* Cross-link a la operación profunda (Tesorería · AP) — nunca duplicar la
            tabla; se enlaza con <Link>. */}
        {crossLink && (
          <Link
            href={crossLink.href}
            className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition hover:bg-surface-muted"
            data-testid="pago-cross-link"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{crossLink.pregunta}</p>
              <p className="mt-0.5 text-xs text-fg-muted">{crossLink.destino}</p>
            </div>
            <ArrowSquareOut
              className="h-4 w-4 shrink-0 text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>

      {/* ── CENTRO · Actividad / línea de tiempo ─────────────────────────────── */}
      <div className="space-y-4 lg:col-span-4">
        <ColumnaHeader>Actividad del caso</ColumnaHeader>
        <Card>
          <div className="p-5">
            <p className="mb-4 text-sm text-fg-muted">
              Cada paso del ciclo del pago: link generado, enviado y abierto, intentos, pago
              recibido, conciliación, notificaciones, cambios de estado, errores y ajustes.
            </p>
            <TrazaCaso entries={traza} agente={item.agente} />
          </div>
        </Card>
      </div>

      {/* ── DER · Recomendación IA ───────────────────────────────────────────── */}
      <aside className="space-y-4 lg:col-span-4">
        <ColumnaHeader>Recomendación de la IA</ColumnaHeader>

        {isActionable ? (
          <AccionSugerida
            accion={item.accionSugerida}
            actions={item.actions}
            onAction={onAction}
          />
        ) : (
          // Caso ya decidido → acciones ocultas + bloque de decisión (T-323).
          <Card data-testid="pago-decision">
            <div className="space-y-2 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Decisión</p>
              <div className="flex items-center gap-2">
                {item.estado === 'rechazado' || item.estado === 'fallo' ? (
                  <XCircle className="h-5 w-5 text-danger" weight="duotone" aria-hidden="true" />
                ) : item.estado === 'ejecutando' ? (
                  <Clock className="h-5 w-5 text-fg-muted" weight="duotone" aria-hidden="true" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-success" weight="duotone" aria-hidden="true" />
                )}
                <p
                  className={`text-sm font-semibold ${
                    item.estado === 'fallo' ? 'text-danger' : 'text-fg'
                  }`}
                >
                  {estadoLabel(t, item.estado, item.agente)}
                </p>
              </div>
              <p className="text-xs text-fg-muted">
                {[
                  item.decidedBy ? `Por ${item.decidedBy}` : 'Decisión registrada',
                  item.decidedAt ? relativeTime(item.decidedAt, t) : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </Card>
        )}

        {/* Riesgo del caso */}
        <Card>
          <div className="space-y-2 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Riesgo</p>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
              >
                {severidadLabel(t, item.severidad)}
              </span>
              {typeof item.amountCop === 'number' && (
                <span className="text-sm font-semibold text-fg tabular-nums">
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(item.amountCop)}
                </span>
              )}
            </div>
            {item.flags.length > 0 && (
              <p className="text-xs text-fg-muted">
                Este caso requiere revisión humana: {item.flags.map((f) => flagLabel(t, f)).join(' · ')}.
              </p>
            )}
          </div>
        </Card>

        {/* Automatización activa — informativo. El nivel de autonomía del agente se
            configura en su superficie de configuración; acá solo se rotula. */}
        <Card>
          <div className="space-y-2 p-5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-fg-muted">
              <Sparkle className="h-3.5 w-3.5" weight="duotone" aria-hidden="true" />
              Automatización activa
            </p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" weight="duotone" aria-hidden="true" />
              <p className="text-sm font-medium text-fg">Copiloto con aprobación humana</p>
            </div>
            <p className="text-xs text-fg-muted">
              El agente propone la siguiente acción; un humano del rol contador la aprueba antes de
              ejecutarse. La configuración de autonomía vive en la superficie del agente.
            </p>
            <Link
              href="/panel/inmobiliaria/pagos/configuracion"
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Ver configuración del agente
            </Link>
          </div>
        </Card>
      </aside>
    </div>
  )
}
