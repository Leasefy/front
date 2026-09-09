'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FEATURE_HERO_AURORA } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import type { DecisionDeMigracion } from '@/lib/migracion/decision-de-migracion'

/**
 * «¿Migramos tu inmobiliaria?» — la pregunta previa al muro de migración.
 *
 * Nico pidió el cuerpo del modal de «nueva función» (2026-09-07), y de ahí
 * salen el halo de arriba y la marca. Tres salidas: migrar ahora (el muro de
 * siempre), en otro momento (queda un recordatorio anclado en el sidebar) y no
 * requiero migración. Escape cuenta como «en otro momento»: cerrar sin decidir
 * no puede dejar a la persona sin recordatorio.
 *
 * ── Por qué la CTA ya no es la de cadence (Nico, 2026-09-09: «mira cómo está
 * de feo ese botón») ────────────────────────────────────────────────────────
 *
 * `FeatureAnnouncement` pinta su CTA con `bg-surface-muted` y sólo la vuelve
 * azul **al pasar el mouse**. O sea que en reposo —que es como se ve el 100 %
 * de las veces que alguien abre el modal— la acción principal es un óvalo gris
 * claro, indistinguible de un botón deshabilitado, y con la flecha metida en
 * un círculo pegado al borde. Debajo, las otras dos salidas eran un pill con
 * borde y un pill fantasma: tres formas distintas, ninguna jerarquía.
 *
 * Ahora las tres son el `Button` de la casa, del mismo alto y el mismo ancho,
 * y la jerarquía la dan la variante y el color: sólida la que queremos que se
 * apriete, con borde la que aplaza, fantasma la que descarta. El halo y la
 * marca se arman acá con el mismo gradiente que exporta cadence
 * (`FEATURE_HERO_AURORA`), así que la cabecera no cambió.
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
        {/* El halo, con la marca encima. Mismo gradiente que usa el modal de
            «nueva función»: lo exporta cadence, no se copia un hex. */}
        <div
          className="relative h-[104px] w-full"
          style={{ background: FEATURE_HERO_AURORA }}
          aria-hidden="true"
        >
          <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-surface/90 py-1 pl-1 pr-3 backdrop-blur-sm">
            <span className="grid size-6 place-items-center rounded-full bg-fg text-[11px] font-semibold text-surface">
              L
            </span>
            <span className="text-[13px] font-semibold text-fg">Leasefy</span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          <h2 className="font-heading text-[21px] font-semibold leading-[1.25] tracking-[-0.01em] text-fg">
            ¿Migramos tu inmobiliaria?
          </h2>
          <p className="mt-2 text-[14px] leading-[1.55] text-fg-muted">
            Si ya operas con otro sistema o con hojas de cálculo, traemos tus
            datos para que arranques con todo cargado: propietarios e
            inquilinos, inmuebles y contratos, y tu plan de cuentas con los
            saldos contables. Toma unos minutos y se puede hacer por partes.
          </p>

          {/*
            Las tres, mismo alto y mismo ancho: lo único que las separa es la
            variante. Una acción principal que se lee como principal es la
            diferencia entre elegir y adivinar.
          */}
          <div className="mt-5 flex flex-col gap-2">
            <Button
              type="button"
              hideArrow
              className="h-12 w-full rounded-full text-[15px]"
              onClick={() => onDecidir('ahora')}
              data-testid="migrar-ahora"
            >
              Migrar ahora
            </Button>
            <Button
              type="button"
              variant="outline"
              hideArrow
              className="h-12 w-full rounded-full text-[15px]"
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
      </div>
    </div>,
    document.body,
  )
}
