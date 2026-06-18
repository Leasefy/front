'use client'

/**
 * /avaluo-ia/reporte — Owner-facing avalúo report (§15).
 *
 * Standalone, light, mobile-first, branded — what the property owner (Carlos)
 * opens from the WhatsApp/email link. Built to BUILD TRUST and let the owner
 * ACT: the number sustained, a friendly rationale, the strategy tradeoff, a
 * diplomatic handling of a higher expectation (§11), comparables, and a clear
 * accept / talk-to-an-advisor CTA.
 *
 * No panel chrome, no auth — renders standalone for review. Mock data: the
 * El Poblado rent appraisal, owner Carlos Restrepo.
 */

import {
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Check,
  WhatsappLogo,
  Sparkle,
  Lightning,
  Scales,
  Trophy,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandMark, BrandContour } from '@leasefy/ui'

// ── Brand constants ───────────────────────────────────────────────────────────
const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #0B1220 56%, #122457 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number) => COP.format(n)

const RECOMENDADO = 3_450_000
const OWNER_EXPECTATION = 4_200_000

const PROS = [
  'Zona premium en El Poblado (estrato 6)',
  'Remodelado hace menos de 2 años',
  'Edificio con gimnasio y piscina',
]
const CONTRAS = ['Cuenta con un solo parqueadero', 'No tiene balcón']

const ESCENARIOS: { icon: Icon; label: string; valor: number; dias: string; reco?: boolean }[] = [
  { icon: Lightning, label: 'Para arrendar rápido', valor: 3_200_000, dias: '~12 días' },
  { icon: Scales, label: 'Equilibrio (recomendado)', valor: 3_450_000, dias: '~25 días', reco: true },
  { icon: Trophy, label: 'Renta máxima', valor: 3_750_000, dias: '~45 días' },
]

const COMPARABLES = [
  { dir: 'Cra. 41 #6-10', specs: '82 m² · 2 hab', canon: 3_500_000 },
  { dir: 'Cra. 43A #5-50', specs: '80 m² · 2 hab', canon: 3_600_000 },
  { dir: 'Cl. 7 #43-20', specs: '75 m² · 2 hab', canon: 3_300_000 },
]

export default function ReporteAvaluoPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Brand bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-neutral-200/80">
        <div className="mx-auto max-w-[560px] px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#0B1220]">Leasefy</span>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-400">
            <Sparkle className="w-3 h-3" weight="fill" style={{ color: BLUE }} />
            Avalúo IA
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[560px] px-4 py-8 space-y-5">
        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0B1220]">
            Hola, Carlos
          </h1>
          <p className="text-[14.5px] text-neutral-600 leading-relaxed">
            Este es el avalúo de arriendo de tu inmueble en{' '}
            <span className="font-medium text-[#0B1220]">Cra. 43 #5-20, El Poblado</span>.
          </p>
          <p className="text-[12.5px] text-neutral-400">
            Preparado por Inmobiliaria Demo con Leasefy IA · 17 jun 2026
          </p>
        </div>

        {/* ── The number (ink hero) ────────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-2xl px-6 py-7 text-center"
          style={{ background: INK_GRADIENT, boxShadow: '0 24px 60px -28px rgba(11,18,32,0.5)' }}
        >
          <div className="pointer-events-none absolute -inset-x-2 top-[52%] h-[42%] text-white/[0.10]">
            <BrandContour />
          </div>
          <div className="relative space-y-1.5">
            <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">
              Canon recomendado
            </span>
            <div className="text-[40px] font-semibold tracking-[-0.025em] text-white tabular-nums leading-none pt-1">
              {fmt(RECOMENDADO)}
            </div>
            <div className="text-[13px] text-white/55">por mes</div>
            <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 h-6 rounded-full bg-white/10 text-[11.5px] font-medium text-white/85">
              <ShieldCheck className="w-3.5 h-3.5" weight="fill" style={{ color: '#5FD08A' }} />
              Basado en 12 inmuebles similares cerca
            </div>
          </div>
        </section>

        {/* ── Por qué este precio ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[#0B1220] mb-3.5">Por qué este precio</h2>

          <p className="text-[12.5px] font-medium text-neutral-500 mb-2">Tu inmueble juega a favor</p>
          <ul className="space-y-2 mb-4">
            {PROS.map((p) => (
              <li key={p} className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md shrink-0" style={{ background: '#E9F3EE', color: '#22663F' }}>
                  <ArrowUp className="w-3.5 h-3.5" weight="bold" />
                </span>
                <span className="text-[13.5px] text-[#0B1220]">{p}</span>
              </li>
            ))}
          </ul>

          <p className="text-[12.5px] font-medium text-neutral-500 mb-2">Y juega en contra</p>
          <ul className="space-y-2">
            {CONTRAS.map((c) => (
              <li key={c} className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md shrink-0" style={{ background: '#FBF3E2', color: '#8A5A12' }}>
                  <ArrowDown className="w-3.5 h-3.5" weight="bold" />
                </span>
                <span className="text-[13.5px] text-[#0B1220]">{c}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Qué pasa según el precio ─────────────────────────────────── */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[#0B1220] mb-1">Qué pasa según el precio</h2>
          <p className="text-[13px] text-neutral-500 mb-4 leading-relaxed">
            Mientras más alto el canon, más tarda en arrendarse. Este es el balance:
          </p>
          <ul className="space-y-2">
            {ESCENARIOS.map((e) => {
              const EIcon = e.icon
              return (
                <li
                  key={e.label}
                  className="flex items-center gap-3 rounded-xl p-3 border"
                  style={e.reco ? { borderColor: BLUE, background: '#F7F9FF' } : { borderColor: 'rgba(0,0,0,0.08)' }}
                >
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ background: e.reco ? '#EAEEFF' : '#F1F3F6', color: e.reco ? BLUE : '#525B6B' }}
                  >
                    <EIcon className="w-[18px] h-[18px]" weight="duotone" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium text-[#0B1220]">{e.label}</span>
                    <span className="block text-[12px] text-neutral-500">Se arrienda en {e.dias}</span>
                  </span>
                  <span className="text-[15px] font-semibold text-[#0B1220] tabular-nums">{fmt(e.valor)}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3.5 flex items-start gap-2 text-[13px] text-[#0B1220] leading-relaxed">
            <Sparkle className="w-4 h-4 mt-0.5 shrink-0" weight="fill" style={{ color: BLUE }} />
            <span>Recomendamos <span className="font-semibold">{fmt(RECOMENDADO)}</span>: el mejor equilibrio entre lo que ganas y la rapidez para arrendar.</span>
          </p>
        </section>

        {/* ── Si esperabas más (expectation §11) ───────────────────────── */}
        <section
          className="rounded-2xl p-5 border"
          style={{ borderColor: '#F0E2C4', background: '#FCF7EC' }}
        >
          <h2 className="text-[14.5px] font-semibold mb-1.5" style={{ color: '#8A5A12' }}>
            Si tenías otro número en mente
          </h2>
          <p className="text-[13.5px] leading-relaxed" style={{ color: '#6B4E13' }}>
            Sabemos que pensabas en cerca de <span className="font-semibold">{fmt(OWNER_EXPECTATION)}</span>.
            A ese precio, inmuebles como el tuyo suelen tardar <span className="font-semibold">más de 90 días</span> en
            arrendarse — o no arrendarse. Preferimos ser honestos contigo y ayudarte a decidir con datos reales.
          </p>
        </section>

        {/* ── Inmuebles parecidos ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[#0B1220] mb-1">Inmuebles parecidos cerca</h2>
          <p className="text-[13px] text-neutral-500 mb-3.5">Lo que se cobra hoy por propiedades como la tuya.</p>
          <ul className="space-y-2">
            {COMPARABLES.map((c) => (
              <li key={c.dir} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-[#0B1220] truncate">{c.dir}</span>
                  <span className="block text-[12px] text-neutral-500">{c.specs}</span>
                </span>
                <span className="text-[13.5px] font-semibold text-[#0B1220] tabular-nums shrink-0">{fmt(c.canon)}/mes</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="space-y-2.5 pt-1">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white text-[15px] font-medium transition-colors"
            style={{ background: BLUE }}
          >
            <Check className="w-5 h-5" weight="bold" />
            Acepto, publiquen a {fmt(RECOMENDADO)}
          </button>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl border border-neutral-200 bg-white text-[#0B1220] text-[15px] font-medium hover:bg-neutral-50 transition-colors"
          >
            <WhatsappLogo className="w-5 h-5" weight="fill" style={{ color: '#25D366' }} />
            Quiero hablarlo con un asesor
          </button>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="pt-3 pb-2 text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400">
            <BrandMark size={16} variant="bare" className="text-neutral-300" />
            Generado por Leasefy IA
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xs mx-auto">
            Este avalúo es una estimación basada en datos de mercado y no constituye un avalúo comercial certificado.
          </p>
        </footer>
      </main>
    </div>
  )
}
