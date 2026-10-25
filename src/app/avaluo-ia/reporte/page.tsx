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
 *
 * Glow up 22-10-2026: los colores salen de los tokens de Cadence (nada de
 * hexadecimales sueltos), la plata en mono sin negrilla, la letra desde 13 px,
 * íconos sueltos sin cajas de color y un solo azul (el botón de aceptar).
 * Pendiente de Nico: es una maqueta (datos de ejemplo y botones sin acción).
 */

import {
  Check,
  Lightning,
  Minus,
  Plus,
  Scales,
  ShieldCheck,
  Trophy,
  WhatsappLogo,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { BrandContour, BrandMark, StatusBadge } from '@leasefy/cadence'
import { LeasefyLogotype } from '@/components/brand'
import { Button } from '@/components/ui/button'

// ── Brand constants ───────────────────────────────────────────────────────────
// La tinta de la marca (Cadence 2): el héroe de la cifra va sobre tinta.
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
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

/** El título de cada bloque: liviano, sin negrilla. */
function TituloDeBloque({ children }: { children: ReactNode }) {
  return <h2 className="text-body font-medium text-fg">{children}</h2>
}

export default function ReporteAvaluoPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* ── La marca ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-[560px] items-center justify-between px-4">
          <LeasefyLogotype className="h-5 w-auto text-fg" title="Leasefy" />
          <span className="text-caption text-fg-subtle">Avalúo IA</span>
        </div>
      </header>

      <main className="mx-auto max-w-[560px] space-y-5 px-4 py-8">
        {/* ── Saludo ───────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <h1 className="font-heading text-[26px] font-[420] leading-[1.12] tracking-[-0.025em] text-fg">
            Hola, Carlos
          </h1>
          <p className="text-body-sm leading-relaxed text-fg-muted">
            Este es el avalúo de arriendo de tu inmueble en{' '}
            <span className="text-fg">Cra. 43 #5-20, El Poblado</span>.
          </p>
          <p className="text-caption text-fg-subtle">
            Preparado por Inmobiliaria Demo con Leasefy IA · 17 jun 2026
          </p>
        </div>

        {/* ── LA cifra, sobre tinta ────────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-lg px-6 py-7 text-center"
          style={{ background: INK_GRADIENT }}
        >
          <div className="pointer-events-none absolute -inset-x-2 top-[52%] h-[42%] text-white/[0.10]">
            <BrandContour />
          </div>
          <div className="relative space-y-1.5">
            <span className="text-caption text-white/60">Canon recomendado</span>
            <div className="pt-1 font-mono text-[40px] font-normal leading-none tracking-[-0.02em] tabular-nums text-white">
              {fmt(RECOMENDADO)}
            </div>
            <div className="text-caption text-white/60">por mes</div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-caption text-white/85">
              <ShieldCheck className="h-3.5 w-3.5 text-white/85" weight="fill" aria-hidden="true" />
              Basado en 12 inmuebles similares cerca
            </div>
          </div>
        </section>

        {/* ── Por qué este precio ──────────────────────────────────────── */}
        <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <TituloDeBloque>Por qué este precio</TituloDeBloque>
          <div className="space-y-2">
            <p className="text-caption text-fg-muted">Tu inmueble juega a favor</p>
            <ul className="space-y-2">
              {PROS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-body-sm text-fg">
                  <Plus className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="bold" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-caption text-fg-muted">Y juega en contra</p>
            <ul className="space-y-2">
              {CONTRAS.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-body-sm text-fg">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="bold" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Qué pasa según el precio ─────────────────────────────────── */}
        <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <div className="space-y-1">
            <TituloDeBloque>Qué pasa según el precio</TituloDeBloque>
            <p className="text-body-sm leading-relaxed text-fg-muted">
              Mientras más alto el canon, más tarda en arrendarse. Este es el balance:
            </p>
          </div>
          <ul className="space-y-2">
            {ESCENARIOS.map((e) => {
              const EIcon = e.icon
              return (
                <li
                  key={e.label}
                  className={
                    e.reco
                      ? 'flex items-center gap-3 rounded-md border border-fg/50 bg-surface-muted p-3'
                      : 'flex items-center gap-3 rounded-md border border-border p-3'
                  }
                >
                  <EIcon className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-body-sm text-fg">
                      {e.label}
                      {e.reco ? <StatusBadge tone="neutral">Recomendado</StatusBadge> : null}
                    </span>
                    <span className="block text-caption text-fg-muted">Se arrienda en {e.dias}</span>
                  </span>
                  <span className="shrink-0 font-mono text-body-sm tabular-nums text-fg">{fmt(e.valor)}</span>
                </li>
              )
            })}
          </ul>
          <p className="text-body-sm leading-relaxed text-fg">
            Recomendamos <span className="font-mono tabular-nums">{fmt(RECOMENDADO)}</span>: el mejor equilibrio entre
            lo que ganas y la rapidez para arrendar.
          </p>
        </section>

        {/* ── Si esperabas más (expectation §11) ───────────────────────── */}
        <section className="space-y-1.5 rounded-lg bg-warning-soft p-5">
          <TituloDeBloque>Si tenías otro número en mente</TituloDeBloque>
          <p className="text-body-sm leading-relaxed text-fg">
            Sabemos que pensabas en cerca de <span className="font-mono tabular-nums">{fmt(OWNER_EXPECTATION)}</span>.
            A ese precio, inmuebles como el tuyo suelen tardar <span className="font-medium">más de 90 días</span> en
            arrendarse — o no arrendarse. Preferimos ser honestos contigo y ayudarte a decidir con datos reales.
          </p>
        </section>

        {/* ── Inmuebles parecidos ──────────────────────────────────────── */}
        <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <div className="space-y-1">
            <TituloDeBloque>Inmuebles parecidos cerca</TituloDeBloque>
            <p className="text-body-sm text-fg-muted">Lo que se cobra hoy por inmuebles como el tuyo.</p>
          </div>
          <ul className="divide-y divide-border-faint">
            {COMPARABLES.map((c) => (
              <li key={c.dir} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block truncate text-body-sm text-fg">{c.dir}</span>
                  <span className="block text-caption text-fg-muted">{c.specs}</span>
                </span>
                <span className="shrink-0 font-mono text-body-sm tabular-nums text-fg">{fmt(c.canon)}/mes</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── La decisión: un solo azul ─────────────────────────────────── */}
        <section className="space-y-2.5 pt-1">
          <Button type="button" size="lg" hideArrow className="w-full">
            <Check className="h-5 w-5" weight="bold" aria-hidden="true" />
            Acepto, publiquen a {fmt(RECOMENDADO)}
          </Button>
          <Button type="button" size="lg" variant="outline" hideArrow className="w-full">
            <WhatsappLogo className="h-5 w-5 text-success" weight="fill" aria-hidden="true" />
            Quiero hablarlo con un asesor
          </Button>
        </section>

        {/* ── Pie ──────────────────────────────────────────────────────── */}
        <footer className="space-y-1.5 pb-2 pt-3 text-center">
          <div className="inline-flex items-center gap-1.5 text-caption text-fg-subtle">
            <BrandMark size={16} variant="bare" className="text-fg-subtle" />
            Generado por Leasefy IA
          </div>
          <p className="mx-auto max-w-xs text-caption leading-relaxed text-fg-subtle">
            Este avalúo es una estimación basada en datos de mercado y no constituye un avalúo comercial certificado.
          </p>
        </footer>
      </main>
    </div>
  )
}
