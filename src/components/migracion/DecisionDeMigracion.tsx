'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FeatureAnnouncement } from '@leasefy/cadence'
import type { DecisionDeMigracion } from '@/lib/migracion/decision-de-migracion'

/**
 * «¿Migramos tu inmobiliaria?» — la pregunta previa al muro de migración.
 *
 * Mismo cuerpo que el modal de «nueva función» (`AgentIntroModal`, con el
 * `FeatureAnnouncement` de cadence), porque Nico pidió exactamente ese modal
 * (2026-09-07). Tres salidas: migrar ahora (el muro de siempre), en otro
 * momento (queda un recordatorio anclado en el sidebar) y no requiero
 * migración. Escape cuenta como «en otro momento»: cerrar sin decidir no puede
 * dejar a la persona sin recordatorio.
 */
export function ModalDecisionDeMigracion({
  onDecidir,
}: {
  onDecidir: (decision: DecisionDeMigracion) => void
}) {
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => caja.current?.focus())
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDecidir('luego')
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [onDecidir])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4"
      data-testid="decision-de-migracion"
    >
      <div
        ref={caja}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="¿Migramos tu inmobiliaria?"
        className="flex flex-col items-center gap-3 outline-none"
      >
        <FeatureAnnouncement
          appName="Leasefy"
          appInitial="L"
          title="¿Migramos tu inmobiliaria?"
          description="Si ya operas con otro sistema o con hojas de cálculo, traemos tus datos para que arranques con todo cargado: propietarios e inquilinos, inmuebles y contratos, y tu plan de cuentas con los saldos contables. Toma unos minutos y se puede hacer por partes."
          ctaLabel="Migrar ahora"
          onCta={() => onDecidir('ahora')}
          className="max-w-[calc(100vw-2rem)]"
        />
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px]">
          <button
            type="button"
            onClick={() => onDecidir('luego')}
            className="font-medium text-white/90 underline-offset-2 hover:underline"
            data-testid="migrar-en-otro-momento"
          >
            En otro momento
          </button>
          <button
            type="button"
            onClick={() => onDecidir('nunca')}
            className="text-white/70 underline-offset-2 hover:underline"
            data-testid="no-requiero-migracion"
          >
            No requiero migración
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
