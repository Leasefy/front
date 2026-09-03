'use client'

/**
 * /ai/pagos — HOME BESPOKE "Pagos IA".
 *
 * Reemplaza la home genérica (<SalaAgente>) por una superficie a medida del
 * agente de Pagos (visión): 8 KPIs, la bandeja "Qué necesita tu atención", los
 * dos mundos (cobros a inquilinos / pagos a propietarios), el "cómo funciona" en
 * 4 pasos y el feed de actividad reciente.
 *
 * SOLO UX sobre el backend ya funcional: useAgentOverview('pagos') (KPIs + feed)
 * + useAgentWorkItems('pagos') (la cola humana, T-323). Las operaciones profundas
 * (facturas, aging, payment-runs, dispersiones) VIVEN en /cobros, /dispersiones y
 * /tesoreria — acá se cross-linkean, NUNCA se duplican.
 *
 * Tokens del DS en todo (CERO hex). Un solo CTA primary por vista.
 */

import Link from 'next/link'
import {
  CurrencyDollar,
  Receipt,
  PaperPlaneTilt,
  CheckCircle,
  Link as LinkIcon,
  XCircle,
  Wallet,
  ListChecks,
  BellRinging,
  ArrowsClockwise,
  CaretRight,
  ArrowSquareOut,
  Clock,
  Robot,
  User as UserIcon,
  Gear,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { PrioridadInbox } from '@/components/inmobiliaria/pagos/PrioridadInbox'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import type { OverviewFeedEntry } from '@/lib/api/agent-workspace'

// ── Formateadores ──────────────────────────────────────────────────────────

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const numberFormatter = new Intl.NumberFormat('es-CO')

/** Tiempo relativo en español, autosuficiente (no depende de keys i18n). */
function tiempoRelativo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (s < 60) return `hace ${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

// ── KPIs (visión §3) ─────────────────────────────────────────────────────────
// 8 tarjetas con orden y formato fijos. Cada una se llena con overview.kpis si
// hay match por id/label; si no hay dato → "—" (NUNCA inventamos números).

type KpiSlot = {
  /** Posibles ids del backend que corresponden a esta tarjeta. */
  ids: string[]
  label: string
  icon: Icon
  format: 'number' | 'cop'
}

const KPI_SLOTS: KpiSlot[] = [
  { ids: ['cobros_programados', 'programados'], label: 'Cobros programados', icon: ListChecks, format: 'number' },
  { ids: ['cobros_enviados', 'enviados'], label: 'Cobros enviados', icon: PaperPlaneTilt, format: 'number' },
  { ids: ['pagos_recibidos', 'recibidos'], label: 'Pagos recibidos', icon: CheckCircle, format: 'number' },
  { ids: ['links_pendientes', 'links'], label: 'Links pendientes', icon: LinkIcon, format: 'number' },
  { ids: ['pagos_fallidos', 'fallidos'], label: 'Pagos fallidos', icon: XCircle, format: 'number' },
  { ids: ['valor_recaudado', 'recaudado'], label: 'Valor recaudado', icon: CurrencyDollar, format: 'cop' },
  { ids: ['pagos_propietarios_listos', 'propietarios_listos'], label: 'Pagos a propietarios listos', icon: Wallet, format: 'number' },
  { ids: ['valor_pendiente_liquidar', 'pendiente_liquidar'], label: 'Valor pendiente por liquidar', icon: Receipt, format: 'cop' },
]

// ── "Dos mundos" (visión §2) ──────────────────────────────────────────────────

const DOS_MUNDOS: {
  titulo: string
  desc: string
  href: string
  icon: Icon
  bullets: string[]
}[] = [
  {
    titulo: 'Cobros a inquilinos',
    desc: 'El dinero que entra: arriendos, administración y cuotas.',
    href: '/panel/inmobiliaria/ai/pagos/cobros',
    icon: Receipt,
    bullets: [
      'Genera el cobro y el link de pago del mes',
      'Envía recordatorios automáticos antes y después del vencimiento',
      'Detecta pagos fallidos y reintenta el cobro',
      'Concilia el pago contra el contrato',
    ],
  },
  {
    titulo: 'Pagos a propietarios',
    desc: 'El dinero que sale: liquidación al dueño del inmueble.',
    href: '/panel/inmobiliaria/ai/pagos/propietarios',
    icon: Wallet,
    bullets: [
      'Calcula la liquidación: arriendo menos comisión y descuentos',
      'Arma el lote de pagos listos para dispersar',
      'Deja la dispersión lista para tu aprobación',
      'Genera el soporte y el comprobante para el propietario',
    ],
  },
]

// ── "Cómo funciona" (visión) — 4 pasos ────────────────────────────────────────

const COMO_FUNCIONA: { icon: Icon; titulo: string; desc: string }[] = [
  { icon: Receipt, titulo: 'El contrato genera la obligación', desc: 'Cada contrato activo crea el cobro del periodo automáticamente.' },
  { icon: PaperPlaneTilt, titulo: 'El agente crea el cobro y el link', desc: 'Arma el cobro, genera el link de pago y lo envía al inquilino.' },
  { icon: BellRinging, titulo: 'Monitorea y recuerda', desc: 'Sigue el estado del pago y envía recordatorios cuando hace falta.' },
  { icon: ArrowsClockwise, titulo: 'Concilia, cobra o liquida', desc: 'Concilia el ingreso, escala a cobranza si vence y liquida al propietario.' },
]

// ── Operaciones profundas — cross-links, no duplicación ────────────────────────

const OPERACIONES_PROFUNDAS: { label: string; detalle: string; href: string; icon: Icon }[] = [
  { label: 'Cobros', detalle: 'Facturas, aging y conciliación detallada', href: '/panel/inmobiliaria/cobros', icon: Receipt },
  { label: 'Dispersiones', detalle: 'Lotes de pago y payment-runs a propietarios', href: '/panel/inmobiliaria/dispersiones', icon: PaperPlaneTilt },
  { label: 'Tesorería', detalle: 'Saldos, movimientos y aprobaciones', href: '/panel/inmobiliaria/tesoreria', icon: Wallet },
]

// ── Feed actor chip ────────────────────────────────────────────────────────────

function FeedActorChip({ actorType }: { actorType: OverviewFeedEntry['actorType'] }) {
  if (actorType === 'agent') {
    return (
      <Badge variant="default" className="shrink-0">
        <Robot className="w-3 h-3" weight="duotone" aria-hidden="true" />
        Agente
      </Badge>
    )
  }
  if (actorType === 'user') {
    return (
      <Badge variant="secondary" className="shrink-0">
        <UserIcon className="w-3 h-3" weight="duotone" aria-hidden="true" />
        Tú
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="shrink-0">
      <Gear className="w-3 h-3" weight="duotone" aria-hidden="true" />
      Sistema
    </Badge>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────

function PagosHome() {
  const { data, isLoading: ovLoading, error: ovError } = useAgentOverview('pagos')
  const { items, isLoading: wiLoading, error: wiError, runAction } = useAgentWorkItems('pagos')

  /** Resuelve el valor de un slot de KPI desde overview.kpis (por id o label). */
  function kpiValue(slot: KpiSlot): string {
    const kpis = data?.kpis ?? []
    const match = kpis.find(
      (k) =>
        slot.ids.includes(k.id) ||
        slot.label.toLowerCase() === k.label.toLowerCase(),
    )
    if (!match) return '—'
    return slot.format === 'cop'
      ? copFormatter.format(match.value)
      : numberFormatter.format(match.value)
  }

  const feed = data?.feed ?? []

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Pagos IA</h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            Gestiona cobros, links de pago, recordatorios, pagos fallidos y liquidaciones desde un
            solo lugar.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="secondary" hideArrow>
            <Link href="/panel/inmobiliaria/tesoreria/facturas/nueva">
              <Receipt className="h-4 w-4" />
              Nueva factura
            </Link>
          </Button>
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/ai/pagos/generar">Generar cobros del mes</Link>
          </Button>
        </div>
      </header>

      {/* KPIs (§3) */}
      <section className="space-y-3" aria-label="Indicadores de pagos">
        {ovError ? (
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            No pudimos cargar los indicadores. Intenta de nuevo en unos minutos.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {KPI_SLOTS.map((slot) => {
              const SlotIcon = slot.icon
              return (
                <div key={slot.label} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-fg-muted leading-tight">{slot.label}</p>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted">
                      <SlotIcon className="w-4 h-4" weight="duotone" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-fg tabular-nums">
                    {ovLoading ? '—' : kpiValue(slot)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Qué necesita tu atención (§3) */}
      <section className="space-y-3" aria-label="Qué necesita tu atención">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-fg">Qué necesita tu atención</h2>
          <Link
            href="/panel/inmobiliaria/ai/pagos/cola"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
          >
            Ver la cola completa
            <CaretRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
        {wiError ? (
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            No pudimos cargar la bandeja. Intenta de nuevo en unos minutos.
          </div>
        ) : (
          <PrioridadInbox items={items} onAction={runAction} isLoading={wiLoading} />
        )}
      </section>

      {/* Dos mundos (§2) */}
      <section className="space-y-3" aria-label="Cobros y pagos">
        <h2 className="text-base font-semibold text-fg">Dos mundos en un solo lugar</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {DOS_MUNDOS.map((mundo) => {
            const MundoIcon = mundo.icon
            return (
              <Link key={mundo.href} href={mundo.href} className="group block h-full">
                <Card interactive className="h-full p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <MundoIcon className="w-5 h-5" weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-fg">{mundo.titulo}</h3>
                        <CaretRight
                          className="w-4 h-4 text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-sm text-fg-muted">{mundo.desc}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {mundo.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-fg">
                        <CheckCircle
                          className="w-4 h-4 text-success shrink-0 mt-0.5"
                          weight="duotone"
                          aria-hidden="true"
                        />
                        <span className="leading-snug">{b}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Cómo funciona — 4 pasos */}
      <section className="space-y-3" aria-label="Cómo funciona">
        <h2 className="text-base font-semibold text-fg">Cómo funciona</h2>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMO_FUNCIONA.map((step, i) => {
            const StepIcon = step.icon
            return (
              <li
                key={step.titulo}
                className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <StepIcon className="w-4 h-4" weight="duotone" aria-hidden="true" />
                  </span>
                  <span className="text-xs tabular-nums text-fg-muted">Paso {i + 1}</span>
                </div>
                <p className="text-sm font-semibold text-fg leading-tight">{step.titulo}</p>
                <p className="text-xs text-fg-muted leading-snug">{step.desc}</p>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Operaciones profundas — cross-links */}
      <section className="space-y-3" aria-label="Operaciones detalladas">
        <h2 className="text-base font-semibold text-fg">Operaciones detalladas</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPERACIONES_PROFUNDAS.map((op) => {
            const OpIcon = op.icon
            return (
              <Link
                key={op.href}
                href={op.href}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:bg-surface-muted/50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted group-hover:text-fg transition">
                  <OpIcon className="w-5 h-5" weight="duotone" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-fg">{op.label}</span>
                  <span className="block text-xs text-fg-muted truncate">{op.detalle}</span>
                </span>
                <ArrowSquareOut
                  className="w-3.5 h-3.5 text-fg-muted group-hover:text-fg transition shrink-0"
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </section>

      {/* Actividad reciente */}
      <section className="space-y-3" aria-label="Actividad reciente">
        <h2 className="text-base font-semibold text-fg">Actividad reciente</h2>
        {ovLoading ? (
          <div className="h-40 rounded-lg border border-border bg-surface-muted animate-pulse" />
        ) : feed.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Sin actividad reciente"
            description="Cuando el agente genere cobros, envíe links o registre pagos, lo verás aquí."
          />
        ) : (
          <Card className="p-2">
            <ul className="divide-y divide-border">
              {feed.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-3 py-3">
                  <FeedActorChip actorType={entry.actorType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{entry.titulo}</p>
                    <p className="text-xs text-fg-muted truncate">{entry.detalle}</p>
                  </div>
                  <span className="text-xs text-fg-muted tabular-nums shrink-0">
                    {tiempoRelativo(entry.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}

export default function PagosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosHome />
    </PageGuard>
  )
}
