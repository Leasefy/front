/**
 * PostularButton — el botón de postularse.
 *
 * 🔴 El estudio de arrendamiento es OPCIONAL (Nico, 04-10-2026: «el estudio es
 * opcional, no es obligatorio»; reemplaza F-08). Hasta ese día este botón, sin
 * estudio (o vencido, o en curso), abría «Antes de postularte» y la persona no
 * llegaba al asistente. Ahora SIEMPRE lleva a /aplicar; el estudio se le
 * ofrece ahí como algo que la ayuda (`OfertaDelEstudio`), nunca como requisito,
 * y la inmobiliaria ve la postulación marcada.
 *
 * Lo único que cambia el destino: si ya hay una postulación activa para este
 * inmueble, lleva a ella (el back rechaza la segunda).
 */

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useAplicacionParaPropiedad } from '@/lib/hooks/use-aplicacion-propiedad'

/**
 * Qué se le ofrece sobre el estudio en /aplicar (nunca un freno):
 *  · `sin_sesion`   — sin sesión y sin estudio conocido: puede tener cuenta.
 *  · `sin_estudio`  — con sesión, no tiene estudio.
 *  · `vencido`      — lo tuvo y venció.
 *  · `en_curso`     — pagado, las aseguradoras todavía no responden.
 *  · `sin_respaldo` — las aseguradoras no lo respaldan con el estudio de hoy.
 */
export type OfertaDelEstudio = 'sin_sesion' | 'sin_estudio' | 'vencido' | 'en_curso' | 'sin_respaldo'

interface PostularButtonProps {
  propertyId: string
  /** Canon mensual de la propiedad. Ya no decide nada (D13 y estudio opcional). */
  canonCop?: number
  className?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  hideArrow?: boolean
  children?: React.ReactNode
}

export function PostularButton({
  propertyId,
  canonCop,
  className,
  variant,
  hideArrow,
  children = 'Postularme',
}: PostularButtonProps) {
  void canonCop
  const { activa } = useAplicacionParaPropiedad(propertyId)

  // Prioridad sobre todo lo demás: si ya hay una postulación ACTIVA para esta
  // propiedad, no se ofrece re-postular (el back lo rechaza con 409).
  if (activa) {
    return (
      <Button asChild className={className} variant={variant} hideArrow={hideArrow}>
        <Link href={`/inquilino/aplicaciones/${activa.id}`}>Ir a mi postulación</Link>
      </Button>
    )
  }

  return (
    <Button asChild className={className} variant={variant} hideArrow={hideArrow}>
      <Link href={`/aplicar/${propertyId}`}>{children}</Link>
    </Button>
  )
}

/**
 * Qué ofrecerle sobre el estudio a quien NO tiene sesión, con su aprobación
 * local (la de un enlace, todavía sin cuenta). `null` = ya tiene un estudio
 * vigente que lo respalda, o no se sabe todavía.
 *
 * Sin sesión y sin nada estudiado, «no tiene estudio» no nos consta: puede ser
 * alguien con cuenta y estudio que sólo está deslogueado. Por eso `sin_sesion`
 * le ofrece las DOS puertas —entrar, o conocer hasta cuánto lo respaldan—, sin
 * frenarlo: también puede postularse así, como invitado.
 */
export function ofertaDelEstudio({
  aprobacion,
  vigente,
  haySesion = true,
}: {
  aprobacion: { estado: string; topeAprobadoCop: number | null; vigenteHasta: string | null } | null
  vigente: boolean
  haySesion?: boolean
}): OfertaDelEstudio | null {
  if (!aprobacion) return null
  if (aprobacion.estado === 'en_proceso') return 'en_curso'
  if (aprobacion.estado === 'rechazado') return 'sin_respaldo'
  if (aprobacion.estado === 'sin_estudio') return haySesion ? 'sin_estudio' : 'sin_sesion'
  if (!vigente) return 'vencido'
  return null
}
