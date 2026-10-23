'use client'

/**
 * CajonDelCaso — el detalle o la aprobación de un caso de Cobranza en un cajón,
 * sobre la misma lista.
 *
 * Ronda 30 (K4, Nico 23-10-2026: «K4 cajón»): ARCO, Cartas, Escalaciones,
 * Planes de pago y Siniestros abrían OTRA página para ver o aprobar un caso;
 * al volver, la lista perdía el filtro, la búsqueda y la página. Ahora la fila
 * abre este cajón, que monta el MISMO componente de detalle de la página
 * `[id]` (en su modo `enCajon`: sin miga ni encabezado de página, y al
 * resolver avisa en vez de navegar). La página `[id]` sigue viva para los
 * enlaces profundos y las notificaciones.
 *
 * Al cerrarse —a mano o porque el caso se resolvió— la lista se vuelve a leer
 * (`onCerrar`), así lo aprobado o rechazado sale de «Por revisar».
 */

import type { ReactNode } from 'react'

import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'

export interface CajonDelCasoProps {
  /** Abierto mientras haya un caso elegido. */
  abierto: boolean
  /** Se cerró (Esc, la X, fuera del cajón o el caso se resolvió). */
  onCerrar: () => void
  titulo: ReactNode
  descripcion?: ReactNode
  /** md para leer y decidir; lg cuando hay una vista previa (carta, PDF). */
  tamano?: 'md' | 'lg'
  children: ReactNode
  'data-testid'?: string
}

export function CajonDelCaso({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  tamano = 'md',
  children,
  'data-testid': testId,
}: CajonDelCasoProps) {
  return (
    <Cajon
      abierto={abierto}
      onOpenChange={(v) => {
        if (!v) onCerrar()
      }}
      tamano={tamano}
      data-testid={testId}
    >
      <CajonCabecera titulo={titulo} descripcion={descripcion} />
      <CajonCuerpo>{abierto ? children : null}</CajonCuerpo>
    </Cajon>
  )
}
