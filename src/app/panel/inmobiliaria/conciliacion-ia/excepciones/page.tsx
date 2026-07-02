'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia/excepciones — Excepciones por tipo (§10).
 *
 * La bandeja de revisión agrupada por TIPO de problema (no una tabla gigante),
 * para resolver lo similar de una vez. Cada tipo abre la vista de excepción.
 *
 * Mock data inline — renders standalone for review.
 */

import Link from 'next/link'
import {
  ArrowLeft,
  CaretRight,
  Question,
  Coins,
  ArrowsSplit,
  Copy,
  TrendUp,
  MagnifyingGlass,
  ArrowsLeftRight,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

const BLUE = '#1A40FF'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number) => COP.format(n)

const TONE = {
  neutral: { soft: '#F1F3F6', fg: '#525B6B' },
  warning: { soft: '#FBF3E2', fg: '#8A5A12' },
  danger: { soft: '#F8EAE7', fg: '#A33D2B' },
} as const

interface Tipo {
  icon: Icon
  nombre: string
  count: number
  valor: number
  desc: string
  tone: keyof typeof TONE
}

const TIPOS: Tipo[] = [
  { icon: Question, nombre: 'Pago sin identificar', count: 7, valor: 10_600_000, desc: 'Entró dinero sin un contrato asociado.', tone: 'neutral' },
  { icon: Coins, nombre: 'Pago parcial', count: 4, valor: 7_200_000, desc: 'El inquilino pagó menos del canon esperado.', tone: 'warning' },
  { icon: ArrowsSplit, nombre: 'Coincidencias múltiples', count: 3, valor: 6_900_000, desc: 'Un pago calza con más de un contrato posible.', tone: 'warning' },
  { icon: Copy, nombre: 'Posible duplicado', count: 2, valor: 4_500_000, desc: 'Mismo valor y pagador, con fechas cercanas.', tone: 'danger' },
  { icon: TrendUp, nombre: 'Pago de más', count: 1, valor: 2_800_000, desc: 'El inquilino pagó por encima del canon.', tone: 'warning' },
  { icon: MagnifyingGlass, nombre: 'Reportado, no encontrado', count: 1, valor: 1_900_000, desc: 'El inquilino dice que pagó; no aparece en el banco.', tone: 'neutral' },
  { icon: ArrowsLeftRight, nombre: 'Diferencia menor', count: 2, valor: 24_000, desc: 'Diferencia pequeña, posible ajuste bancario.', tone: 'neutral' },
]

const TOTAL_CASOS = TIPOS.reduce((s, t) => s + t.count, 0)

export default function ConciliacionExcepcionesPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        <Link href="/panel/inmobiliaria/conciliacion-ia" className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-[#14130f] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Conciliación IA
        </Link>

        <div className="space-y-1">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#14130f]">Excepciones por tipo</h1>
          <p className="text-[14px] text-neutral-500">
            {TOTAL_CASOS} movimientos en revisión, agrupados por problema para que resuelvas lo similar de una vez.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIPOS.map((t) => {
            const TIcon = t.icon
            const tone = TONE[t.tone]
            return (
              <Link
                key={t.nombre}
                href="/panel/inmobiliaria/conciliacion-ia/excepcion"
                className="group rounded-2xl border border-neutral-200/80 bg-white p-5 transition-colors hover:border-neutral-300"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ background: tone.soft, color: tone.fg }}>
                    <TIcon className="w-5 h-5" weight="bold" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14.5px] font-semibold text-[#14130f]">{t.nombre}</span>
                      <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-neutral-100 text-[12.5px] font-semibold tabular-nums text-neutral-600 shrink-0">
                        {t.count}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-neutral-500 leading-snug">{t.desc}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-neutral-400 tabular-nums">{fmt(t.valor)}</span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: BLUE }}>
                        Revisar
                        <CaretRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" weight="bold" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
