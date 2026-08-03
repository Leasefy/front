'use client'

/**
 * CobranzaAtencionPreview — sección "Qué necesita tu atención hoy" para la HOME
 * (preview top-5 de la lista priorizada de /pendientes; visión #4 + #5).
 *
 * NO duplica la lista completa: muestra los 5 ítems de mayor prioridad de
 * `usePendientes` (la misma fuente que la página /pendientes) y cruza con
 * <Link> a /pendientes ("Ver todo") y al detalle de cada ítem.
 *
 * Fail-soft: usePendientes ya degrada por fuente; aquí solo renderizamos lo que
 * llegue. Vacío → EmptyState celebratorio (mismo tono que /pendientes).
 *
 * T-323: cada ítem solo NAVEGA (Link) al flujo de aprobación humano; no ejecuta
 * ninguna acción de cobranza desde la home.
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  usePendientes,
  type PendienteGrupo,
  type PendienteItem,
  type PendientePrioridad,
} from '@/lib/hooks/cobranza/use-pendientes'

const BASE = '/panel/inmobiliaria/ai/cobranza'
const PENDIENTES_HREF = `${BASE}/pendientes`
const NS = 'inmobiliaria.ai.cobranza.pendientes'

const PREVIEW_LIMIT = 5

// ── Tokens de prioridad (mismos de la página /pendientes / EscalationCard) ────

const PRIORIDAD_TOKEN: Record<
  PendientePrioridad,
  { bg: string; text: string; ring: string; labelKey: string }
> = {
  alta: { bg: 'bg-danger-soft', text: 'text-danger', ring: 'ring-danger', labelKey: `${NS}.prioridadAlta` },
  media: { bg: 'bg-warning-soft', text: 'text-warning', ring: 'ring-warning', labelKey: `${NS}.prioridadMedia` },
  baja: { bg: 'bg-success-soft', text: 'text-success', ring: 'ring-success', labelKey: `${NS}.prioridadBaja` },
}

const GRUPO_KEY: Record<PendienteGrupo, string> = {
  escalaciones: `${NS}.grupoEscalaciones`,
  cartas: `${NS}.grupoCartas`,
  siniestros: `${NS}.grupoSiniestros`,
  planes: `${NS}.grupoPlanes`,
  promesas: `${NS}.grupoPromesas`,
}

// Cartas no traen deudor en el summary → label del kind (igual que /pendientes).
const KIND_LABELS: Record<string, { es: string; en: string }> = {
  pre_judicial_letter: { es: 'Carta prejurídica', en: 'Pre-judicial letter' },
  pre_bureau_notification: { es: 'Notificación a centrales', en: 'Bureau notification' },
}

function relative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  const isEs = locale.startsWith('es')
  if (deltaSec < 60) return isEs ? `hace ${deltaSec}s` : `${deltaSec}s ago`
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return isEs ? `hace ${deltaMin}m` : `${deltaMin}m ago`
  const deltaHr = Math.round(deltaMin / 60)
  if (deltaHr < 24) return isEs ? `hace ${deltaHr}h` : `${deltaHr}h ago`
  const deltaDay = Math.round(deltaHr / 24)
  return isEs ? `hace ${deltaDay}d` : `${deltaDay}d ago`
}

function PreviewRow({ item }: { item: PendienteItem }) {
  const { t, locale } = useI18n()
  const isEs = locale.startsWith('es')
  const token = PRIORIDAD_TOKEN[item.prioridad]

  const titulo =
    item.titulo ||
    (item.kind ? (KIND_LABELS[item.kind]?.[isEs ? 'es' : 'en'] ?? item.kind) : '—')

  return (
    <li>
      <Link
        href={item.href}
        className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-muted"
        data-testid={`atencion-preview-${item.key}`}
      >
        <span
          className={`inline-flex items-center text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 shrink-0 ${token.bg} ${token.text} ${token.ring}`}
        >
          {t(token.labelKey)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg truncate">{titulo}</p>
          <p className="text-xs text-fg-muted truncate">{t(GRUPO_KEY[item.grupo])}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-fg-muted tabular-nums shrink-0">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {relative(item.fecha, locale)}
        </span>
        <ArrowRight
          className="w-4 h-4 text-fg-muted shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

export function CobranzaAtencionPreview() {
  const { t } = useI18n()
  const { items, counts, isLoading, error } = usePendientes()

  const total = items.length
  const preview = items.slice(0, PREVIEW_LIMIT)
  const restantes = Math.max(0, total - PREVIEW_LIMIT)
  const totalAprobar = counts.escalaciones + counts.cartas + counts.siniestros + counts.planes

  return (
    <section className="space-y-3" data-testid="cobranza-atencion-hoy">
      {/* Header de sección — un solo CTA "Ver todo" a la lista completa */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-fg">Qué necesita tu atención hoy</h2>
          <p className="text-sm text-fg-muted">
            {totalAprobar > 0
              ? `${totalAprobar} ${totalAprobar === 1 ? 'caso requiere' : 'casos requieren'} tu aprobación.`
              : 'Lo prioritario de tu cartera, en un solo lugar.'}
          </p>
        </div>
        <Button asChild variant="link" hideArrow className="shrink-0">
          <Link href={PENDIENTES_HREF}>Ver todo</Link>
        </Button>
      </div>

      {/* Carga inicial */}
      {isLoading && total === 0 && !error && (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {/* Vacío — todo al día (reusa keys existentes de /pendientes) */}
      {!isLoading && total === 0 && (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={CheckCircle}
            title={t(`${NS}.vacio`)}
            description={t(`${NS}.vacioHint`)}
          />
        </div>
      )}

      {/* Preview top-5 */}
      {preview.length > 0 && (
        <>
          <ul className="space-y-2">
            {preview.map((item) => (
              <PreviewRow key={item.key} item={item} />
            ))}
          </ul>
          {restantes > 0 && (
            <Button asChild variant="outline" size="sm" hideArrow className="w-full sm:w-auto">
              <Link href={PENDIENTES_HREF}>
                Ver {restantes} {restantes === 1 ? 'pendiente más' : 'pendientes más'}
              </Link>
            </Button>
          )}
        </>
      )}
    </section>
  )
}
