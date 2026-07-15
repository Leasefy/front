'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia/excepcion — Revisión de excepción (§11)
 * + vista individual de 3 columnas (§13) + motor de coincidencia (§8) +
 * niveles de confianza (§9).
 *
 * El corazón operativo: un movimiento bancario que el motor no pudo conciliar
 * solo. Tres columnas:
 *   IZQUIERDA  — el movimiento bancario crudo.
 *   CENTRO     — posibles coincidencias con sus razones de match (selectables).
 *   DERECHA    — recomendación de la IA: contrato + confianza + motivos +
 *                riesgos + acciones (Conciliar / Editar / Parcial / Revisión).
 *
 * Mock data inline — caso "Juan P." $2.300.000 con coincidencias múltiples.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  CaretRight,
  Sparkle,
  WarningCircle,
  ShieldCheck,
  Bank,
  CalendarBlank,
  Hash,
  User,
  FileArrowDown,
  PencilSimple,
  Coins,
  ClockCounterClockwise,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Button, Card } from '@/components/ui'
import { Eyebrow, StatusBadge, MonoLabel } from '@leasefy/cadence'

const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number) => COP.format(n)

// ── Niveles de confianza (§9) ───────────────────────────────────────────────
function band(c: number) {
  if (c >= 90) return { label: 'Alta', fg: '#22663F', soft: '#E9F3EE', dot: '#2C7A53', accion: 'Conciliar automáticamente' }
  if (c >= 70) return { label: 'Media', fg: '#8A5A12', soft: '#FBF3E2', dot: '#B7791F', accion: 'Sugerir y pedir confirmación' }
  return { label: 'Baja', fg: '#525B6B', soft: '#F1F3F6', dot: '#9AA3B2', accion: 'Dejar en revisión' }
}

/** Una razón "en contra" se pinta con advertencia ámbar (no check verde). */
function isNegativa(r: string) {
  return r.includes('no coincide') || r.startsWith('Valor cercano')
}

// ── Movimiento bancario (izquierda) ─────────────────────────────────────────
const MOV: { icon: Icon; label: string; value: string; mono?: boolean }[] = [
  { icon: CalendarBlank, label: 'Fecha', value: '16 jun 2026' },
  { icon: Bank, label: 'Banco', value: 'Bancolombia · Ahorros ***4821' },
  { icon: Hash, label: 'Referencia', value: '845921', mono: true },
  { icon: User, label: 'Pagador', value: 'JUAN P.' },
  { icon: FileArrowDown, label: 'Fuente', value: 'Archivo .360' },
]

// ── Coincidencias (centro) — motor de match §8 ──────────────────────────────
interface Candidato {
  id: string
  contrato: string
  inquilino: string
  inmueble: string
  canon: number
  confianza: number
  razones: string[]
  riesgo: string
}
const CANDIDATOS: Candidato[] = [
  {
    id: 'c4582', contrato: '4582', inquilino: 'Juan Pérez', inmueble: 'Apto 302 · Laureles', canon: 2_300_000, confianza: 96,
    razones: ['Valor exacto del canon', 'Fecha dentro del periodo esperado', 'Referencia coincide con el documento del inquilino', 'Nombre del pagador similar', 'Contrato activo', 'Ningún otro contrato con el mismo valor y referencia'],
    riesgo: 'Hay 2 contratos con nombre parecido (“Juan”). Verifica que el pago sea de Juan Pérez y no de Juan Pablo Ríos.',
  },
  {
    id: 'c3120', contrato: '3120', inquilino: 'Juan Pablo Ríos', inmueble: 'Apto 1104 · Belén', canon: 2_250_000, confianza: 74,
    razones: ['Nombre del pagador similar', 'Valor cercano (diferencia de $50.000)', 'Contrato activo'],
    riesgo: 'El pago excede el canon en $50.000. Confirma si es el contrato correcto o un pago con saldo a favor.',
  },
  {
    id: 'c5009', contrato: '5009', inquilino: 'Juan Camilo Mesa', inmueble: 'Local 5 · Centro', canon: 2_300_000, confianza: 61,
    razones: ['Referencia histórica similar', 'Valor exacto, pero el pagador no coincide'],
    riesgo: 'El pagador del movimiento no coincide con el inquilino de este contrato. Probablemente no es su pago.',
  },
]

// Historial del contrato seleccionado (refuerza la recomendación).
const HISTORIAL: Record<string, { mes: string; valor: number; estado: string }[]> = {
  c4582: [
    { mes: 'Mayo 2026', valor: 2_300_000, estado: 'A tiempo' },
    { mes: 'Abril 2026', valor: 2_300_000, estado: 'A tiempo' },
    { mes: 'Marzo 2026', valor: 2_300_000, estado: 'A tiempo' },
  ],
  c3120: [
    { mes: 'Mayo 2026', valor: 2_250_000, estado: 'A tiempo' },
    { mes: 'Abril 2026', valor: 2_250_000, estado: '3 días tarde' },
  ],
  c5009: [
    { mes: 'Mayo 2026', valor: 2_300_000, estado: 'A tiempo' },
  ],
}

const VALOR_MOV = 2_300_000

export default function ConciliacionExcepcionPage() {
  const [sel, setSel] = React.useState('c4582')
  const [conciliado, setConciliado] = React.useState(false)

  const reco = CANDIDATOS[0] // el candidato recomendado por el motor (mayor confianza)
  const candidato = CANDIDATOS.find((c) => c.id === sel)!
  const isReco = sel === reco.id
  const b = band(candidato.confianza)
  const historial = HISTORIAL[sel] ?? []
  const difValor = VALOR_MOV - candidato.canon

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/panel/inmobiliaria/conciliacion-ia" className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-[#14130f] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Conciliación IA
          </Link>
          <StatusBadge tone="warning">Coincidencia múltiple</StatusBadge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-fg-subtle" weight="fill" />
            <MonoLabel className="tracking-[0.08em]">Revisión de excepción</MonoLabel>
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#14130f]">
            Pago de {fmt(VALOR_MOV)} sin identificar
          </h1>
          <p className="text-[13px] text-fg-muted">Nicolás encontró 3 contratos posibles. Necesita que confirmes el correcto.</p>
        </div>

        {/* ── 3 columnas ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] gap-6 items-start">
          {/* ── IZQUIERDA: movimiento bancario ───────────────────────────── */}
          <Card className="p-5 lg:sticky lg:top-6">
            <Eyebrow>Movimiento bancario</Eyebrow>
            <div className="mt-4 mb-4">
              <p className="text-[26px] font-semibold tracking-[-0.01em] text-[#14130f] tabular-nums leading-none">{fmt(VALOR_MOV)}</p>
              <p className="mt-1.5 text-[12.5px] text-fg-muted">“TRANSFERENCIA JUAN P.”</p>
            </div>
            <dl className="space-y-3 border-t border-border-faint pt-4">
              {MOV.map((m) => {
                const MIcon = m.icon
                return (
                  <div key={m.label} className="flex items-center gap-2.5">
                    <MIcon className="w-4 h-4 text-fg-subtle shrink-0" weight="bold" />
                    <dt className="text-[12.5px] text-fg-muted w-[72px] shrink-0">{m.label}</dt>
                    <dd className={`text-[12.5px] font-medium text-[#14130f] min-w-0 truncate ${m.mono ? 'font-mono' : ''}`}>{m.value}</dd>
                  </div>
                )
              })}
            </dl>
          </Card>

          {/* ── CENTRO: posibles coincidencias ───────────────────────────── */}
          <section className="space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <Eyebrow>Posibles coincidencias</Eyebrow>
                <p className="mt-1.5 text-[13px] text-fg-muted">Ordenadas por confianza del motor de Nicolás.</p>
              </div>
            </div>

            <ul className="space-y-3">
              {CANDIDATOS.map((c) => {
                const cb = band(c.confianza)
                const isSel = c.id === sel
                const isReco = c.id === CANDIDATOS[0].id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSel(c.id)}
                      aria-pressed={isSel}
                      className="w-full rounded-xl border bg-surface p-4 text-left transition-all"
                      style={{ borderColor: isSel ? BLUE : 'rgba(0,0,0,0.10)', boxShadow: isSel ? `0 0 0 1px ${BLUE}` : 'none' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-fg-subtle">#{c.contrato}</span>
                            <span className="text-[14px] font-medium text-[#14130f] truncate">{c.inquilino}</span>
                            {isReco && (
                              <StatusBadge tone="neutral" dot={false} className="text-[9px]">
                                <Sparkle className="w-2.5 h-2.5" weight="fill" />
                                Recomendado
                              </StatusBadge>
                            )}
                          </div>
                          <p className="text-[12.5px] text-fg-muted mt-0.5">{c.inmueble} · canon {fmt(c.canon)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[12px] font-medium tabular-nums" style={{ background: cb.soft, color: cb.fg }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cb.dot }} />
                            {c.confianza}%
                          </span>
                          {isSel && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: BLUE }}>
                              <Check className="w-3 h-3 text-white" weight="bold" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Razones del match — solo en el seleccionado */}
                      {isSel && (
                        <ul className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border-faint pt-3.5">
                          {c.razones.map((r, i) => {
                            const negativa = isNegativa(r)
                            return (
                              <li key={i} className="flex items-start gap-1.5">
                                {negativa ? (
                                  <WarningCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" weight="fill" style={{ color: '#B7791F' }} />
                                ) : (
                                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" weight="bold" style={{ color: '#2C7A53' }} />
                                )}
                                <span className="text-[12.5px] text-fg-muted leading-snug">{r}</span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Historial del contrato seleccionado */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClockCounterClockwise className="w-4 h-4 text-fg-subtle" weight="bold" />
                <MonoLabel className="text-[10.5px] tracking-[0.08em]">Historial del contrato #{candidato.contrato}</MonoLabel>
              </div>
              <ul className="divide-y divide-border-faint">
                {historial.map((h, i) => {
                  const aTiempo = h.estado === 'A tiempo'
                  return (
                    <li key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <span className="text-[13px] text-[#14130f]">{h.mes}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-[13px] font-medium text-[#14130f] tabular-nums">{fmt(h.valor)}</span>
                        <span className="text-[11.5px] font-medium" style={{ color: aTiempo ? '#22663F' : '#8A5A12' }}>{h.estado}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </section>

          {/* ── DERECHA: recomendación IA ────────────────────────────────── */}
          <aside className="lg:sticky lg:top-6">
            <section className="rounded-2xl border-2 bg-surface overflow-hidden" style={{ borderColor: conciliado ? '#CBE3D5' : BLUE }}>
              {!conciliado ? (
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-1.5">
                    <Sparkle className="w-3.5 h-3.5" weight="fill" style={{ color: isReco ? BLUE : '#9AA3B2' }} />
                    <MonoLabel className="text-[10.5px] tracking-[0.08em]" style={{ color: isReco ? BLUE : '#9AA3B2' }}>
                      {isReco ? 'Recomendación de Gabriela' : 'Candidato seleccionado'}
                    </MonoLabel>
                  </div>

                  <div>
                    <p className="text-[13px] text-fg-muted">{isReco ? 'Conciliar con' : 'Estás viendo'}</p>
                    <p className="text-[17px] font-semibold text-[#14130f] leading-tight">Contrato #{candidato.contrato}</p>
                    <p className="text-[13px] text-fg-muted">{candidato.inquilino} · {candidato.inmueble}</p>
                    {!isReco && (
                      <Button
                        type="button"
                        variant="link"
                        hideArrow
                        onClick={() => setSel(reco.id)}
                        className="mt-2 h-auto p-0 gap-1 text-[12px] font-medium text-primary"
                      >
                        Gabriela recomienda el #{reco.contrato} ({reco.confianza}%)
                        <CaretRight className="w-3 h-3" weight="bold" />
                      </Button>
                    )}
                  </div>

                  {/* Confidence meter (§9) */}
                  <div className="rounded-lg p-3" style={{ background: b.soft }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: b.fg }}>
                        <ShieldCheck className="w-4 h-4" weight="fill" />
                        Confianza {b.label}
                      </span>
                      <span className="text-[15px] font-semibold tabular-nums" style={{ color: b.fg }}>{candidato.confianza}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${candidato.confianza}%`, background: b.dot }} />
                    </div>
                    <p className="mt-2 text-[11.5px]" style={{ color: b.fg }}>{b.accion}</p>
                  </div>

                  {/* Motivos */}
                  <div>
                    <p className="text-[12px] font-medium text-fg-muted mb-1.5">Por qué</p>
                    <ul className="space-y-1.5">
                      {candidato.razones.slice(0, 3).map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          {isNegativa(r) ? (
                            <WarningCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" weight="fill" style={{ color: '#B7791F' }} />
                          ) : (
                            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" weight="bold" style={{ color: '#2C7A53' }} />
                          )}
                          <span className="text-[12.5px] text-fg-muted leading-snug">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Riesgo */}
                  <div className="flex items-start gap-2 rounded-lg p-3 text-[12px] leading-snug" style={{ background: '#FBF3E2', color: '#8A5A12' }}>
                    <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" weight="fill" />
                    <span>{candidato.riesgo}</span>
                  </div>

                  {difValor !== 0 && (
                    <p className="text-[12px] text-fg-muted">
                      Diferencia con el canon: <span className="font-medium tabular-nums" style={{ color: '#8A5A12' }}>{difValor > 0 ? '+' : ''}{fmt(difValor)}</span>
                    </p>
                  )}

                  {/* Acciones (§13) */}
                  <div className="space-y-2 pt-1">
                    <Button type="button" hideArrow onClick={() => setConciliado(true)} className="w-full">
                      <Check className="w-4 h-4" weight="bold" />
                      Conciliar con #{candidato.contrato}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" hideArrow className="w-full">
                        <PencilSimple className="w-3.5 h-3.5 text-fg-muted" weight="bold" />
                        Editar
                      </Button>
                      <Button type="button" variant="outline" hideArrow className="w-full">
                        <Coins className="w-3.5 h-3.5 text-fg-muted" weight="bold" />
                        Parcial
                      </Button>
                    </div>
                    <Button type="button" variant="ghost" hideArrow className="w-full">
                      Dejar en revisión
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle className="w-10 h-10 mx-auto" weight="fill" style={{ color: '#2C7A53' }} />
                  <p className="text-[15px] font-semibold text-[#14130f]">Pago conciliado</p>
                  <p className="text-[12.5px] text-fg-muted leading-relaxed">
                    {fmt(VALOR_MOV)} aplicado al contrato #{candidato.contrato} ({candidato.inquilino}). Actualicé la cartera y cerré la excepción.
                  </p>
                  <Link href="/panel/inmobiliaria/conciliacion-ia" className="inline-flex items-center gap-1.5 mt-1 text-[13px] font-medium" style={{ color: BLUE }}>
                    Volver a la bandeja
                    <CaretRight className="w-3.5 h-3.5" weight="bold" />
                  </Link>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
