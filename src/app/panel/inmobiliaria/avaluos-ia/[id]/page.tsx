'use client'

/**
 * /panel/inmobiliaria/avaluos-ia/[id] — Avalúo result + individual view.
 *
 * The "wow" screen. Combines §7-12 (the result) with §14 (vista individual):
 *   • Result card — canon recomendado as three strategy tiles
 *     (conservador / recomendado / agresivo). The RECOMENDADO tile is the
 *     page's single ink anchor (§5) — the hero number lives there.
 *   • Por qué este número — rationale: factores que suben / bajan (§8).
 *   • Comparables — table of nearby rentals, excludable (§9).
 *   • Right rail (decision): ficha del inmueble, nivel de confianza (§10),
 *     comparación con la expectativa del propietario (§11), estrategia
 *     recomendada (§12) y acciones (enviar reporte / publicar / PDF).
 *
 * Mock data inline — renders standalone for review (rent appraisal of the
 * El Poblado property surfaced in the home bandeja).
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  Sparkle,
  ShieldCheck,
  House,
  PaperPlaneTilt,
  FilePdf,
  Megaphone,
  X,
  Buildings,
  Ruler,
  Bed,
  Bathtub,
  Car,
  Stack,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandContour, Eyebrow, MonoLabel, StatusBadge, IconButton } from '@leasefy/cadence'
import { Button, Card } from '@/components/ui'

// ── Brand constants ───────────────────────────────────────────────────────────
const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

// ── Data model ────────────────────────────────────────────────────────────────
type StrategyKey = 'conservador' | 'recomendado' | 'agresivo'

interface Strategy {
  key: StrategyKey
  label: string
  value: number
  dias: string
  descriptor: string
}

const STRATEGIES: Strategy[] = [
  { key: 'conservador', label: 'Conservador', value: 3_200_000, dias: '~12 días', descriptor: 'Arrienda rápido, prioriza ocupación.' },
  { key: 'recomendado', label: 'Recomendado', value: 3_450_000, dias: '~25 días', descriptor: 'Equilibra renta y tiempo de vacancia.' },
  { key: 'agresivo', label: 'Agresivo', value: 3_750_000, dias: '~45 días', descriptor: 'Maximiza renta, acepta más vacancia.' },
]

const FACTORS: { dir: 'up' | 'down'; label: string; impact: string }[] = [
  { dir: 'up', label: 'Zona premium · El Poblado (estrato 6)', impact: '+9%' },
  { dir: 'up', label: 'Remodelado hace menos de 2 años', impact: '+5%' },
  { dir: 'up', label: 'Edificio con gimnasio y piscina', impact: '+4%' },
  { dir: 'down', label: 'Solo un parqueadero', impact: '−4%' },
  { dir: 'down', label: 'Sin balcón', impact: '−2%' },
  { dir: 'down', label: 'Oferta alta en la zona este mes', impact: '−3%' },
]

interface Comparable {
  id: string
  dir: string
  area: number
  canon: number
  similitud: number
  dist: string
}

const COMPARABLES: Comparable[] = [
  { id: 'c1', dir: 'Cra. 41 #6-10', area: 82, canon: 3_500_000, similitud: 96, dist: '0,4 km' },
  { id: 'c2', dir: 'Cl. 7 #43-20', area: 75, canon: 3_300_000, similitud: 94, dist: '0,6 km' },
  { id: 'c3', dir: 'Cra. 43A #5-50', area: 80, canon: 3_600_000, similitud: 92, dist: '0,3 km' },
  { id: 'c4', dir: 'Cl. 9 #42-15', area: 70, canon: 3_100_000, similitud: 89, dist: '0,8 km' },
  { id: 'c5', dir: 'Cra. 44 #4-30', area: 85, canon: 3_700_000, similitud: 87, dist: '0,5 km' },
]

const FICHA: { icon: Icon; label: string; value: string }[] = [
  { icon: Ruler, label: 'Área', value: '78 m²' },
  { icon: Bed, label: 'Habitaciones', value: '2' },
  { icon: Bathtub, label: 'Baños', value: '2' },
  { icon: Car, label: 'Parqueaderos', value: '1' },
  { icon: Stack, label: 'Estrato', value: '6' },
  { icon: Buildings, label: 'Antigüedad', value: '8 años' },
]

const OWNER_EXPECTATION = 4_200_000

// ── Small helpers ─────────────────────────────────────────────────────────────
const fmt = (n: number) => COP.format(n)
const fmtPerMonth = (n: number) => `${COP.format(n)}/mes`

// ── Page ───────────────────────────────────────────────────────────────────

export default function AvaluoResultPage() {
  const [selected, setSelected] = React.useState<StrategyKey>('recomendado')
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set())

  const active = STRATEGIES.find((s) => s.key === selected)!
  const recomendado = STRATEGIES.find((s) => s.key === 'recomendado')!
  const gapPct = Math.round(((recomendado.value - OWNER_EXPECTATION) / OWNER_EXPECTATION) * 100)
  const gapAbs = OWNER_EXPECTATION - recomendado.value

  const toggleExclude = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/panel/inmobiliaria/avaluos-ia"
            className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-fg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Avalúos IA
          </Link>
          <StatusBadge tone="neutral" dot={false}>Borrador</StatusBadge>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <House className="w-4 h-4 text-fg-subtle" weight="fill" />
              <MonoLabel className="text-[11px] tracking-[0.08em]">
                Avalúo de arriendo
              </MonoLabel>
            </div>
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
              Cra. 43 #5-20 · El Poblado
            </h1>
            <p className="text-[13px] text-fg-muted">
              Solicitado hace 2 h · Propietario: Carlos Restrepo
            </p>
          </div>
        </div>

        {/* ── Result card — three strategy tiles ─────────────────────────── */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <Eyebrow accent>Canon recomendado</Eyebrow>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
              <ShieldCheck className="w-4 h-4" weight="fill" />
              Confianza alta
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STRATEGIES.map((s) => {
              const isSel = s.key === selected
              const isReco = s.key === 'recomendado'

              // The recomendado tile is the ink anchor (§5); others are hairline.
              if (isReco) {
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelected(s.key)}
                    aria-pressed={isSel}
                    className="relative overflow-hidden rounded-xl p-5 text-left transition-transform active:scale-[0.99]"
                    style={{
                      background: INK_GRADIENT,
                      boxShadow: isSel ? `0 0 0 2px ${BLUE}, 0 20px 44px -22px rgba(20, 19, 15,0.5)` : '0 16px 40px -22px rgba(20, 19, 15,0.45)',
                    }}
                  >
                    <div className="pointer-events-none absolute -inset-x-1 top-[44%] h-[44%] text-white/[0.10]">
                      <BrandContour />
                    </div>
                    <div className="relative flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-white/55">
                        <Sparkle className="w-3 h-3" weight="fill" style={{ color: '#8FA3FF' }} />
                        Recomendado
                      </span>
                      {isSel && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: BLUE }}>
                          <Check className="w-3 h-3 text-white" weight="bold" />
                        </span>
                      )}
                    </div>
                    <div className="relative mt-3 text-[30px] font-semibold tracking-[-0.02em] text-white tabular-nums leading-none">
                      {fmt(s.value)}
                    </div>
                    <div className="relative mt-1 text-[12px] text-white/55">/mes</div>
                    <div className="relative mt-3 flex items-center gap-2 text-[12.5px] text-white/75">
                      <span className="font-medium text-white/90">{s.dias}</span>
                      <span className="text-white/30">·</span>
                      <span>para arrendar</span>
                    </div>
                    <p className="relative mt-2 text-[12.5px] text-white/55 leading-snug">{s.descriptor}</p>
                  </button>
                )
              }

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelected(s.key)}
                  aria-pressed={isSel}
                  className="relative rounded-xl border bg-surface p-5 text-left transition-all active:scale-[0.99]"
                  style={{
                    borderColor: isSel ? BLUE : 'rgba(0,0,0,0.10)',
                    boxShadow: isSel ? `0 0 0 1px ${BLUE}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <MonoLabel className="text-[10px] tracking-[0.1em]">{s.label}</MonoLabel>
                    {isSel && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: BLUE }}>
                        <Check className="w-3 h-3 text-white" weight="bold" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[24px] font-semibold tracking-[-0.01em] text-fg tabular-nums font-mono leading-none">
                    {fmt(s.value)}
                  </div>
                  <div className="mt-1 text-[12px] text-fg-subtle">/mes</div>
                  <div className="mt-3 flex items-center gap-2 text-[12.5px] text-fg-muted">
                    <span className="font-medium text-fg">{s.dias}</span>
                    <span className="text-fg-subtle">·</span>
                    <span>para arrendar</span>
                  </div>
                  <p className="mt-2 text-[12.5px] text-fg-muted leading-snug">{s.descriptor}</p>
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-[12.5px] text-fg-subtle">
            Rango de mercado {fmt(STRATEGIES[0].value)} – {fmt(STRATEGIES[2].value)} · basado en 12 comparables a menos de 800 m.
          </p>
        </Card>

        {/* ── Analysis (left) + Decision (right rail) ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* ── LEFT: rationale + comparables ───────────────────────────── */}
          <div className="space-y-6 min-w-0">
            {/* Por qué este número */}
            <Card className="p-5 sm:p-6">
              <div className="mb-4">
                <Eyebrow>Por qué {fmt(recomendado.value)}</Eyebrow>
                <p className="mt-1.5 text-[13px] text-fg-muted">
                  Samuel parte del valor de mercado y ajusta por las características del inmueble.
                </p>
              </div>

              <ul className="space-y-1">
                {FACTORS.map((f, i) => {
                  const up = f.dir === 'up'
                  return (
                    <li key={i} className="flex items-center gap-3 py-2">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${up ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}
                      >
                        {up ? <ArrowUp className="w-3.5 h-3.5" weight="bold" /> : <ArrowDown className="w-3.5 h-3.5" weight="bold" />}
                      </span>
                      <span className="flex-1 text-[13.5px] text-fg">{f.label}</span>
                      <span className={`text-[13px] font-medium tabular-nums font-mono ${up ? 'text-success' : 'text-warning'}`}>
                        {f.impact}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* Comparables */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4">
                <div>
                  <Eyebrow>Comparables</Eyebrow>
                  <p className="mt-1.5 text-[13px] text-fg-muted">
                    Laura encontró {COMPARABLES.length - excluded.size} inmuebles similares cerca. Excluí los que no apliquen.
                  </p>
                </div>
              </div>

              <div className="hidden sm:grid grid-cols-[1fr_70px_130px_90px_72px_40px] gap-3 px-5 sm:px-6 py-2 border-y border-border-faint bg-surface-muted">
                {['Inmueble', 'Área', 'Canon', 'Similitud', 'Dist.', ''].map((h, i) => (
                  <MonoLabel key={i} className="text-[10px] tracking-[0.08em]">
                    {h}
                  </MonoLabel>
                ))}
              </div>

              <ul className="divide-y divide-border-faint">
                {COMPARABLES.map((c) => {
                  const isOut = excluded.has(c.id)
                  return (
                    <li
                      key={c.id}
                      className={`grid grid-cols-2 sm:grid-cols-[1fr_70px_130px_90px_72px_40px] gap-2 sm:gap-3 sm:items-center px-5 sm:px-6 py-3 transition-opacity ${isOut ? 'opacity-40' : ''}`}
                    >
                      <span className={`text-[13.5px] font-medium text-fg truncate ${isOut ? 'line-through' : ''}`}>
                        {c.dir}
                      </span>
                      <span className="text-[13px] text-fg-muted tabular-nums font-mono">{c.area} m²</span>
                      <span className="text-[13.5px] font-medium text-fg tabular-nums font-mono">{fmtPerMonth(c.canon)}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="hidden sm:block h-1.5 w-10 rounded-full bg-surface-muted overflow-hidden">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${c.similitud}%` }} />
                        </span>
                        <span className="text-[12px] text-fg-muted tabular-nums font-mono">{c.similitud}%</span>
                      </span>
                      <span className="text-[12px] text-fg-muted tabular-nums font-mono">{c.dist}</span>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExclude(c.id)}
                        aria-label={isOut ? 'Incluir comparable' : 'Excluir comparable'}
                        className="justify-self-end rounded-md hover:text-danger"
                        icon={isOut ? <ArrowRight className="rotate-180" /> : <X />}
                      />
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          {/* ── RIGHT RAIL: ficha + confianza + expectativa + acciones ───── */}
          <aside className="space-y-6 lg:sticky lg:top-6">
            {/* Ficha del inmueble */}
            <Card className="overflow-hidden">
              {/* Photo placeholder */}
              <div className="relative h-32 bg-gradient-to-br from-neutral-100 to-neutral-200/70 flex items-center justify-center">
                <House className="w-8 h-8 text-fg-subtle" weight="duotone" />
                <span className="absolute bottom-2 right-2 inline-flex items-center h-5 px-2 rounded-full bg-white/90 backdrop-blur font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] text-fg-muted">
                  Sin fotos
                </span>
              </div>
              <div className="p-5">
                <Eyebrow>Ficha del inmueble</Eyebrow>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  {FICHA.map((f) => {
                    const FIcon = f.icon
                    return (
                      <div key={f.label} className="flex items-center gap-2">
                        <FIcon className="w-4 h-4 text-fg-subtle shrink-0" weight="bold" />
                        <div className="min-w-0">
                          <dt className="text-[11px] text-fg-subtle leading-none">{f.label}</dt>
                          <dd className="text-[13.5px] font-medium text-fg tabular-nums font-mono mt-0.5">{f.value}</dd>
                        </div>
                      </div>
                    )
                  })}
                </dl>
              </div>
            </Card>

            {/* Expectativa del propietario */}
            <Card className="p-5">
              <Eyebrow>Expectativa del propietario</Eyebrow>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-fg-muted">Carlos espera</span>
                  <span className="font-medium text-fg tabular-nums font-mono">{fmtPerMonth(OWNER_EXPECTATION)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-fg-muted">Gabriela sugiere</span>
                  <span className="font-semibold tabular-nums font-mono text-primary">{fmtPerMonth(recomendado.value)}</span>
                </div>
                {/* gap bars */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-border" style={{ width: '100%' }} />
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((recomendado.value / OWNER_EXPECTATION) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg p-3 text-[12.5px] leading-snug bg-warning-soft text-warning">
                  <span className="font-semibold tabular-nums font-mono shrink-0">{gapPct}%</span>
                  <span>
                    {fmt(Math.abs(gapAbs))} por encima del mercado. A {fmtPerMonth(OWNER_EXPECTATION)} podría tardar más de 90 días o no arrendarse.
                  </span>
                </div>
              </div>
            </Card>

            {/* Estrategia recomendada + acciones */}
            <Card className="p-5 space-y-4">
              <div>
                <Eyebrow accent>Estrategia recomendada</Eyebrow>
                <p className="mt-2 text-[13px] text-fg leading-relaxed">
                  Gabriela recomienda <span className="font-semibold">Recomendado · {fmt(recomendado.value)}</span>: arriendas en ~25 días captando el 94% del techo de mercado.
                </p>
                {selected !== 'recomendado' && (
                  <p className="mt-2 text-[12.5px] leading-snug text-warning">
                    Elegiste {active.label} ({fmt(active.value)}). {active.key === 'agresivo' ? 'Mayor renta, pero más vacancia.' : 'Arriendas antes, pero dejas renta sobre la mesa.'}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <Button variant="default" asChild hideArrow className="w-full">
                  <Link href="/panel/inmobiliaria/avaluos-ia/enviar">
                    <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                    Enviar reporte al propietario
                  </Link>
                </Button>
                <Button type="button" variant="outline" hideArrow className="w-full">
                  <Megaphone className="w-4 h-4 text-fg-muted" weight="bold" />
                  Publicar a {fmt(active.value)}
                </Button>
                <Button type="button" variant="ghost" hideArrow className="w-full">
                  <FilePdf className="w-4 h-4" weight="bold" />
                  Descargar PDF
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
