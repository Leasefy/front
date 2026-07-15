'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia/liquidaciones — Cierre con propietarios
 * (§16 relación con cartera/cobranza + §17 resultado para propietario).
 *
 * Después de conciliar, esto es lo que ya puede liquidarse a cada propietario:
 * canon recibido − comisión = neto a transferir, con su estado y fecha. Las
 * filas en mora/parciales muestran qué activó Gabriela (cobranza por saldo).
 *
 * Mock data inline — renders standalone for review.
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, CaretDown, PaperPlaneTilt } from '@phosphor-icons/react'

import { BrandContour, Eyebrow, StatusBadge, MonoLabel } from '@leasefy/cadence'

const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number) => COP.format(n)

type Estado = 'listo' | 'parcial' | 'mora'
const ESTADO: Record<Estado, { label: string; soft: string; fg: string }> = {
  listo: { label: 'Listo', soft: '#E9F3EE', fg: '#22663F' },
  parcial: { label: 'Pendiente saldo', soft: '#FBF3E2', fg: '#8A5A12' },
  mora: { label: 'En mora', soft: '#F8EAE7', fg: '#A33D2B' },
}

interface Liq {
  id: string
  propietario: string
  inmueble: string
  recibido: number
  comisionPct: number
  estado: Estado
  fecha: string
  nota?: string
}

const LIQUIDACIONES: Liq[] = [
  { id: 'l1', propietario: 'María Restrepo', inmueble: 'Apto 302 · Laureles', recibido: 2_300_000, comisionPct: 10, estado: 'listo', fecha: '18 jun' },
  { id: 'l2', propietario: 'Jorge Salazar', inmueble: 'Casa 14 · Envigado', recibido: 3_100_000, comisionPct: 10, estado: 'listo', fecha: '18 jun' },
  { id: 'l3', propietario: 'Ana Botero', inmueble: 'Apto 1104 · Belén', recibido: 1_850_000, comisionPct: 10, estado: 'listo', fecha: '18 jun' },
  { id: 'l4', propietario: 'Luis Mejía', inmueble: 'Apto · Sabaneta', recibido: 1_550_000, comisionPct: 10, estado: 'parcial', fecha: '—', nota: 'Pagó parcial — Gabriela activó cobranza por el saldo de $500.000.' },
  { id: 'l5', propietario: 'Carmen Ríos', inmueble: 'Local 5 · Centro', recibido: 0, comisionPct: 10, estado: 'mora', fecha: '—', nota: 'Sin pago este mes — cobranza activa desde el día 5.' },
]

const comision = (l: Liq) => Math.round((l.recibido * l.comisionPct) / 100)
const neto = (l: Liq) => l.recibido - comision(l)

export default function ConciliacionLiquidacionesPage() {
  const [open, setOpen] = React.useState<string | null>('l1')

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        <Link href="/panel/inmobiliaria/conciliacion-ia" className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-[#14130f] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Conciliación IA
        </Link>

        <div className="space-y-1">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#14130f]">Liquidaciones a propietarios</h1>
          <p className="text-[14px] text-fg-muted">Lo que ya está conciliado y listo para transferir, del cierre del 16 de junio.</p>
        </div>

        {/* Ink summary (anchor) */}
        <section className="relative overflow-hidden rounded-2xl px-6 py-6 sm:px-7" style={{ background: INK_GRADIENT, boxShadow: '0 24px 60px -28px rgba(20, 19, 15,0.5)' }}>
          <div className="pointer-events-none absolute -inset-x-2 top-[44%] h-[46%] text-white/[0.10]">
            <BrandContour />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">Listo para liquidar</span>
              <p className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-white tabular-nums leading-none">
                42 propietarios · {fmt(128_400_000)}
              </p>
              <p className="mt-1.5 text-[13px] text-white/60">Neto a transferir tras comisiones · 11 con saldo pendiente en cobranza.</p>
            </div>
            <button type="button" className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-white text-[#14130f] text-sm font-medium hover:bg-white/90 transition-colors">
              <PaperPlaneTilt className="w-4 h-4" weight="fill" />
              Generar liquidaciones
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <Eyebrow>Propietarios del cierre</Eyebrow>
          </div>

          <div className="hidden sm:grid grid-cols-[1.4fr_130px_120px_140px_130px_32px] gap-3 px-5 py-2 border-y border-border-faint bg-surface-muted/60">
            {['Propietario', 'Recibido', 'Comisión', 'Neto a transferir', 'Estado', ''].map((h, i) => (
              <MonoLabel key={i} className="text-[10px] tracking-[0.08em]">{h}</MonoLabel>
            ))}
          </div>

          <ul className="divide-y divide-border-faint">
            {LIQUIDACIONES.map((l) => {
              const est = ESTADO[l.estado]
              const isOpen = open === l.id
              const hasNet = l.estado === 'listo'
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : l.id)}
                    aria-expanded={isOpen}
                    aria-controls={`liq-${l.id}-panel`}
                    className="w-full grid grid-cols-2 sm:grid-cols-[1.4fr_130px_120px_140px_130px_32px] gap-2 sm:gap-3 sm:items-center px-5 py-3.5 text-left hover:bg-surface-muted transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-[#14130f] truncate">{l.propietario}</span>
                      <span className="block text-[12px] text-fg-subtle truncate">{l.inmueble}</span>
                    </span>
                    <span className="text-[13.5px] font-medium text-[#14130f] tabular-nums">{l.recibido > 0 ? fmt(l.recibido) : '—'}</span>
                    <span className="text-[13px] text-fg-muted tabular-nums">{hasNet ? `−${fmt(comision(l))}` : '—'}</span>
                    <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: hasNet ? '#14130f' : '#9AA3B2' }}>
                      {hasNet ? fmt(neto(l)) : '—'}
                    </span>
                    <span>
                      <StatusBadge tone={l.estado === 'listo' ? 'success' : l.estado === 'parcial' ? 'warning' : 'critical'} dot={false}>
                        {est.label}
                      </StatusBadge>
                    </span>
                    <span className="justify-self-end">
                      <CaretDown className="w-4 h-4 text-fg-subtle transition-transform" weight="bold" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                    </span>
                  </button>

                  {/* §17 breakdown */}
                  {isOpen && (
                    <div id={`liq-${l.id}-panel`} role="region" aria-label={`Desglose de ${l.propietario}`} className="px-5 pb-4 pt-1 sm:pl-5">
                      <div className="rounded-xl bg-surface-muted p-4 max-w-md">
                        {hasNet ? (
                          <dl className="space-y-2">
                            <div className="flex items-center justify-between text-[13px]">
                              <dt className="text-fg-muted">Canon recibido</dt>
                              <dd className="font-medium text-[#14130f] tabular-nums">{fmt(l.recibido)}</dd>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                              <dt className="text-fg-muted">Comisión de administración ({l.comisionPct}%)</dt>
                              <dd className="text-fg-muted tabular-nums">−{fmt(comision(l))}</dd>
                            </div>
                            <div className="flex items-center justify-between text-[14px] border-t border-border pt-2 mt-1">
                              <dt className="font-medium text-[#14130f]">Neto a transferir</dt>
                              <dd className="font-semibold tabular-nums text-[#14130f]">{fmt(neto(l))}</dd>
                            </div>
                            <p className="text-[12px] text-fg-subtle pt-1">
                              Fecha estimada {l.fecha} · contrato al día
                            </p>
                          </dl>
                        ) : (
                          <p className="text-[12.5px] leading-relaxed" style={{ color: est.fg }}>
                            {l.nota}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <p className="px-5 py-3 text-[11.5px] text-fg-subtle border-t border-border-faint">
            Vista previa — muestra de 5 de 42 propietarios listos para liquidación.
          </p>
        </section>
      </div>
    </div>
  )
}
