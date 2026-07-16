'use client'

import { useRef } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { useSectionScroll } from '@/components/landing/motion/useSectionScroll'

interface EquationItem {
  label: string
  /** Scroll-progress range over which this row's checkmark settles in. */
  range: [number, number]
}

// Mirrors the standalone's staggered `--dd` cascade (0.20s .. 0.60s) —
// translated to scroll-progress ranges instead of time delays, since this
// section is scroll-scrubbed, not time-based.
const EQUATION_ITEMS: EquationItem[] = [
  { label: 'Cobros y recordatorios automáticos', range: [0.15, 0.3] },
  { label: 'La mora se persigue sola', range: [0.25, 0.4] },
  { label: 'Cada pago cuadrado contra el banco', range: [0.35, 0.5] },
  { label: 'Pagos a propietarios programados', range: [0.45, 0.6] },
  { label: 'Comisiones calculadas solas', range: [0.55, 0.7] },
]

const TOTAL_RANGE: [number, number] = [0.7, 0.9]

/**
 * Home's financial-operation beat, ported from the standalone's
 * `#finanzas` section: a checklist that "adds up" to a settled month-end
 * close. Each row's checkmark opacity is scroll-scrubbed via
 * `useSectionScroll`'s `scrollYProgress`; reduced-motion freezes progress
 * at 1, so every row (and the total) renders fully settled immediately —
 * content is never hidden mid-scroll for those users.
 */
export function FinanceEquation() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useSectionScroll(sectionRef)

  return (
    <section ref={sectionRef} className="landing-finance" data-testid="finance-equation">
      <div className="landing-finance__copy">
        <p className="landing-finance__eyebrow">Operación financiera</p>
        <h2>Controla cobros, cartera y pagos a propietarios</h2>
        <p className="landing-finance__lead">
          El ERP de Leasefy convierte la parte más pesada del arriendo, el dinero, en una
          operación ordenada, trazable y sin sorpresas al cierre de mes.
        </p>

        <div className="landing-finance__equation">
          <p className="landing-finance__equation-label">Qué resuelve</p>
          {EQUATION_ITEMS.map((item) => (
            <EquationRow key={item.label} label={item.label} range={item.range} scrollYProgress={scrollYProgress} />
          ))}
          <EquationTotal scrollYProgress={scrollYProgress} />
        </div>
      </div>

      <div className="landing-finance__panel" data-testid="finance-equation-panel">
        <div className="landing-finance__panel-header">
          <span>CARTERA · JULIO 2026</span>
          <span>ACTUALIZADO HOY</span>
        </div>
        <dl className="landing-finance__kpis">
          <div>
            <dt>Pagos recibidos</dt>
            <dd>$184,2M</dd>
            <span>46 contratos</span>
          </div>
          <div>
            <dt>Pendientes</dt>
            <dd>$12,8M</dd>
            <span>7 contratos</span>
          </div>
          <div>
            <dt>En mora</dt>
            <dd>$4,1M</dd>
            <span>3 casos</span>
          </div>
        </dl>
      </div>
    </section>
  )
}

interface EquationRowProps {
  label: string
  range: [number, number]
  scrollYProgress: MotionValue<number>
}

function EquationRow({ label, range, scrollYProgress }: EquationRowProps) {
  const opacity = useTransform(scrollYProgress, range, [0, 1])
  return (
    <motion.div className="landing-finance__row" data-testid="finance-equation-item" style={{ opacity }}>
      <span className="landing-finance__check" aria-hidden="true" />
      <span>{label}</span>
    </motion.div>
  )
}

function EquationTotal({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const opacity = useTransform(scrollYProgress, TOTAL_RANGE, [0, 1])
  return (
    <motion.div className="landing-finance__total" data-testid="finance-equation-total" style={{ opacity }}>
      <i>=</i>
      <span>Cierre de mes sin sorpresas</span>
    </motion.div>
  )
}
