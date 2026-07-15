'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia/resultado — Resultado del día (§7) +
 * reporte/impacto (§20). The "wow" close screen of the reconciliation agent.
 *
 * Anatomy (BRAND-CONTRACT, consistent with conciliacion-ia & avaluos-ia):
 *   1. Hero (ink anchor) — tasa de conciliación automática + cierre de Gabriela.
 *   2. Resultado del día — barra apilada proporcional + desglose por estado.
 *   3. Impacto operativo (§20) — 4 mini-tarjetas de impacto.
 *   4. Acciones — revisar pendientes / exportar / cerrar el día.
 *
 * Mock data inline — renders standalone for review.
 */

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CaretRight,
  Export,
  Receipt,
  Coins,
  ArrowsLeftRight,
  Users,
  Lightning,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Button } from '@/components/ui'
import { BrandContour, Eyebrow, StatusBadge } from '@leasefy/cadence'

// ── Brand constants ───────────────────────────────────────────────────────────
const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

// Desaturated semantic signals (§2).
const SUCCESS = { dot: '#2C7A53', soft: '#E9F3EE', fg: '#22663F' }
const WARNING = { dot: '#B7791F', soft: '#FBF3E2', fg: '#8A5A12' }
const NEUTRAL = { dot: '#9AA3B2', soft: '#F1F3F6', fg: '#525B6B' }
const DANGER = { dot: '#C4503B', soft: '#F8EAE7', fg: '#A33D2B' }

// ── Mock data (exact figures) ──────────────────────────────────────────────────
interface ResultRow {
  key: string
  label: string
  count: number
  value: number
  tone: { dot: string; soft: string; fg: string }
}

const RESULTADO: ResultRow[] = [
  { key: 'conciliados', label: 'Conciliados automáticamente', count: 93, value: 221_400_000, tone: SUCCESS },
  { key: 'revision', label: 'Requieren revisión', count: 18, value: 48_200_000, tone: WARNING },
  { key: 'sin-id', label: 'Sin identificar', count: 7, value: 10_600_000, tone: NEUTRAL },
  { key: 'duplicados', label: 'Posibles duplicados', count: 2, value: 4_500_000, tone: DANGER },
]

const TOTAL_VALUE = RESULTADO.reduce((acc, r) => acc + r.value, 0)

interface ImpactCard {
  icon: Icon
  value: string
  label: string
}

const IMPACTO: ImpactCard[] = [
  { icon: Receipt, value: '93', label: 'contratos actualizados' },
  { icon: Coins, value: '11', label: 'saldos pendientes' },
  { icon: ArrowsLeftRight, value: '7', label: 'casos a cobranza' },
  { icon: Users, value: '42', label: 'propietarios listos para liquidación' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => COP.format(n)

// ── Page ───────────────────────────────────────────────────────────────────
export default function ConciliacionResultadoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* ── 0. Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <Link
              href="/panel/inmobiliaria/conciliacion-ia"
              className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-[#14130f] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Conciliación IA
            </Link>
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#14130f]">
              Conciliación del 16 de junio
            </h1>
            <p className="text-[13px] text-fg-muted">
              120 movimientos · Bancolombia .360 + links de pago
            </p>
          </div>
          <StatusBadge tone="neutral" dot={false} className="self-start sm:self-auto shrink-0">Por cerrar</StatusBadge>
        </div>

        {/* ── 1. HERO (ink anchor) ──────────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-2xl px-7 py-7 sm:px-9 sm:py-8"
          style={{ background: INK_GRADIENT, boxShadow: '0 26px 64px -28px rgba(20, 19, 15,0.55)' }}
        >
          <div className="pointer-events-none absolute -inset-x-2 top-[50%] h-[42%] text-white/[0.10]">
            <BrandContour />
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-8 lg:gap-10 lg:items-center">
            {/* Headline number */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightning className="w-3.5 h-3.5" weight="fill" style={{ color: '#8FA3FF' }} />
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">
                  Tasa de conciliación automática
                </span>
              </div>
              <div className="text-[44px] font-semibold tracking-[-0.02em] text-white tabular-nums leading-none">
                77,5%
              </div>
              <p className="text-[14px] text-white/60 leading-relaxed">
                <span className="tabular-nums">$221,4 M</span> de{' '}
                <span className="tabular-nums">$284,7 M</span> procesados ·{' '}
                <span className="tabular-nums">120</span> movimientos
              </p>
            </div>

            {/* Gabriela's conclusion */}
            <div className="flex items-start gap-3 lg:border-l lg:border-white/10 lg:pl-8">
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center rounded-full text-[13px] font-semibold text-white shrink-0"
                style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                G
              </span>
              <p className="text-[13.5px] leading-relaxed text-white/75">
                Concilié automáticamente el 77,5% de los pagos. Quedan{' '}
                <span className="font-medium text-white">18 movimientos por revisar</span>, sobre todo por
                referencias incompletas, pagos parciales y coincidencias múltiples.
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. RESULTADO DEL DÍA ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="space-y-1.5 mb-5">
            <Eyebrow>Resultado del día</Eyebrow>
            <p className="text-[13px] text-fg-muted">
              Cómo se reparten los <span className="tabular-nums">120</span> movimientos por estado.
            </p>
          </div>

          {/* Stacked proportional bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-5">
            {RESULTADO.map((r) => (
              <span
                key={r.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(r.value / TOTAL_VALUE) * 100}%`, background: r.tone.dot }}
                title={`${r.label} · ${fmt(r.value)}`}
              />
            ))}
          </div>

          {/* Breakdown rows */}
          <ul className="divide-y divide-border-faint">
            {RESULTADO.map((r) => (
              <li key={r.key} className="flex items-center gap-3 py-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.tone.dot }} />
                <span className="flex-1 min-w-0 text-[14px] text-[#14130f] truncate">{r.label}</span>
                <span className="w-12 text-right text-[13px] font-medium text-fg-muted tabular-nums shrink-0">
                  {r.count}
                </span>
                <span className="w-36 text-right text-[14px] font-medium text-[#14130f] tabular-nums shrink-0">
                  {fmt(r.value)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 3. IMPACTO OPERATIVO (§20) ────────────────────────────────── */}
        <section className="space-y-4">
          <Eyebrow>Impacto operativo</Eyebrow>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {IMPACTO.map((c) => {
              const CIcon = c.icon
              return (
                <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-muted text-fg-muted">
                    <CIcon className="w-[18px] h-[18px]" weight="bold" />
                  </span>
                  <p className="mt-3 text-[26px] font-semibold tracking-[-0.01em] text-[#14130f] tabular-nums leading-none">
                    {c.value}
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-fg-muted leading-snug">{c.label}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 4. ACCIONES ───────────────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <Link
            href="/panel/inmobiliaria/conciliacion-ia"
            className="group inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ background: BLUE }}
          >
            Revisar pendientes
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-[11px] font-semibold tabular-nums">
              18
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Button type="button" variant="outline" hideArrow>
            <Export className="w-4 h-4 text-fg-muted" weight="bold" />
            Exportar reporte
          </Button>

          <Button type="button" variant="outline" hideArrow className="group sm:ml-auto text-fg-muted">
            Cerrar conciliación del día
            <CaretRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" weight="bold" />
          </Button>
        </section>
      </div>
    </div>
  )
}
