'use client'

/**
 * «Lista corta · 1.º» — el puesto que Matching le dio a una postulación, con
 * sus razones a la mano (MANOS-2; MATCH-3, QA de agentes 18-10: también en
 * Candidatos del inmueble, donde la inmobiliaria escoge). Una sola marca para
 * Postulaciones y Candidatos: si difirieran, la misma persona tendría dos
 * puestos según la pantalla.
 */
import { Badge } from '@/components/ui/badge'
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
  // Revisora r24 (Postulaciones #2): neutra —el azul es la acción— y el puesto en mono.
  return (
    <Badge
      variant="secondary"
      className={className}
      title={puesto.razones.join(' ')}
      data-testid={`lista-corta-${puesto.applicationId}`}
    >
      {tr('Lista corta ·')} <span className="font-mono">{puesto.puesto}.º</span>
    </Badge>
  )
}
