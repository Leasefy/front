'use client'

/**
 * /panel/inmobiliaria/avaluos-ia/nuevo — Nuevo avalúo flow (§4) + processing (§6).
 *
 * Three steps, then the processing moment:
 *   1. ¿Qué quieres avaluar?  → tipo (arriendo / venta / mixto)
 *   2. Selecciona el inmueble → portfolio list (o uno nuevo)
 *   3. Datos mínimos          → confirm/complete + data-quality meter (§5)
 *   →  Procesando             → the AI team working (Nicolás → Laura →
 *                               Valentina → Samuel → Sofía) → result.
 *
 * All in-page state, mock data — renders standalone for review.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  CircleNotch,
  Sparkle,
  House,
  Storefront,
  ArrowsLeftRight,
  MagnifyingGlass,
  MapPin,
  Plus,
  Info,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandContour } from '@leasefy/ui'

// ── Brand constants ───────────────────────────────────────────────────────────
const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #0B1220 56%, #122457 140%)'

type Phase = 'tipo' | 'inmueble' | 'datos' | 'procesando'
type Tipo = 'arriendo' | 'venta' | 'mixto'

const STEPS: { key: Phase; label: string }[] = [
  { key: 'tipo', label: 'Tipo' },
  { key: 'inmueble', label: 'Inmueble' },
  { key: 'datos', label: 'Datos' },
]

const TIPOS: { key: Tipo; icon: Icon; title: string; desc: string }[] = [
  { key: 'arriendo', icon: House, title: 'Arriendo', desc: '¿Cuánto cobrar de canon mensual?' },
  { key: 'venta', icon: Storefront, title: 'Venta', desc: '¿En cuánto venderlo hoy?' },
  { key: 'mixto', icon: ArrowsLeftRight, title: 'Mixto', desc: 'Canon y precio de venta a la vez.' },
]

interface Propiedad {
  id: string
  dir: string
  zona: string
  specs: string
  estrato: number
  estado: 'Disponible' | 'Ocupado'
}

const PROPIEDADES: Propiedad[] = [
  { id: 'p1', dir: 'Cra. 43 #5-20', zona: 'El Poblado', specs: '78 m² · 2 hab · 2 baños', estrato: 6, estado: 'Disponible' },
  { id: 'p2', dir: 'Cl. 7 #39-20', zona: 'Provenza', specs: '120 m² · 3 hab · 3 baños', estrato: 6, estado: 'Ocupado' },
  { id: 'p3', dir: 'Apto 1201', zona: 'Ciudad del Río', specs: '65 m² · 2 hab · 2 baños', estrato: 5, estado: 'Disponible' },
  { id: 'p4', dir: 'Casa 14', zona: 'Envigado', specs: '210 m² · 4 hab · 4 baños', estrato: 5, estado: 'Disponible' },
]

const TEAM_STEPS: { inicial: string; nombre: string; tarea: string }[] = [
  { inicial: 'N', nombre: 'Nicolás', tarea: 'Leyendo la ficha del inmueble' },
  { inicial: 'L', nombre: 'Laura', tarea: 'Buscando comparables en El Poblado' },
  { inicial: 'V', nombre: 'Valentina', tarea: 'Analizando tendencias de la zona' },
  { inicial: 'S', nombre: 'Samuel', tarea: 'Calculando precio y estrategia' },
  { inicial: 'S', nombre: 'Sofía', tarea: 'Preparando el reporte para el propietario' },
]

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({ phase }: { phase: Phase }) {
  const activeIdx = STEPS.findIndex((s) => s.key === phase)
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < activeIdx
        const active = i === activeIdx
        return (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold transition-colors"
                style={{
                  background: done ? BLUE : active ? '#0B1220' : '#F1F3F6',
                  color: done || active ? '#fff' : '#9AA3B2',
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" weight="bold" /> : i + 1}
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: active ? '#0B1220' : done ? '#525B6B' : '#9AA3B2' }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="w-8 h-px bg-neutral-200" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function NuevoAvaluoPage() {
  const [phase, setPhase] = React.useState<Phase>('tipo')
  const [tipo, setTipo] = React.useState<Tipo | null>(null)
  const [inmueble, setInmueble] = React.useState<string | null>(null)
  const [expectativa, setExpectativa] = React.useState('')

  const selProp = PROPIEDADES.find((p) => p.id === inmueble)
  const canContinue =
    (phase === 'tipo' && tipo) || (phase === 'inmueble' && inmueble) || phase === 'datos'

  const next = () => {
    if (phase === 'tipo') setPhase('inmueble')
    else if (phase === 'inmueble') setPhase('datos')
    else if (phase === 'datos') setPhase('procesando')
  }
  const back = () => {
    if (phase === 'inmueble') setPhase('tipo')
    else if (phase === 'datos') setPhase('inmueble')
  }

  // ── Processing moment ──────────────────────────────────────────────────────
  if (phase === 'procesando') {
    return <Procesando />
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[760px] space-y-7">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/panel/inmobiliaria/avaluos-ia"
            className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-[#0B1220] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Avalúos IA
          </Link>
          <Stepper phase={phase} />
        </div>

        {/* ── Step 1: Tipo ──────────────────────────────────────────────── */}
        {phase === 'tipo' && (
          <section className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                ¿Qué quieres avaluar?
              </h1>
              <p className="text-[14px] text-neutral-500">
                Gabriela ajusta el análisis según lo que necesites decidir.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIPOS.map((tp) => {
                const TIcon = tp.icon
                const isSel = tipo === tp.key
                return (
                  <button
                    key={tp.key}
                    type="button"
                    onClick={() => setTipo(tp.key)}
                    aria-pressed={isSel}
                    className="relative rounded-xl border bg-white p-5 text-left transition-all active:scale-[0.99]"
                    style={{ borderColor: isSel ? BLUE : 'rgba(0,0,0,0.10)', boxShadow: isSel ? `0 0 0 1px ${BLUE}` : 'none' }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3"
                      style={{ background: isSel ? '#EAEEFF' : '#F1F3F6', color: isSel ? BLUE : '#525B6B' }}
                    >
                      <TIcon className="w-5 h-5" weight="duotone" />
                    </span>
                    <p className="text-[15px] font-semibold text-[#0B1220]">{tp.title}</p>
                    <p className="mt-1 text-[12.5px] text-neutral-500 leading-snug">{tp.desc}</p>
                    {isSel && (
                      <span className="absolute top-3.5 right-3.5 inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: BLUE }}>
                        <Check className="w-3 h-3 text-white" weight="bold" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Step 2: Inmueble ──────────────────────────────────────────── */}
        {phase === 'inmueble' && (
          <section className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                Selecciona el inmueble
              </h1>
              <p className="text-[14px] text-neutral-500">
                Desde tu portafolio — Nicolás trae sus datos automáticamente.
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por dirección o zona…"
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-neutral-200 bg-white text-[14px] text-[#0B1220] placeholder:text-neutral-400 focus:outline-none focus:border-[#1A40FF] focus:ring-1 focus:ring-[#1A40FF]"
              />
            </div>

            <ul className="space-y-2">
              {PROPIEDADES.map((p) => {
                const isSel = inmueble === p.id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setInmueble(p.id)}
                      aria-pressed={isSel}
                      className="w-full flex items-center gap-4 rounded-xl border bg-white p-3.5 text-left transition-all"
                      style={{ borderColor: isSel ? BLUE : 'rgba(0,0,0,0.10)', boxShadow: isSel ? `0 0 0 1px ${BLUE}` : 'none' }}
                    >
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/70 shrink-0">
                        <House className="w-5 h-5 text-neutral-400" weight="duotone" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-[#0B1220] truncate">{p.dir}</span>
                          <span className="text-[12px] text-neutral-400">· {p.zona}</span>
                        </span>
                        <span className="block text-[12.5px] text-neutral-500 mt-0.5">{p.specs} · Estrato {p.estrato}</span>
                      </span>
                      <span
                        className="inline-flex items-center h-6 px-2 rounded-md text-[11.5px] font-medium shrink-0"
                        style={p.estado === 'Disponible'
                          ? { background: '#E9F3EE', color: '#22663F' }
                          : { background: '#F1F3F6', color: '#525B6B' }}
                      >
                        {p.estado}
                      </span>
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                        style={{ border: isSel ? `none` : '1.5px solid #D4D8DF', background: isSel ? BLUE : 'transparent' }}
                      >
                        {isSel && <Check className="w-3 h-3 text-white" weight="bold" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-dashed border-neutral-300 text-[13.5px] font-medium text-neutral-500 hover:text-[#0B1220] hover:border-neutral-400 transition-colors"
            >
              <Plus className="w-4 h-4" weight="bold" />
              Avaluar un inmueble que no está en mi portafolio
            </button>
          </section>
        )}

        {/* ── Step 3: Datos mínimos ─────────────────────────────────────── */}
        {phase === 'datos' && selProp && (
          <section className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                Confirma los datos
              </h1>
              <p className="text-[14px] text-neutral-500">
                Mientras más completos, más preciso es el avalúo.
              </p>
            </div>

            {/* Selected property summary */}
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3.5">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-neutral-200 shrink-0">
                <MapPin className="w-4 h-4 text-neutral-400" weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#0B1220] truncate">{selProp.dir} · {selProp.zona}</p>
                <p className="text-[12.5px] text-neutral-500">{selProp.specs} · Estrato {selProp.estrato}</p>
              </div>
            </div>

            {/* Data quality meter */}
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400">
                  Calidad de datos
                </span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#8A5A12' }}>85%</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '85%', background: '#B7791F' }} />
              </div>
              <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] text-neutral-500 leading-snug">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-400" weight="fill" />
                Agrega la <span className="font-medium text-[#0B1220]">antigüedad</span> del inmueble para subir la precisión a ~95%.
              </p>
            </div>

            {/* Optional: owner expectation */}
            <div>
              <label className="block text-[13px] font-medium text-[#0B1220] mb-1.5">
                Expectativa del propietario <span className="text-neutral-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-neutral-400">$</span>
                <input
                  value={expectativa}
                  onChange={(e) => setExpectativa(e.target.value)}
                  inputMode="numeric"
                  placeholder="4.200.000"
                  className="w-full h-11 pl-7 pr-4 rounded-lg border border-neutral-200 bg-white text-[14px] text-[#0B1220] placeholder:text-neutral-300 focus:outline-none focus:border-[#1A40FF] focus:ring-1 focus:ring-[#1A40FF] tabular-nums"
                />
              </div>
              <p className="mt-1.5 text-[12px] text-neutral-400">
                Gabriela compara su recomendación con lo que espera el propietario.
              </p>
            </div>
          </section>
        )}

        {/* ── Footer nav ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {phase !== 'tipo' ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-lg text-[14px] font-medium text-neutral-600 hover:text-[#0B1220] hover:bg-neutral-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={next}
            disabled={!canContinue}
            className="group inline-flex items-center gap-2 h-11 px-5 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: BLUE }}
          >
            {phase === 'datos' ? (
              <>
                <Sparkle className="w-4 h-4" weight="fill" />
                Generar avalúo
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Processing moment (§6 + §19 wow) ───────────────────────────────────────────
function Procesando() {
  // Static believable mid-progress: first two done, Valentina active, rest pending.
  const ACTIVE = 2
  const progress = 58

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[560px]">
        {/* Gabriela hero */}
        <section
          className="relative overflow-hidden rounded-2xl px-7 py-8 text-center"
          style={{ background: INK_GRADIENT, boxShadow: '0 26px 64px -28px rgba(11,18,32,0.55)' }}
        >
          <div className="pointer-events-none absolute -inset-x-2 top-[58%] h-[40%] text-white/[0.10]">
            <BrandContour />
          </div>

          <div className="relative flex flex-col items-center gap-4">
            <span className="relative inline-flex items-center justify-center">
              <span className="absolute inline-flex h-[76px] w-[76px] rounded-2xl opacity-30 animate-ping" style={{ background: BLUE }} />
              <span
                className="relative inline-flex items-center justify-center rounded-2xl text-2xl font-semibold text-white"
                style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                G
              </span>
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkle className="w-3.5 h-3.5" weight="fill" style={{ color: '#8FA3FF' }} />
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">
                  Avaluando
                </span>
              </div>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
                Gabriela está avaluando tu inmueble
              </h1>
              <p className="text-[13.5px] text-white/60">
                Cra. 43 #5-20 · El Poblado · normalmente toma menos de 3 minutos
              </p>
            </div>

            {/* progress */}
            <div className="w-full max-w-sm mt-1">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: BLUE }} />
              </div>
            </div>
          </div>
        </section>

        {/* Team checklist */}
        <ul className="mt-6 rounded-2xl border border-neutral-200/80 bg-white divide-y divide-neutral-100 overflow-hidden">
          {TEAM_STEPS.map((m, i) => {
            const done = i < ACTIVE
            const active = i === ACTIVE
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[12px] font-medium shrink-0"
                  style={{
                    background: done ? '#E9F3EE' : active ? '#EAEEFF' : '#F1F3F6',
                    color: done ? '#22663F' : active ? BLUE : '#9AA3B2',
                  }}
                >
                  {m.inicial}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-medium text-[#0B1220]">{m.nombre}</span>
                  <span className="block text-[12.5px] text-neutral-500 truncate">{m.tarea}</span>
                </span>
                {done ? (
                  <CheckCircle className="w-5 h-5 shrink-0" weight="fill" style={{ color: '#2C7A53' }} />
                ) : active ? (
                  <CircleNotch className="w-5 h-5 shrink-0 animate-spin" style={{ color: BLUE }} weight="bold" />
                ) : (
                  <span className="w-5 h-5 shrink-0 rounded-full border-2 border-neutral-200" />
                )}
              </li>
            )
          })}
        </ul>

        {/* Result CTA (prototype: always available) */}
        <Link
          href="/panel/inmobiliaria/avaluos-ia/r1"
          className="group mt-6 w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ background: BLUE }}
        >
          Ver resultado
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
