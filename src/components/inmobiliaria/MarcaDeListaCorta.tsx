'use client'

/**
 * «Lista corta · 1.º» — el puesto que Matching le dio a una postulación, con
 * sus razones a la mano (MANOS-2; MATCH-3, QA de agentes 18-10: también en
 * Candidatos del inmueble, donde la inmobiliaria escoge). Una sola marca para
 * Postulaciones y Candidatos: si difirieran, la misma persona tendría dos
 * puestos según la pantalla.
 */
import { cn } from '@/lib/utils'
import { useTr } from '@/lib/i18n/use-tr'
import type { PuestoEnLaListaCorta } from '@/lib/api/listas-cortas.service'

export function MarcaDeListaCorta({
  puesto,
  className,
}: {
  puesto: PuestoEnLaListaCorta | undefined
  className?: string
}) {
  const tr = useTr()
  if (!puesto || puesto.puesto === null) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary',
        className,
      )}
      title={puesto.razones.join(' ')}
      data-testid={`lista-corta-${puesto.applicationId}`}
    >
      {tr('Lista corta ·')} {puesto.puesto}.º
    </span>
  )
}
