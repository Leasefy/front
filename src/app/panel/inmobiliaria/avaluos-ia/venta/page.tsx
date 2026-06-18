'use client'

/**
 * /panel/inmobiliaria/avaluos-ia/venta — Avalúo de VENTA (§7 sale variant).
 *
 * Same mold as the rent result, adapted for a sale: precio de venta (not
 * canon), three strategies salida rápida / mercado / aspiracional (the
 * RECOMENDADO = ink anchor), tiempo de venta en meses, rationale, comparables
 * de venta, and — to show confidence gating (§10) — MEDIA confidence: the send
 * action carries a soft "revísalo antes" nudge instead of being a clean go.
 *
 * Mock data inline — Cl. 7 #39-20, Provenza, owner María Gómez.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  Sparkle,
  Info,
  Storefront,
  PaperPlaneTilt,
  FilePdf,
  Megaphone,
  X,
  Ruler,
  Bed,
  Bathtub,
  Car,
  Stack,
  Buildings,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandContour, Eyebrow } from '@leasefy/ui'

const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #0B1220 56%, #122457 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number) => COP.format(n)
/** Compact COP for big sale prices: $620 M. */
const fmtShort = (n: number) => `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} M`

type StrategyKey = 'rapida' | 'mercado' | 'aspiracional'

interface Strategy {
  key: StrategyKey
  label: string
  value: number
  meses: string
  descriptor: string
}

const STRATEGIES: Strategy[] = [
  { key: 'rapida', label: 'Salida rápida', value: 580_000_000, meses: '~2 meses', descriptor: 'Vende pronto, prioriza liquidez.' },
  { key: 'mercado', label: 'Mercado', value: 620_000_000, meses: '~4 meses', descriptor: 'Precio justo, mejor balance.' },
  { key: 'aspiracional', label: 'Aspiracional', value: 675_000_000, meses: '~8 meses', descriptor: 'Maximiza, acepta más tiempo.' },
]

const FACTORS: { dir: 'up' | 'down'; label: string; impact: string }[] = [
  { dir: 'up', label: 'Provenza — zona de alta demanda', impact: '+7%' },
  { dir: 'up', label: 'Dos parqueaderos + depósito', impact: '+4%' },
  { dir: 'up', label: 'Vista despejada a la montaña', impact: '+3%' },
  { dir: 'down', label: 'Cocina sin renovar', impact: '−4%' },
  { dir: 'down', label: 'Edificio sin ascensor de servicio', impact: '−3%' },
  { dir: 'down', label: 'Inventario alto de usados en la zona', impact: '−2%' },
]

interface Comparable {
  id: string
  dir: string
  area: number
  precio: number
  similitud: number
  dist: string
}

const COMPARABLES: Comparable[] = [
  { id: 'c1', dir: 'Cl. 8 #38-10', area: 118, precio: 610_000_000, similitud: 95, dist: '0,3 km' },
  { id: 'c2', dir: 'Cra. 35 #7-40', area: 125, precio: 645_000_000, similitud: 93, dist: '0,5 km' },
  { id: 'c3', dir: 'Cl. 9 #39-22', area: 112, precio: 595_000_000, similitud: 90, dist: '0,4 km' },
  { id: 'c4', dir: 'Cra. 33 #8-15', area: 130, precio: 670_000_000, similitud: 88, dist: '0,7 km' },
  { id: 'c5', dir: 'Cl. 6 #37-05', area: 115, precio: 600_000_000, similitud: 86, dist: '0,6 km' },
]

const FICHA: { icon: Icon; label: string; value: string }[] = [
  { icon: Ruler, label: 'Área', value: '120 m²' },
  { icon: Bed, label: 'Habitaciones', value: '3' },
  { icon: Bathtub, label: 'Baños', value: '3' },
  { icon: Car, label: 'Parqueaderos', value: '2' },
  { icon: Stack, label: 'Estrato', value: '6' },
  { icon: Buildings, label: 'Antigüedad', value: '5 años' },
]

const OWNER_EXPECTATION = 720_000_000

export default function AvaluoVentaPage() {
  const [selected, setSelected] = React.useState<StrategyKey>('mercado')
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set())

  const active = STRATEGIES.find((s) => s.key === selected)!
  const mercado = STRATEGIES.find((s) => s.key === 'mercado')!
  const gapPct = Math.round(((mercado.value - OWNER_EXPECTATION) / OWNER_EXPECTATION) * 100)
  const gapAbs = OWNER_EXPECTATION - mercado.value

  const toggleExclude = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/panel/inmobiliaria/avaluos-ia"
            className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-[#0B1220] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Avalúos IA
          </Link>
          <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-neutral-200 bg-neutral-50 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400">
            Borrador
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Storefront className="w-4 h-4 text-neutral-400" weight="fill" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
              Avalúo de venta
            </span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#0B1220]">
            Cl. 7 #39-20 · Provenza
          </h1>
          <p className="text-[13px] text-neutral-500">
            Solicitado hace 5 h · Propietario: María Gómez
          </p>
        </div>

        {/* ── Result card — three sale strategies ────────────────────────── */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <Eyebrow accent>Precio de venta recomendado</Eyebrow>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#8A5A12' }}>
              <Info className="w-4 h-4" weight="fill" />
              Confianza media
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STRATEGIES.map((s) => {
              const isSel = s.key === selected
              const isReco = s.key === 'mercado'

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
                      boxShadow: isSel ? `0 0 0 2px ${BLUE}, 0 20px 44px -22px rgba(11,18,32,0.5)` : '0 16px 40px -22px rgba(11,18,32,0.45)',
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
                      {fmtShort(s.value)}
                    </div>
                    <div className="relative mt-1 text-[12px] text-white/55 tabular-nums">{fmt(s.value)}</div>
                    <div className="relative mt-3 flex items-center gap-2 text-[12.5px] text-white/75">
                      <span className="font-medium text-white/90">{s.meses}</span>
                      <span className="text-white/30">·</span>
                      <span>para vender</span>
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
                  className="relative rounded-xl border bg-white p-5 text-left transition-all active:scale-[0.99]"
                  style={{ borderColor: isSel ? BLUE : 'rgba(0,0,0,0.10)', boxShadow: isSel ? `0 0 0 1px ${BLUE}` : 'none' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-400">
                      {s.label}
                    </span>
                    {isSel && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: BLUE }}>
                        <Check className="w-3 h-3 text-white" weight="bold" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[24px] font-semibold tracking-[-0.01em] text-[#0B1220] tabular-nums leading-none">
                    {fmtShort(s.value)}
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-400 tabular-nums">{fmt(s.value)}</div>
                  <div className="mt-3 flex items-center gap-2 text-[12.5px] text-neutral-600">
                    <span className="font-medium text-[#0B1220]">{s.meses}</span>
                    <span className="text-neutral-300">·</span>
                    <span>para vender</span>
                  </div>
                  <p className="mt-2 text-[12.5px] text-neutral-500 leading-snug">{s.descriptor}</p>
                </button>
              )
            })}
          </div>

          {/* Confidence gating note (§10 · media) */}
          <div className="mt-4 flex items-start gap-2 rounded-lg p-3 text-[12.5px] leading-snug" style={{ background: '#FBF3E2', color: '#8A5A12' }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" weight="fill" />
            <span>
              <span className="font-medium">Confianza media:</span> 8 comparables con dispersión moderada (±9%). Revisa los comparables antes de enviarle el reporte a María.
            </span>
          </div>
        </section>

        {/* ── Analysis (left) + Decision (right rail) ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* LEFT */}
          <div className="space-y-6 min-w-0">
            {/* Por qué este número */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6">
              <div className="mb-4">
                <Eyebrow>Por qué {fmtShort(mercado.value)}</Eyebrow>
                <p className="mt-1.5 text-[13px] text-neutral-500">
                  Samuel parte del valor de mercado y ajusta por las características del inmueble.
                </p>
              </div>
              <ul className="space-y-1">
                {FACTORS.map((f, i) => {
                  const up = f.dir === 'up'
                  const tone = up ? { dot: '#22663F', soft: '#E9F3EE' } : { dot: '#8A5A12', soft: '#FBF3E2' }
                  return (
                    <li key={i} className="flex items-center gap-3 py-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0" style={{ background: tone.soft, color: tone.dot }}>
                        {up ? <ArrowUp className="w-3.5 h-3.5" weight="bold" /> : <ArrowDown className="w-3.5 h-3.5" weight="bold" />}
                      </span>
                      <span className="flex-1 text-[13.5px] text-[#0B1220]">{f.label}</span>
                      <span className="text-[13px] font-medium tabular-nums" style={{ color: tone.dot }}>{f.impact}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Comparables */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden">
              <div className="px-5 sm:px-6 pt-5 pb-4">
                <Eyebrow>Comparables de venta</Eyebrow>
                <p className="mt-1.5 text-[13px] text-neutral-500">
                  Laura encontró {COMPARABLES.length - excluded.size} ventas similares cerca. Excluí las que no apliquen.
                </p>
              </div>
              <div className="hidden sm:grid grid-cols-[1fr_70px_140px_90px_72px_40px] gap-3 px-5 sm:px-6 py-2 border-y border-neutral-100 bg-neutral-50/60">
                {['Inmueble', 'Área', 'Precio', 'Similitud', 'Dist.', ''].map((h, i) => (
                  <span key={i} className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400">{h}</span>
                ))}
              </div>
              <ul className="divide-y divide-neutral-100">
                {COMPARABLES.map((c) => {
                  const isOut = excluded.has(c.id)
                  return (
                    <li key={c.id} className={`grid grid-cols-2 sm:grid-cols-[1fr_70px_140px_90px_72px_40px] gap-2 sm:gap-3 sm:items-center px-5 sm:px-6 py-3 transition-opacity ${isOut ? 'opacity-40' : ''}`}>
                      <span className={`text-[13.5px] font-medium text-[#0B1220] truncate ${isOut ? 'line-through' : ''}`}>{c.dir}</span>
                      <span className="text-[13px] text-neutral-600 tabular-nums">{c.area} m²</span>
                      <span className="text-[13.5px] font-medium text-[#0B1220] tabular-nums">{fmtShort(c.precio)}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="hidden sm:block h-1.5 w-10 rounded-full bg-neutral-100 overflow-hidden">
                          <span className="block h-full rounded-full" style={{ width: `${c.similitud}%`, background: BLUE }} />
                        </span>
                        <span className="text-[12px] text-neutral-500 tabular-nums">{c.similitud}%</span>
                      </span>
                      <span className="text-[12px] text-neutral-500 tabular-nums">{c.dist}</span>
                      <button
                        type="button"
                        onClick={() => toggleExclude(c.id)}
                        aria-label={isOut ? 'Incluir comparable' : 'Excluir comparable'}
                        className="justify-self-end inline-flex items-center justify-center w-7 h-7 rounded-md text-neutral-400 hover:text-[#C4503B] hover:bg-neutral-50 transition-colors"
                      >
                        {isOut ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <X className="w-4 h-4" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-6 lg:sticky lg:top-6">
            {/* Ficha */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden">
              <div className="relative h-32 bg-gradient-to-br from-neutral-100 to-neutral-200/70 flex items-center justify-center">
                <Storefront className="w-8 h-8 text-neutral-300" weight="duotone" />
                <span className="absolute bottom-2 right-2 inline-flex items-center h-5 px-2 rounded-full bg-white/90 backdrop-blur font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] text-neutral-500">
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
                        <FIcon className="w-4 h-4 text-neutral-400 shrink-0" weight="bold" />
                        <div className="min-w-0">
                          <dt className="text-[11px] text-neutral-400 leading-none">{f.label}</dt>
                          <dd className="text-[13.5px] font-medium text-[#0B1220] tabular-nums mt-0.5">{f.value}</dd>
                        </div>
                      </div>
                    )
                  })}
                </dl>
              </div>
            </section>

            {/* Expectativa */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
              <Eyebrow>Expectativa del propietario</Eyebrow>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-500">María espera</span>
                  <span className="font-medium text-[#0B1220] tabular-nums">{fmtShort(OWNER_EXPECTATION)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-500">Gabriela sugiere</span>
                  <span className="font-semibold tabular-nums" style={{ color: BLUE }}>{fmtShort(mercado.value)}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '100%', background: '#E2E5EA' }} />
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((mercado.value / OWNER_EXPECTATION) * 100)}%`, background: BLUE }} />
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg p-3 text-[12.5px] leading-snug" style={{ background: '#FBF3E2', color: '#8A5A12' }}>
                  <span className="font-semibold tabular-nums shrink-0">{gapPct}%</span>
                  <span>
                    {fmtShort(Math.abs(gapAbs))} por encima del mercado. A {fmtShort(OWNER_EXPECTATION)} podría tardar más de 12 meses en venderse.
                  </span>
                </div>
              </div>
            </section>

            {/* Estrategia + acciones */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 space-y-4">
              <div>
                <Eyebrow accent>Estrategia recomendada</Eyebrow>
                <p className="mt-2 text-[13px] text-[#0B1220] leading-relaxed">
                  Gabriela recomienda <span className="font-semibold">Mercado · {fmtShort(mercado.value)}</span>: vende en ~4 meses a precio justo, sin dejar plata sobre la mesa.
                </p>
                {selected !== 'mercado' && (
                  <p className="mt-2 text-[12.5px] leading-snug" style={{ color: '#8A5A12' }}>
                    Elegiste {active.label} ({fmtShort(active.value)}). {active.key === 'aspiracional' ? 'Mayor precio, pero más meses en venta.' : 'Vendes antes, pero por debajo del mercado.'}
                  </p>
                )}
              </div>
              <div className="space-y-2 pt-1">
                <Link
                  href="/panel/inmobiliaria/avaluos-ia/enviar"
                  className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ background: BLUE }}
                >
                  <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                  Enviar reporte al propietario
                </Link>
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-neutral-200 text-[#0B1220] text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  <Megaphone className="w-4 h-4 text-neutral-500" weight="bold" />
                  Publicar a {fmtShort(active.value)}
                </button>
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 h-10 text-[13px] font-medium text-neutral-500 hover:text-[#0B1220] transition-colors"
                >
                  <FilePdf className="w-4 h-4" weight="bold" />
                  Descargar PDF
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
