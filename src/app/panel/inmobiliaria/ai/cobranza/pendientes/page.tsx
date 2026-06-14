'use client'

/**
 * /ai/cobranza/pendientes — "Qué necesita tu atención" (visión #5).
 *
 * UNA lista priorizada (no kanban) que compone 5 fuentes existentes vía
 * usePendientes: escalaciones, cartas prejurídicas, siniestros, acuerdos de
 * pago con pago en verificación y promesas de pago de hoy.
 *
 * Orden: Alta → Media → Baja; dentro de cada prioridad, fecha DESC.
 * Chips de conteo por grupo arriba (click = filtro). Empty state celebratorio.
 *
 * Estilo: brand-pass — MigaDePan + cards rounded-xl border-border bg-card,
 * pills de prioridad con los tokens semánticos de COLOR_SYSTEM.md
 * (rose=alta, amber=media, emerald=baja — mismos de EscalationCard).
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowClockwise,
  ArrowRight,
  ChatCircleText,
  CheckCircle,
  Clock,
  Warning,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  usePendientes,
  type PendienteCta,
  type PendienteGrupo,
  type PendienteItem,
  type PendientePrioridad,
} from '@/lib/hooks/cobranza/use-pendientes'

const BASE = '/panel/inmobiliaria/ai/cobranza'
const NS = 'inmobiliaria.ai.cobranza.pendientes'
const ESTADOS_NS = 'inmobiliaria.ai.cobranza.estados'

// ── Tokens de prioridad — COLOR_SYSTEM.md (mismos de EscalationCard) ─────────

const PRIORIDAD_TOKEN: Record<
  PendientePrioridad,
  { bg: string; text: string; ring: string; labelKey: string }
> = {
  alta: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
    ring: 'ring-[#C4503B] dark:ring-[#C4503B]',
    labelKey: `${NS}.prioridadAlta`,
  },
  media: {
    bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
    ring: 'ring-[#B7791F] dark:ring-[#B7791F]',
    labelKey: `${NS}.prioridadMedia`,
  },
  baja: {
    bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
    ring: 'ring-[#2C7A53] dark:ring-[#2C7A53]',
    labelKey: `${NS}.prioridadBaja`,
  },
}

// ── Labels por grupo / CTA (keys del contrato) ───────────────────────────────

const GRUPOS: PendienteGrupo[] = [
  'escalaciones',
  'cartas',
  'siniestros',
  'planes',
  'promesas',
]

const GRUPO_KEY: Record<PendienteGrupo, string> = {
  escalaciones: `${NS}.grupoEscalaciones`,
  cartas: `${NS}.grupoCartas`,
  siniestros: `${NS}.grupoSiniestros`,
  planes: `${NS}.grupoPlanes`,
  promesas: `${NS}.grupoPromesas`,
}

const CTA_KEY: Record<PendienteCta, string> = {
  resolver: `${NS}.resolver`,
  aprobar: `${NS}.aprobar`,
  revisar: `${NS}.revisar`,
  seguimiento: `${NS}.seguimiento`,
}

// Cartas: label por kind — patrón inline es/en de cartas/page.tsx (KIND_LABELS).
const KIND_LABELS: Record<string, { es: string; en: string }> = {
  pre_judicial_letter: { es: 'Carta prejurídica', en: 'Pre-judicial letter' },
  pre_bureau_notification: { es: 'Notificación a centrales', en: 'Bureau notification' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

function relative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (deltaSec < 60) return locale.startsWith('es') ? `hace ${deltaSec}s` : `${deltaSec}s ago`
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return locale.startsWith('es') ? `hace ${deltaMin}m` : `${deltaMin}m ago`
  const deltaHr = Math.round(deltaMin / 60)
  if (deltaHr < 24) return locale.startsWith('es') ? `hace ${deltaHr}h` : `${deltaHr}h ago`
  const deltaDay = Math.round(deltaHr / 24)
  return locale.startsWith('es') ? `hace ${deltaDay}d` : `${deltaDay}d ago`
}

/** Parse seguro de fechas DATE (YYYY-MM-DD) sin corrimiento de zona horaria. */
function parseLocalDate(dateStr: string): Date {
  return dateStr.length === 10 ? new Date(`${dateStr}T00:00:00`) : new Date(dateStr)
}

function chipClasses(active: boolean): string {
  return active
    ? 'bg-[#EEF1FF] text-[#1A40FF] border-[#1A40FF]/30 dark:bg-[#1A40FF]/15 dark:text-[#5570FF] dark:border-[#1A40FF]/40'
    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
}

// ── Card ─────────────────────────────────────────────────────────────────────

function PendienteCard({ item }: { item: PendienteItem }) {
  const { t, locale, formatCurrency, formatDate } = useI18n()
  const isEs = locale.startsWith('es')
  const token = PRIORIDAD_TOKEN[item.prioridad]

  // Título: quién/qué. Cartas no traen deudor en el summary → label del kind.
  const titulo =
    item.titulo ||
    (item.kind ? (KIND_LABELS[item.kind]?.[isEs ? 'es' : 'en'] ?? item.kind) : '—')

  // Motivo: dinámico (escalaciones) o compuesto desde keys existentes + datos reales.
  const motivo = useMemo(() => {
    if (item.reason) return truncate(item.reason, 120)
    switch (item.grupo) {
      case 'cartas':
        return t(`${ESTADOS_NS}.prejuridicoSugerido`)
      case 'siniestros':
        return t(`${NS}.grupoSiniestros`)
      case 'planes':
        return item.montoCop != null
          ? `${t(`${ESTADOS_NS}.pagoEnVerificacion`)} · ${formatCurrency(item.montoCop)}`
          : t(`${ESTADOS_NS}.pagoEnVerificacion`)
      case 'promesas': {
        const parts = [t(`${ESTADOS_NS}.promesaActiva`)]
        if (item.montoCop != null) parts.push(formatCurrency(item.montoCop))
        if (item.dueDate)
          parts.push(
            formatDate(parseLocalDate(item.dueDate), { day: 'numeric', month: 'short' }),
          )
        return parts.join(' · ')
      }
      default:
        return ''
    }
  }, [item, t, formatCurrency, formatDate])

  return (
    <li
      className="rounded-xl border border-border bg-card p-4 space-y-2.5"
      data-testid={`pendiente-item-${item.key}`}
    >
      {/* Header: pill prioridad + grupo + tiempo relativo */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 shrink-0 ${token.bg} ${token.text} ${token.ring}`}
          >
            {t(token.labelKey)}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground truncate">
            {t(GRUPO_KEY[item.grupo])}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums shrink-0">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {relative(item.fecha, locale)}
        </span>
      </div>

      {/* Quién/qué + motivo */}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
        {motivo && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium">{t(`${NS}.motivo`)}:</span> {motivo}
          </p>
        )}
      </div>

      {/* Footer: acción sugerida + CTA */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
        <span className="text-[11px] text-muted-foreground">
          {t(`${NS}.accionSugerida`)}
        </span>
        <Link
          href={item.href}
          className="group inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition font-medium"
        >
          {t(CTA_KEY[item.cta])}
          <ArrowRight
            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      </div>
    </li>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

function PendientesContent() {
  const { t, locale } = useI18n()
  const { items, counts, isLoading, error, refetch } = usePendientes()

  const [grupoFilter, setGrupoFilter] = useState<PendienteGrupo | null>(null)

  // Si el grupo activo se queda sin ítems tras un refetch, cae a "todos".
  const effectiveFilter =
    grupoFilter && counts[grupoFilter] > 0 ? grupoFilter : null

  const visibleItems = useMemo(
    () =>
      effectiveFilter ? items.filter((i) => i.grupo === effectiveFilter) : items,
    [items, effectiveFilter],
  )

  // ── Primer load ────────────────────────────────────────────────────────────
  if (isLoading && items.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  // ── Empty state celebratorio ───────────────────────────────────────────────
  if (!isLoading && items.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        <header>
          <MigaDePan
            backHref={BASE}
            icon={ChatCircleText}
            className="mb-2"
            crumbs={[
              { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
              { label: t('inmobiliaria.ai.cobranza.overview.title'), href: BASE },
              { label: t(`${NS}.pageTitle`) },
            ]}
          />
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t(`${NS}.pageTitle`)}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t(`${NS}.desc`)}
          </p>
        </header>
        <EmptyState
          icon={CheckCircle}
          title={t(`${NS}.vacio`)}
          description={t(`${NS}.vacioHint`)}
        />
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header — patrón MigaDePan (cobranza overview) */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <MigaDePan
            backHref={BASE}
            icon={ChatCircleText}
            className="mb-2"
            crumbs={[
              { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
              { label: t('inmobiliaria.ai.cobranza.overview.title'), href: BASE },
              { label: t(`${NS}.pageTitle`) },
            ]}
          />
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t(`${NS}.pageTitle`)}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t(`${NS}.desc`)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm border border-border text-foreground hover:bg-muted active:scale-[0.97] transition font-medium"
          aria-label="refresh"
        >
          <ArrowClockwise className="w-3.5 h-3.5" aria-hidden="true" />
          {locale.startsWith('es') ? 'Actualizar' : 'Refresh'}
        </button>
      </header>

      {/* Error total — solo cuando ninguna fuente rindió datos */}
      {error && items.length === 0 && (
        <div
          role="alert"
          className="rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 border border-[#C4503B]/30 dark:border-[#C4503B]/40 p-3 text-sm text-[#C4503B] dark:text-[#E0664D] flex items-center gap-2"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Chips de conteo por grupo — click = filtro */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t(`${NS}.pageTitle`)}>
          {GRUPOS.map((grupo) => {
            const active = effectiveFilter === grupo
            const count = counts[grupo]
            return (
              <button
                key={grupo}
                type="button"
                disabled={count === 0}
                aria-pressed={active}
                onClick={() => setGrupoFilter(active ? null : grupo)}
                data-testid={`pendientes-chip-${grupo}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${chipClasses(active)}`}
              >
                {t(GRUPO_KEY[grupo])}
                <span className="tabular-nums font-mono">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Lista priorizada — Alta → Media → Baja, fecha DESC dentro */}
      {visibleItems.length > 0 && (
        <ul className="space-y-3 max-w-3xl" aria-label={t(`${NS}.pageTitle`)}>
          {visibleItems.map((item) => (
            <PendienteCard key={item.key} item={item} />
          ))}
        </ul>
      )}
    </main>
  )
}

export default function PendientesPage() {
  return (
    <PageGuard module="cobranza">
      <PendientesContent />
    </PageGuard>
  )
}
