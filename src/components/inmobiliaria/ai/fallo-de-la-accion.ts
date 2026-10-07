import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { textosDelFallo } from '@/components/inmobiliaria/piloto/fallo-de-la-accion'

/**
 * Cómo las rutas del micro reciben el motivo que se escribe al rechazar o
 * resolver un caso de la cola humana: `reason` (conciliación, intervenciones),
 * `note` (verificar un pago) y `resolution_text` (resolver una escalación).
 * Un 400 con `campos` sobre cualquiera de ellos va debajo del motivo.
 */
const NOMBRES_DEL_MOTIVO = { reason: 'motivo', note: 'motivo', resolution_text: 'motivo' } as const

export interface FalloDeLaAccion {
  /** Lo que el micro dijo del motivo, para ponerlo debajo de su campo. */
  motivo?: string
  /** Lo que no tiene campo: va al toast (un 5xx con su referencia, un 409, la conexión). */
  sueltos: string[]
}

/**
 * Reparte el fallo de una acción de la cola humana (02-10-2026, tanda 2 de
 * errores, A6) con la regla de oro: el error del motivo a su campo y el resto
 * en una frase para la persona. Antes el toast decía «No se pudo: 403» o el
 * código del micro.
 *
 * `conMotivo` = la acción se mandó con el motivo escrito; si no, no hay campo
 * donde ponerlo y todo va al toast.
 */
export function repartirFalloDeLaAccion(fallo: unknown, label: string, conMotivo: boolean): FalloDeLaAccion {
  const reparto = repartirErroresDelServidor<'motivo'>(fallo, {
    mapa: conMotivo ? NOMBRES_DEL_MOTIVO : {},
    campos: conMotivo ? ['motivo'] : [],
    ...textosDelFallo(label),
  })
  return {
    ...(reparto.porCampo.motivo ? { motivo: reparto.porCampo.motivo } : {}),
    sueltos: reparto.sueltos,
  }
}
