'use client'

/**
 * Los cuatro estados de una pantalla con datos, en un solo lugar y en el
 * orden correcto.
 *
 * El orden importa y es fácil de equivocar: si el estado vacío se evalúa antes
 * que el de carga, la pantalla afirma «no hay nada» durante el medio segundo
 * en que todavía no sabe. Eso enseña a desconfiar de la pantalla. Acá el orden
 * es parte del componente, no de quien lo llama.
 *
 *   1. cargando  → esqueleto (si se conoce la forma) o spinner
 *   2. falló     → <FalloDeCarga>, que decide si se puede reintentar
 *   3. vacío     → el estado vacío que le pases
 *   4. hay datos → los hijos
 *
 * Excepción deliberada — el refresco de fondo: si YA se mostró contenido, un
 * fallo posterior no debe borrarlo. Pasá `conservarContenido` para eso.
 */

import type { ReactNode } from 'react'
import { Spinner } from '@/components/ui'
import { FalloDeCarga } from './FalloDeCarga'

export interface EstadoDeDatosProps {
  cargando: boolean
  /** El error entero, no su mensaje. `null` si no falló. */
  error?: unknown
  /** ¿La respuesta llegó bien y no trajo nada? */
  vacio?: boolean
  /**
   * Qué mostrar mientras carga. Un esqueleto sólo sirve si la forma del
   * resultado se conoce de antemano (una tabla, una grilla de tarjetas). Si
   * no se conoce, un spinner es más honesto que un esqueleto que miente
   * sobre la forma.
   */
  esqueleto?: ReactNode
  /** El <EmptyState> de esta pantalla. */
  cuandoVacio?: ReactNode
  /** Qué se estaba cargando: «las postulaciones», «el contrato»… */
  queEs?: string
  onReintentar?: () => void
  volverA?: { label: string; href: string }
  /** Si ya se mostró contenido, un fallo de refresco no lo borra. */
  conservarContenido?: boolean
  children: ReactNode
}

export function EstadoDeDatos({
  cargando,
  error,
  vacio = false,
  esqueleto,
  cuandoVacio,
  queEs,
  onReintentar,
  volverA,
  conservarContenido = false,
  children,
}: EstadoDeDatosProps) {
  if (cargando) {
    return (
      <>
        {esqueleto ?? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="md" variant="muted" />
          </div>
        )}
      </>
    )
  }

  if (error && !conservarContenido) {
    return (
      // Sin marco: esto NO es la pantalla, es el hueco de contenido que la
      // página ya envolvió —las tres pantallas que lo usan lo ponen dentro de
      // `rounded-lg border bg-card`—. Enmarcado quedaba un borde redondeado
      // adentro de otro, y encima distinto de `cuandoVacio`, que ocupa
      // exactamente el mismo lugar sin marco.
      <FalloDeCarga
        error={error}
        queEs={queEs}
        onReintentar={onReintentar}
        volverA={volverA}
        enmarcado={false}
      />
    )
  }

  if (vacio && cuandoVacio) return <>{cuandoVacio}</>

  return <>{children}</>
}
