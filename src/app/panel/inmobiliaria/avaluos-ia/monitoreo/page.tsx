'use client'

/**
 * /panel/inmobiliaria/avaluos-ia/monitoreo — Post-publish monitoring (§16, Camila).
 *
 * The lifecycle stage AFTER the owner accepts and the property is published.
 * Camila watches the listing and flags when reality diverges from the plan.
 * This is the "publicado sin tracción" case surfaced in the home bandeja:
 * 28 days listed, 0 visits, canon 12% above the recommendation.
 *
 *   • Camila diagnosis (ink anchor) + recommended adjustment
 *   • Rendimiento desde la publicación — KPIs
 *   • Ritmo vs. lo esperado
 *   • Qué cambió en el mercado (Valentina)
 *   • Recomendación de ajuste con proyección → aplicar + avisar al propietario
 *   • Línea de tiempo del avalúo (§13 estados)
 *
 * In-page state, mock data — renders standalone for review.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowDown,
  Eye,
  Phone,
  BookmarkSimple,
  CalendarBlank,
  WarningCircle,
  Check,
  CheckCircle,
  Sparkle,
  TrendUp,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandContour, MonoLabel, StatusBadge } from '@leasefy/cadence'

import { Button, Card } from '@/components/ui'

const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number) => COP.format(n)

const CANON_PUBLICADO = 4_100_000
const CANON_NUEVO = 3_650_000
const ajustePct = Math.round(((CANON_NUEVO - CANON_PUBLICADO) / CANON_PUBLICADO) * 100)

// ── KPIs ──────────────────────────────────────────────────────────────────────
const KPIS: { icon: Icon; label: string; value: string; sub: string; warn?: boolean }[] = [
  { icon: CalendarBlank, label: 'Días publicado', value: '28', sub: '~25 esperado' },
  { icon: Eye, label: 'Visitas agendadas', value: '0', sub: '~14 esperadas', warn: true },
  { icon: Phone, label: 'Contactos', value: '2', sub: '4–6 esperados' },
  { icon: BookmarkSimple, label: 'Guardados', value: '5', sub: 'interés tibio' },
]

// ── Lifecycle (§13 estados) ─────────────────────────────────────────────────────
const TIMELINE: { label: string; meta: string; state: 'done' | 'active' | 'future' }[] = [
  { label: 'Avalúo creado', meta: 'hace 35 días', state: 'done' },
  { label: 'Enviado al propietario', meta: 'hace 33 días', state: 'done' },
  { label: 'Aceptado por el propietario', meta: `hace 30 días · a ${fmt(CANON_PUBLICADO)}`, state: 'done' },
  { label: 'Publicado', meta: 'hace 28 días', state: 'done' },
  { label: 'Monitoreando', meta: 'Camila · ahora', state: 'active' },
  { label: 'Arrendado', meta: 'pendiente', state: 'future' },
]

export default function MonitoreoPage() {
  const [aplicado, setAplicado] = React.useState(false)

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* Header */}
        <Link
          href="/panel/inmobiliaria/avaluos-ia"
          className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Avalúos IA
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">Cl. 10 #43-30 · Manila</h1>
          <StatusBadge tone="neutral" dot={false}>Publicado</StatusBadge>
          <span className="text-[13px] text-fg-subtle">hace 28 días · canon <span className="font-mono tabular-nums">{fmt(CANON_PUBLICADO)}</span>/mes</span>
        </div>

        {/* ── Camila diagnosis (ink anchor) ──────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-2xl px-6 py-6 sm:px-7"
          style={{ background: INK_GRADIENT, boxShadow: '0 24px 60px -28px rgba(20, 19, 15,0.5)' }}
        >
          <div className="pointer-events-none absolute -inset-x-2 top-[46%] h-[44%] text-white/[0.10]">
            <BrandContour />
          </div>
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-start gap-4 flex-1">
              <span
                className="inline-flex items-center justify-center rounded-2xl text-lg font-semibold text-white shrink-0"
                style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                C
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/50">Camila · Monitoreo</span>
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10.5px] font-medium" style={{ background: 'rgba(183,121,31,0.22)', color: '#F2C879' }}>
                    <WarningCircle className="w-3 h-3" weight="fill" />
                    Sin tracción
                  </span>
                </div>
                <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-white leading-snug">
                  Este inmueble no está teniendo tracción.
                </h2>
                <p className="text-[13.5px] text-white/65 leading-relaxed max-w-xl">
                  28 días publicado, 0 visitas agendadas. El canon está <span className="font-medium text-white/90">12% por encima</span> de lo recomendado y esta semana entraron 4 inmuebles similares más baratos.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Button variant="white" hideArrow asChild>
                <a href="#ajuste">
                  <ArrowDown className="w-4 h-4" weight="bold" />
                  Ver ajuste sugerido
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Performance + recommendation ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* LEFT */}
          <div className="space-y-6 min-w-0">
            {/* Rendimiento KPIs */}
            <Card className="rounded-2xl p-5 sm:p-6">
              <div className="mb-4">
                <MonoLabel>Rendimiento desde la publicación</MonoLabel>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {KPIS.map((k) => {
                  const KIcon = k.icon
                  return (
                    <div key={k.label} className="space-y-1.5">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${k.warn ? 'bg-warning-soft text-warning' : 'bg-surface-muted text-fg-muted'}`}
                      >
                        <KIcon className="w-4 h-4" weight="bold" />
                      </span>
                      <p className={`text-[24px] font-semibold tracking-[-0.01em] font-mono tabular-nums leading-none ${k.warn ? 'text-warning' : 'text-fg'}`}>
                        {k.value}
                      </p>
                      <p className="text-[12px] text-fg-muted leading-tight">{k.label}</p>
                      <p className="text-[11px] text-fg-subtle">{k.sub}</p>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Ritmo vs esperado */}
            <Card className="rounded-2xl p-5 sm:p-6">
              <h3 className="text-[15px] font-semibold text-fg mb-1">El ritmo va por debajo</h3>
              <p className="text-[13px] text-fg-muted mb-4">A día 28, un inmueble bien valorado ya tendría visitas agendadas.</p>
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                    <span className="text-fg-muted">Esperado a hoy</span>
                    <span className="font-medium text-fg tabular-nums">~14 visitas</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '100%', background: '#E2E5EA' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                    <span className="text-fg-muted">Real</span>
                    <span className="font-medium tabular-nums text-warning">0 visitas</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '3%', background: '#B7791F' }} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Mercado (Valentina) */}
            <Card className="rounded-2xl p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[12px] font-medium shrink-0 bg-surface-muted text-fg-muted">
                  V
                </span>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-fg">Valentina · Qué cambió en el mercado</p>
                  <p className="text-[13.5px] text-fg-muted leading-relaxed">
                    Entraron <span className="font-medium text-fg">4 inmuebles similares</span> esta semana, desde {fmt(3_400_000)}/mes. La oferta en la zona subió 18% en el último mes — hay más competencia por el mismo inquilino.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-6 lg:sticky lg:top-6">
            {/* Recomendación de ajuste */}
            <section id="ajuste" className="rounded-2xl border-2 bg-surface p-5" style={{ borderColor: aplicado ? '#CBE3D5' : BLUE }}>
              {!aplicado ? (
                <>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkle className="w-3.5 h-3.5 text-primary" weight="fill" />
                    <MonoLabel className="tracking-[0.08em] text-primary">Ajuste recomendado</MonoLabel>
                  </div>

                  <div className="flex items-end gap-3">
                    <span className="text-[14px] text-fg-subtle line-through font-mono tabular-nums">{fmt(CANON_PUBLICADO)}</span>
                    <span className="text-[26px] font-semibold tracking-[-0.01em] text-fg font-mono tabular-nums leading-none">{fmt(CANON_NUEVO)}</span>
                    <span className="inline-flex items-center gap-0.5 text-[12.5px] font-medium pb-0.5 text-success font-mono tabular-nums">
                      <ArrowDown className="w-3 h-3" weight="bold" />
                      {Math.abs(ajustePct)}%
                    </span>
                  </div>
                  <p className="text-[12px] text-fg-subtle mt-1">/mes · vuelve al rango recomendado</p>

                  {/* projection */}
                  <div className="mt-4 rounded-lg bg-surface-muted p-3 space-y-2">
                    <div className="flex items-center gap-2 text-[12.5px] text-fg">
                      <TrendUp className="w-4 h-4 shrink-0 text-success" weight="bold" />
                      <span>Proyección de Camila al nuevo precio:</span>
                    </div>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-fg-muted">Primeras visitas</span>
                      <span className="font-medium text-fg">en ~5 días</span>
                    </div>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-fg-muted">Arriendo estimado</span>
                      <span className="font-medium text-fg">en ~30 días</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Button
                      type="button"
                      onClick={() => setAplicado(true)}
                      hideArrow
                      className="w-full"
                    >
                      <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                      Aplicar y avisar al propietario
                    </Button>
                    <p className="text-[11.5px] text-fg-subtle text-center leading-snug">
                      Cambiar el canon requiere el visto bueno de Carlos. Sofía le envía el porqué.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <CheckCircle className="w-9 h-9 mx-auto text-success" weight="fill" />
                  <p className="text-[14px] font-semibold text-fg">Propuesta enviada a Carlos</p>
                  <p className="text-[12.5px] text-fg-muted leading-relaxed">
                    Le pedimos aprobar el nuevo canon de {fmt(CANON_NUEVO)}. Camila republica apenas confirme.
                  </p>
                </div>
              )}
            </section>

            {/* Línea de tiempo (§13 estados) */}
            <Card className="rounded-2xl p-5">
              <MonoLabel>Línea de tiempo</MonoLabel>
              <ol className="mt-4 space-y-0">
                {TIMELINE.map((t, i) => {
                  const last = i === TIMELINE.length - 1
                  return (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {t.state === 'done' ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0" style={{ background: '#2C7A53' }}>
                            <Check className="w-3 h-3 text-white" weight="bold" />
                          </span>
                        ) : t.state === 'active' ? (
                          <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0">
                            <span className="absolute inline-flex h-5 w-5 rounded-full opacity-30 animate-ping" style={{ background: BLUE }} />
                            <span className="relative inline-flex w-2.5 h-2.5 rounded-full" style={{ background: BLUE }} />
                          </span>
                        ) : (
                          <span className="inline-flex w-5 h-5 rounded-full border-2 border-border shrink-0" />
                        )}
                        {!last && <span className="w-px flex-1 my-1" style={{ background: t.state === 'done' ? '#2C7A53' : '#E5E7EB', minHeight: 18 }} />}
                      </div>
                      <div className={`pb-4 ${last ? 'pb-0' : ''}`}>
                        <p className={`text-[13px] font-medium ${t.state === 'future' ? 'text-fg-subtle' : 'text-fg'}`}>{t.label}</p>
                        <p className="text-[11.5px] text-fg-subtle">{t.meta}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
