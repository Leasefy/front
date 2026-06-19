'use client'

/**
 * /panel/inmobiliaria/avaluos-ia — Avalúos IA home ("la sala de Gabriela").
 *
 * PROTOTYPE (proposal) of the new Avalúos IA agent experience, distinct from
 * the existing read-only certificate-tracking sala at /ai/avaluos. This is the
 * agent that ANSWERS "¿cuánto cobrar de arriendo o pedir en venta?" — number +
 * estrategia + comparables, with a named AI team.
 *
 * Anatomy (BRAND-CONTRACT):
 *   1. Hero — the ONE ink anchor: agent identity (Gabriela), value line, live
 *      status, primary CTA "Nuevo avalúo". BrandContour signature + glow.
 *   2. KPI strip — four standard (gray) display cards. Blue never on static tiles.
 *   3. Bandeja "Qué necesita tu atención" — the operational inbox.
 *   4. El equipo — Gabriela + 6 subagentes con su identidad y rol (§17).
 *   5. Avalúos recientes — compact list with tipo / recomendado / confianza.
 *
 * Mock data inline — no backend dependency, renders standalone for review.
 */

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CaretRight,
  Plus,
  Sparkle,
  TrendUp,
  WarningCircle,
  Info,
  FileDashed,
  MapPin,
  House,
  Storefront,
  ArrowsLeftRight,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandContour, Eyebrow } from '@leasefy/ui'

// ── Brand constants ───────────────────────────────────────────────────────────
const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #0B1220 56%, #122457 140%)'

// Desaturated semantic signals (BRAND-CONTRACT §2) — soft tint + ink text.
const SEV = {
  warning: { dot: '#B7791F', soft: '#FBF3E2', fg: '#8A5A12' },
  info: { dot: BLUE, soft: '#EAEEFF', fg: '#1636D8' },
  neutral: { dot: '#9AA3B2', soft: '#F1F3F6', fg: '#525B6B' },
  success: { dot: '#2C7A53', soft: '#E9F3EE', fg: '#22663F' },
} as const

type Severity = keyof typeof SEV

// ── Types ───────────────────────────────────────────────────────────────────
type TipoAvaluo = 'arriendo' | 'venta' | 'mixto'

interface BandejaItem {
  id: string
  severity: Severity
  icon: Icon
  tag: string
  title: string
  detail: string
  cta: string
}

interface RecienteRow {
  id: string
  inmueble: string
  zona: string
  tipo: TipoAvaluo
  recomendado: string
  confianza: 'Alta' | 'Media' | 'Baja'
  estado: 'Borrador' | 'Enviado' | 'Publicado' | 'Cerrado'
  fecha: string
}

interface Miembro {
  inicial: string
  nombre: string
  rol: string
  lead?: boolean
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const KPIS: { label: string; value: string; delta?: string; dir?: 'up' | 'down'; sub?: string }[] = [
  { label: 'Avalúos este mes', value: '42', delta: '+18%', dir: 'up', sub: 'vs. mayo' },
  { label: 'Precisión vs. cierre', value: '94%', delta: '+3 pts', dir: 'up', sub: 'precio sugerido ≈ cierre' },
  { label: 'Tiempo promedio', value: '2,4 min', sub: 'de solicitud a resultado' },
  { label: 'En tu bandeja', value: '5', sub: 'esperan tu decisión' },
]

const BANDEJA: BandejaItem[] = [
  {
    id: 'b1',
    severity: 'warning',
    icon: WarningCircle,
    tag: 'Expectativa alta',
    title: 'El propietario de Cra. 43 #5-20 espera $4.200.000',
    detail: 'Gabriela sugiere $3.450.000/mes para arrendar en ≤ 30 días — 18% por debajo de su expectativa.',
    cta: 'Ver comparación',
  },
  {
    id: 'b2',
    severity: 'info',
    icon: Info,
    tag: 'Confianza baja',
    title: 'Calle 9 Sur #25-30, Sabaneta — pocos comparables',
    detail: 'Solo 2 inmuebles similares en la zona. Revisa el rango antes de enviarlo al propietario.',
    cta: 'Revisar avalúo',
  },
  {
    id: 'b3',
    severity: 'neutral',
    icon: FileDashed,
    tag: '3 borradores',
    title: '3 avalúos listos para enviar al propietario',
    detail: 'Gabriela ya tiene el número y la estrategia; solo falta tu visto bueno.',
    cta: 'Revisar borradores',
  },
  {
    id: 'b4',
    severity: 'warning',
    icon: TrendUp,
    tag: 'Sin tracción',
    title: 'Cl. 10 #43-30, Manila — 28 días publicado, 0 visitas',
    detail: 'El canon publicado está 12% sobre el sugerido. Camila propone ajustar la estrategia.',
    cta: 'Ajustar estrategia',
  },
]

const EQUIPO: Miembro[] = [
  { inicial: 'G', nombre: 'Gabriela', rol: 'Coordina tu avalúo', lead: true },
  { inicial: 'L', nombre: 'Laura', rol: 'Comparables del mercado' },
  { inicial: 'N', nombre: 'Nicolás', rol: 'Ficha del inmueble' },
  { inicial: 'V', nombre: 'Valentina', rol: 'Tendencias de la zona' },
  { inicial: 'S', nombre: 'Samuel', rol: 'Precio y estrategia' },
  { inicial: 'S', nombre: 'Sofía', rol: 'Reporte al propietario' },
  { inicial: 'C', nombre: 'Camila', rol: 'Monitoreo post-publicación' },
]

const RECIENTES: RecienteRow[] = [
  { id: 'r1', inmueble: 'Cra. 43 #5-20', zona: 'El Poblado', tipo: 'arriendo', recomendado: '$3.450.000/mes', confianza: 'Alta', estado: 'Enviado', fecha: 'hace 2 h' },
  { id: 'r2', inmueble: 'Cl. 7 #39-20', zona: 'Provenza', tipo: 'venta', recomendado: '$620.000.000', confianza: 'Media', estado: 'Borrador', fecha: 'hace 5 h' },
  { id: 'r3', inmueble: 'Apto 1201', zona: 'Ciudad del Río', tipo: 'arriendo', recomendado: '$2.900.000/mes', confianza: 'Alta', estado: 'Cerrado', fecha: 'ayer' },
  { id: 'r4', inmueble: 'Cl. 10 #43-30', zona: 'Manila', tipo: 'arriendo', recomendado: '$4.100.000/mes', confianza: 'Baja', estado: 'Publicado', fecha: 'hace 3 d' },
  { id: 'r5', inmueble: 'Casa 14', zona: 'Envigado', tipo: 'mixto', recomendado: '$850M · $4,5M/mes', confianza: 'Media', estado: 'Enviado', fecha: 'hace 4 d' },
]

// ── Tipo vocabulary ─────────────────────────────────────────────────────────
const TIPO_META: Record<TipoAvaluo, { label: string; icon: Icon }> = {
  arriendo: { label: 'Arriendo', icon: House },
  venta: { label: 'Venta', icon: Storefront },
  mixto: { label: 'Mixto', icon: ArrowsLeftRight },
}

// ── Small primitives ──────────────────────────────────────────────────────────

/** Monogram avatar — neutral by default, ink-on-blue tile for the lead. */
function Monogram({ inicial, lead = false, size = 36 }: { inicial: string; lead?: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full font-medium shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: lead ? BLUE : '#EEF1F6',
        color: lead ? '#fff' : '#3A4254',
      }}
    >
      {inicial}
    </span>
  )
}

function ConfianzaChip({ value }: { value: RecienteRow['confianza'] }) {
  const map = {
    Alta: SEV.success,
    Media: SEV.neutral,
    Baja: SEV.warning,
  }[value]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: map.fg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: map.dot }} />
      {value}
    </span>
  )
}

function EstadoChip({ value }: { value: RecienteRow['estado'] }) {
  // Estados are informational — gray-first (blue is reserved for actionables,
  // §2). Cerrado is the one real positive signal → success. Enviado/Publicado
  // differ by text weight, not hue.
  const map: Record<RecienteRow['estado'], { soft: string; fg: string }> = {
    Borrador: { soft: '#F1F3F6', fg: '#6B7280' },
    Enviado: { soft: '#ECEEF2', fg: '#0B1220' },
    Publicado: { soft: '#F1F3F6', fg: '#3A4254' },
    Cerrado: { soft: '#E9F3EE', fg: '#22663F' },
  }
  const m = map[value]
  return (
    <span
      className="inline-flex items-center h-6 px-2.5 rounded-md text-[12px] font-medium"
      style={{ background: m.soft, color: m.fg }}
    >
      {value}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AvaluosIAHomePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-7">
        {/* ── Breadcrumb + preview tag ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/panel/inmobiliaria/ai"
            className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-[#0B1220] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Agentes IA
          </Link>
          <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-neutral-200 bg-neutral-50 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400">
            Vista previa
          </span>
        </div>

        {/* ── 1. HERO — the ink anchor ─────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-2xl px-7 py-7 sm:px-9 sm:py-8"
          style={{ background: INK_GRADIENT, boxShadow: '0 26px 64px -28px rgba(11,18,32,0.55)' }}
        >
          {/* BrandContour — the quiet roof signature */}
          <div className="pointer-events-none absolute -inset-x-2 top-[42%] h-[46%] text-white/[0.10]">
            <BrandContour />
          </div>

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: '#8FA3FF' }} />
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">
                  Agente · Avalúos IA
                </span>
              </div>

              <h1 className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] text-white leading-[1.1]">
                ¿Cuánto vale arrendar
                <br className="hidden sm:block" /> o vender este inmueble?
              </h1>

              <p className="text-[15px] leading-relaxed text-white/65 max-w-xl">
                Gabriela y su equipo te dan el número, la estrategia y los comparables que lo
                respaldan — en minutos, no en días.
              </p>

              {/* Live status */}
              <div className="flex items-center gap-2 pt-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: '#5FD08A' }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#5FD08A' }} />
                </span>
                <span className="text-[13px] text-white/70">
                  Gabriela está analizando <span className="font-medium text-white/90">3 inmuebles</span> ahora
                </span>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link
                  href="/panel/inmobiliaria/avaluos-ia/nuevo"
                  className="group inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white text-[#0B1220] text-sm font-medium hover:bg-white/90 transition-colors"
                >
                  <Plus className="w-4 h-4" weight="bold" />
                  Nuevo avalúo
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#bandeja"
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg text-sm font-medium text-white/85 hover:text-white border border-white/15 hover:border-white/30 transition-colors"
                >
                  Ver tu bandeja
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/15 text-[11px] font-semibold tabular-nums">5</span>
                </a>
              </div>
            </div>

            {/* Team cluster — Gabriela lead + orbiting initials */}
            <div className="hidden lg:flex flex-col items-center gap-3 shrink-0 pr-2">
              <span
                className="inline-flex items-center justify-center rounded-2xl text-2xl font-semibold text-white"
                style={{ width: 76, height: 76, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
              >
                G
              </span>
              <div className="flex -space-x-2">
                {EQUIPO.slice(1).map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center rounded-full text-[11px] font-medium text-white/80"
                    style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.10)', border: '1.5px solid #0E1730' }}
                  >
                    {m.inicial}
                  </span>
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">Equipo de 7</span>
            </div>
          </div>
        </section>

        {/* ── 2. KPI STRIP ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-neutral-200/80 bg-white p-5">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400 truncate">
                {kpi.label}
              </p>
              <p className="mt-2.5 text-[26px] font-semibold tracking-[-0.01em] text-[#0B1220] tabular-nums leading-none">
                {kpi.value}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                {kpi.delta && (
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-medium tabular-nums" style={{ color: SEV.success.fg }}>
                    <TrendUp className="w-3.5 h-3.5" weight="bold" />
                    {kpi.delta}
                  </span>
                )}
                {kpi.sub && <span className="text-[12px] text-neutral-400 truncate">{kpi.sub}</span>}
              </div>
            </div>
          ))}
        </section>

        {/* ── 3 + 4. BANDEJA (2/3) + EQUIPO (1/3) ───────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bandeja */}
          <div id="bandeja" className="lg:col-span-2 rounded-2xl border border-neutral-200/80 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
              <div className="space-y-1.5">
                <Eyebrow accent>Qué necesita tu atención</Eyebrow>
                <p className="text-[13px] text-neutral-500">
                  Gabriela ordena lo importante primero. Tú decides.
                </p>
              </div>
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-neutral-100 text-[13px] font-semibold tabular-nums text-neutral-600">
                {BANDEJA.length}
              </span>
            </div>

            <ul className="divide-y divide-neutral-100">
              {BANDEJA.map((item) => {
                const sev = SEV[item.severity]
                const ItemIcon = item.icon
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="group w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-neutral-50/80 transition-colors"
                    >
                      <span
                        className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                        style={{ background: sev.soft, color: sev.fg }}
                      >
                        <ItemIcon className="w-[18px] h-[18px]" weight="bold" />
                      </span>

                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 mb-1">
                          <span
                            className="inline-flex items-center h-[18px] px-1.5 rounded font-mono text-[9.5px] font-medium uppercase tracking-[0.08em]"
                            style={{ background: sev.soft, color: sev.fg }}
                          >
                            {item.tag}
                          </span>
                        </span>
                        <span className="block text-[14px] font-medium text-[#0B1220] leading-snug">
                          {item.title}
                        </span>
                        <span className="block mt-1 text-[13px] text-neutral-500 leading-relaxed">
                          {item.detail}
                        </span>
                        <span className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: BLUE }}>
                          {item.cta}
                          <CaretRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" weight="bold" />
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Equipo */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5">
            <div className="space-y-1.5 mb-4">
              <Eyebrow>El equipo</Eyebrow>
              <p className="text-[13px] text-neutral-500">
                7 especialistas detrás de cada avalúo.
              </p>
            </div>

            <ul className="space-y-1">
              {EQUIPO.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 transition-colors"
                >
                  <Monogram inicial={m.inicial} lead={m.lead} size={34} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13.5px] font-medium text-[#0B1220] truncate">{m.nombre}</span>
                      {m.lead && (
                        <Sparkle className="w-3.5 h-3.5 shrink-0" weight="fill" style={{ color: BLUE }} />
                      )}
                    </span>
                    <span className="block text-[12px] text-neutral-500 truncate">{m.rol}</span>
                  </span>
                  {m.lead && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: SEV.success.fg }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEV.success.dot }} />
                      En línea
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 5. AVALÚOS RECIENTES ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <Eyebrow>Avalúos recientes</Eyebrow>
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:opacity-80 transition-opacity"
              style={{ color: BLUE }}
            >
              Ver todos
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Column header — mono technical labels */}
          <div className="hidden sm:grid grid-cols-[1fr_110px_170px_110px_110px_90px] gap-4 px-5 py-2 border-y border-neutral-100 bg-neutral-50/60">
            {['Inmueble', 'Tipo', 'Recomendado', 'Confianza', 'Estado', 'Fecha'].map((h) => (
              <span key={h} className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400">
                {h}
              </span>
            ))}
          </div>

          <ul className="divide-y divide-neutral-100">
            {RECIENTES.map((row) => {
              const tipo = TIPO_META[row.tipo]
              const TipoIcon = tipo.icon
              return (
                <li key={row.id}>
                  <Link
                    href={`/panel/inmobiliaria/avaluos-ia/${row.id}`}
                    className="group grid grid-cols-1 sm:grid-cols-[1fr_110px_170px_110px_110px_90px] gap-2 sm:gap-4 sm:items-center px-5 py-3.5 hover:bg-neutral-50/80 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <MapPin className="w-4 h-4 text-neutral-300 shrink-0" weight="fill" />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-[#0B1220] truncate">{row.inmueble}</span>
                        <span className="block text-[12px] text-neutral-400 truncate">{row.zona}</span>
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-[13px] text-neutral-600">
                      <TipoIcon className="w-3.5 h-3.5 text-neutral-400" weight="bold" />
                      {tipo.label}
                    </span>

                    <span className="text-[13.5px] font-medium text-[#0B1220] tabular-nums">{row.recomendado}</span>

                    <span><ConfianzaChip value={row.confianza} /></span>

                    <span><EstadoChip value={row.estado} /></span>

                    <span className="flex items-center justify-between sm:justify-start gap-2">
                      <span className="text-[12px] text-neutral-400 tabular-nums">{row.fecha}</span>
                      <CaretRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" weight="bold" />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
