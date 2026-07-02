'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia — Conciliación IA home (§3).
 *
 * PROTOTYPE (proposal) of the reconciliation agent experience. The agent that
 * answers "¿qué pagos entraron y a qué obligación corresponden?": cruza banco →
 * contrato → cartera → propietario, concilia lo confiable y deja solo lo que
 * necesita decisión humana.
 *
 * Anatomy (BRAND-CONTRACT, consistent with avaluos-ia):
 *   1. Hero (ink anchor) — identidad + narrativa del día + "Conciliar movimientos".
 *   2. KPI strip — métricas operativas del día.
 *   3. Bandeja "Qué necesita tu atención" — casos por prioridad.
 *   4. Fuentes (§5) + El equipo (§18) en el rail.
 *
 * Mock data inline — renders standalone for review.
 */

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CaretRight,
  Sparkle,
  ArrowsSplit,
  Coins,
  Question,
  Copy,
  ArrowsLeftRight,
  Bank,
  LinkSimple,
  PencilSimpleLine,
  FileArrowDown,
  CheckCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Card } from '@/components/ui'
import { BrandContour, Eyebrow, KpiCard, StatusBadge } from '@leasefy/cadence'

// ── Brand constants ───────────────────────────────────────────────────────────
const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'

// Priority ramp (desaturated semantic signals, §2).
const PRIO = {
  alta: { dot: '#C4503B', soft: '#F8EAE7', fg: '#A33D2B' },
  media: { dot: '#B7791F', soft: '#FBF3E2', fg: '#8A5A12' },
  baja: { dot: '#9AA3B2', soft: '#F1F3F6', fg: '#525B6B' },
} as const
type Prioridad = keyof typeof PRIO

// ── Mock data ─────────────────────────────────────────────────────────────────
const KPIS: { label: string; value: string; sub?: string; accentSub?: boolean }[] = [
  { label: 'Pagos recibidos hoy', value: '120', sub: 'Bancolombia .360 + links' },
  { label: 'Conciliados automáticamente', value: '93', sub: '77,5% del total', accentSub: true },
  { label: 'En revisión', value: '18', sub: 'requieren tu decisión' },
  { label: 'Valor conciliado hoy', value: '$221,4 M', sub: 'de $284,7 M' },
]

interface BandejaItem {
  id: string
  prioridad: Prioridad
  icon: Icon
  title: string
  motivo: string
  cta: string
}

const BANDEJA: BandejaItem[] = [
  { id: 'b1', prioridad: 'alta', icon: ArrowsSplit, title: 'Pago de $2.300.000 — coincide con 2 contratos', motivo: 'Nicolás encontró dos contratos posibles con el mismo valor. Necesita que elijas el correcto.', cta: 'Elegir contrato' },
  { id: 'b2', prioridad: 'alta', icon: Coins, title: 'Contrato 4582 pagó $1.800.000 de $2.300.000', motivo: 'Pago parcial — quedan $500.000. Valentina puede activar cobranza por el saldo.', cta: 'Marcar pago parcial' },
  { id: 'b3', prioridad: 'media', icon: Question, title: 'Pago de $3.100.000 sin identificar', motivo: 'La referencia bancaria no coincide con ningún contrato activo en cartera.', cta: 'Buscar inquilino' },
  { id: 'b4', prioridad: 'media', icon: Copy, title: 'Posible duplicado de $2.300.000', motivo: 'Samuel detectó mismo valor y pagador con fechas cercanas. Confirma antes de aplicar.', cta: 'Revisar duplicado' },
  { id: 'b5', prioridad: 'baja', icon: ArrowsLeftRight, title: 'Pago con diferencia de $12.000', motivo: 'Posible ajuste bancario dentro del margen permitido.', cta: 'Aprobar diferencia' },
]

interface Fuente { icon: Icon; nombre: string; estado: string; meta: string; live?: boolean }
const FUENTES: Fuente[] = [
  { icon: Bank, nombre: 'Bancolombia .360', estado: 'Conectado', meta: 'Hoy 8:03 a.m.', live: true },
  { icon: LinkSimple, nombre: 'Links de pago', estado: 'Activo', meta: 'Tiempo real', live: true },
  { icon: PencilSimpleLine, nombre: 'Registro manual', estado: 'Disponible', meta: '—' },
  { icon: FileArrowDown, nombre: 'Archivo importado', estado: 'Procesado', meta: 'Ayer 6:10 p.m.' },
]

interface Miembro { inicial: string; nombre: string; rol: string; lead?: boolean }
const EQUIPO: Miembro[] = [
  { inicial: 'G', nombre: 'Gabriela', rol: 'Coordina la conciliación', lead: true },
  { inicial: 'L', nombre: 'Laura', rol: 'Lee los movimientos' },
  { inicial: 'N', nombre: 'Nicolás', rol: 'Busca coincidencias' },
  { inicial: 'V', nombre: 'Valentina', rol: 'Resuelve diferencias' },
  { inicial: 'S', nombre: 'Samuel', rol: 'Detecta anomalías' },
  { inicial: 'S', nombre: 'Sofía', rol: 'Reportes y cierre' },
]

// ── Primitives ──────────────────────────────────────────────────────────────
function Monogram({ inicial, lead = false, size = 34 }: { inicial: string; lead?: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full font-medium shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, background: lead ? BLUE : '#EEF1F6', color: lead ? '#fff' : '#3A4254' }}
    >
      {inicial}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ConciliacionIAHomePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-7">
        {/* Breadcrumb + preview */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/panel/inmobiliaria/ai" className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-[#14130f] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Agentes IA
          </Link>
          <StatusBadge tone="neutral" dot={false}>Vista previa</StatusBadge>
        </div>

        {/* ── 1. HERO (ink anchor) ──────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl px-7 py-7 sm:px-9 sm:py-8" style={{ background: INK_GRADIENT, boxShadow: '0 26px 64px -28px rgba(20, 19, 15,0.55)' }}>
          <div className="pointer-events-none absolute -inset-x-2 top-[42%] h-[46%] text-white/[0.10]">
            <BrandContour />
          </div>
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: '#8FA3FF' }} />
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">Agente · Conciliación IA</span>
              </div>
              <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-white leading-[1.12]">
                Hoy entraron 120 pagos.
              </h1>
              <p className="text-[15px] leading-relaxed text-white/70 max-w-xl">
                Concilié <span className="font-medium text-white">93 automáticamente</span>, dejé{' '}
                <span className="font-medium text-white">18 en revisión</span> y detecté{' '}
                <span className="font-medium text-white">9 casos</span> que pueden activar cobranza.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: '#5FD08A' }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#5FD08A' }} />
                </span>
                <span className="text-[13px] text-white/70">Bancolombia .360 conectado · última carga 8:03 a.m.</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link href="/panel/inmobiliaria/conciliacion-ia/procesar" className="group inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white text-[#14130f] text-sm font-medium hover:bg-white/90 transition-colors">
                  <ArrowsLeftRight className="w-4 h-4" weight="bold" />
                  Conciliar movimientos
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#bandeja" className="inline-flex items-center gap-2 h-11 px-4 rounded-lg text-sm font-medium text-white/85 hover:text-white border border-white/15 hover:border-white/30 transition-colors">
                  Revisar pendientes
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/15 text-[11px] font-semibold tabular-nums">18</span>
                </a>
              </div>
            </div>

            {/* Team cluster */}
            <div className="hidden lg:flex flex-col items-center gap-3 shrink-0 pr-2">
              <span className="inline-flex items-center justify-center rounded-2xl text-2xl font-semibold text-white" style={{ width: 76, height: 76, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>G</span>
              <div className="flex -space-x-2">
                {EQUIPO.slice(1).map((m, i) => (
                  <span key={i} className="inline-flex items-center justify-center rounded-full text-[11px] font-medium text-white/80" style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.10)', border: '1.5px solid #0E1730' }}>{m.inicial}</span>
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">Equipo de 6</span>
            </div>
          </div>
        </section>

        {/* ── 2. KPI STRIP ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((kpi) =>
            kpi.accentSub ? (
              <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.sub} deltaDirection="up" />
            ) : (
              <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} sublabel={kpi.sub} />
            )
          )}
        </section>

        {/* ── 3 + 4. BANDEJA (2/3) + FUENTES & EQUIPO (1/3) ─────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Bandeja */}
          <Card id="bandeja" className="lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
              <div className="space-y-1.5">
                <Eyebrow accent>Qué necesita tu atención</Eyebrow>
                <p className="text-[13px] text-neutral-500">Gabriela ordena los casos por prioridad. Tú decides.</p>
              </div>
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-neutral-100 text-[13px] font-semibold tabular-nums text-neutral-600">{BANDEJA.length}</span>
            </div>

            <ul className="divide-y divide-neutral-100">
              {BANDEJA.map((item) => {
                const p = PRIO[item.prioridad]
                const ItemIcon = item.icon
                return (
                  <li key={item.id}>
                    <button type="button" className="group w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-neutral-50/80 transition-colors">
                      <span className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: p.soft, color: p.fg }}>
                        <ItemIcon className="w-[18px] h-[18px]" weight="bold" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 mb-1">
                          <StatusBadge tone={item.prioridad === 'alta' ? 'critical' : item.prioridad === 'media' ? 'warning' : 'neutral'} dot={false} className="text-[9.5px]">
                            {item.prioridad}
                          </StatusBadge>
                        </span>
                        <span className="block text-[14px] font-medium text-[#14130f] leading-snug">{item.title}</span>
                        <span className="block mt-1 text-[13px] text-neutral-500 leading-relaxed">{item.motivo}</span>
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
          </Card>

          {/* Rail: Fuentes + Equipo */}
          <div className="space-y-6">
            {/* Fuentes (§5) */}
            <Card className="p-5">
              <div className="space-y-1.5 mb-4">
                <Eyebrow>Fuentes</Eyebrow>
                <p className="text-[13px] text-neutral-500">De dónde llegan los movimientos.</p>
              </div>
              <ul className="space-y-2.5">
                {FUENTES.map((f) => {
                  const FIcon = f.icon
                  return (
                    <li key={f.nombre} className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 shrink-0">
                        <FIcon className="w-4 h-4" weight="bold" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium text-[#14130f] truncate">{f.nombre}</span>
                        <span className="block text-[11.5px] text-neutral-400">{f.meta}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium shrink-0" style={{ color: f.live ? '#22663F' : '#9AA3B2' }}>
                        {f.live && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2C7A53' }} />}
                        {f.estado}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* Equipo (§18) */}
            <Card className="p-5">
              <div className="space-y-1.5 mb-4">
                <Eyebrow>El equipo</Eyebrow>
                <p className="text-[13px] text-neutral-500">6 especialistas detrás del cierre.</p>
              </div>
              <ul className="space-y-1">
                {EQUIPO.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 transition-colors">
                    <Monogram inicial={m.inicial} lead={m.lead} size={34} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-medium text-[#14130f] truncate">{m.nombre}</span>
                        {m.lead && <Sparkle className="w-3.5 h-3.5 shrink-0" weight="fill" style={{ color: BLUE }} />}
                      </span>
                      <span className="block text-[12px] text-neutral-500 truncate">{m.rol}</span>
                    </span>
                    {m.lead && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: '#22663F' }}>
                        <CheckCircle className="w-3.5 h-3.5" weight="fill" />
                        Activo
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
