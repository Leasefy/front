'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FeatureAnnouncement } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
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
        // La tarjeta de cadence no tiene pie: las otras dos salidas van DENTRO
        // de la misma tarjeta (Nico, 2026-09-07), como secundaria y terciaria.
        // El envoltorio pone el radio y la sombra; la tarjeta pierde los suyos
        // abajo para que el pie se lea como parte de ella.
        className="w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[20px] bg-surface shadow-[0_24px_60px_rgba(20,19,15,0.16)] outline-none"
      >
        <FeatureAnnouncement
          appName="Leasefy"
          appInitial="L"
          title="¿Migramos tu inmobiliaria?"
          description="Si ya operas con otro sistema o con hojas de cálculo, traemos tus datos para que arranques con todo cargado: propietarios e inquilinos, inmuebles y contratos, y tu plan de cuentas con los saldos contables. Toma unos minutos y se puede hacer por partes."
          ctaLabel="Migrar ahora"
          onCta={() => onDecidir('ahora')}
          className="w-full max-w-full rounded-b-none shadow-none"
        />
        <div className="flex flex-col gap-2 px-[18px] pb-5">
          <Button
            type="button"
            variant="outline"
            hideArrow
            className="h-11 w-full rounded-full"
            onClick={() => onDecidir('luego')}
            data-testid="migrar-en-otro-momento"
          >
            En otro momento
          </Button>
          <Button
            type="button"
            variant="ghost"
            hideArrow
            className="h-10 w-full rounded-full text-fg-muted"
            onClick={() => onDecidir('nunca')}
            data-testid="no-requiero-migracion"
          >
            No requiero migración
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
