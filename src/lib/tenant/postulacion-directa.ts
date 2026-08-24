/**
 * postulacion-directa — ¿hay que preguntarle algo a esta persona, o no?
 *
 * Lo acordado en la reunión del 11-08: quien ya se estudió, tiene la aprobación
 * vigente, el inmueble le entra en el tope y ya llenó una postulación completa
 * antes, **se postula sin que le pidamos nada**. Volver a pedirle los mismos
 * seis pasos es cobrarle otra vez un trabajo que ya hizo.
 *
 * Lo que sí se sigue pidiendo, y no es negociable: **la autorización de datos**.
 * La Ley 1581/2012 la exige previa, expresa e informada, y para una finalidad
 * determinada; cada inmueble puede ser de una inmobiliaria distinta, o sea otro
 * responsable del tratamiento. El back ya lo tiene decidido así —el prefill
 * excluye a propósito los campos de consentimiento— y acá se respeta: una
 * pantalla, una autorización, un botón.
 *
 * La completitud NO se define acá. Se le pregunta a `validateStep`, la misma
 * función que usa el wizard para dejar avanzar. Si tuviéramos una segunda
 * definición, esta pantalla podría decir "ya tenemos todo" sobre datos que el
 * wizard considera incompletos.
 */

import { createEmptyApplication } from '@/lib/types/application'
import { validateStep } from '@/lib/validation/applicationValidation'
import { cabeEnTope, type Aprobacion } from '@/lib/api/aprobacion.service'
import type { ApplicationPrefill } from '@/lib/api/applications.types'
import { aplicarPrefill } from './prefill-a-postulacion'

/** Por qué esta persona igual tiene que pasar por el formulario. */
export type MotivoDeFormulario =
  | 'sin_sesion'
  | 'sin_aprobacion_vigente'
  | 'fuera_del_tope'
  | 'tope_desconocido'
  | 'sin_postulacion_previa'
  | 'faltan_datos'

export interface Veredicto {
  /** true = se puede postular con una sola confirmación. */
  directa: boolean
  /** Presente sólo cuando `directa` es false. */
  motivo?: MotivoDeFormulario
  /** Qué pasos del formulario quedaron incompletos (1..4). Sólo con 'faltan_datos'. */
  pasosIncompletos?: number[]
}

interface Entrada {
  haySesion: boolean
  aprobacion: Aprobacion | null
  vigente: boolean
  prefill: ApplicationPrefill | null
  /** Canon mensual del inmueble. */
  canonCop: number | undefined
}

/**
 * Los cuatro pasos con datos. El 5 es la revisión: no aporta información.
 * T-0025 eliminó el paso de referencias (era el 4; documentos se corrió del
 * 5 al 4) — ya no se valida acá tampoco.
 */
const PASOS_CON_DATOS = [1, 2, 3, 4]

export function evaluarPostulacionDirecta({
  haySesion,
  aprobacion,
  vigente,
  prefill,
  canonCop,
}: Entrada): Veredicto {
  if (!haySesion) return { directa: false, motivo: 'sin_sesion' }

  if (!aprobacion || aprobacion.estado !== 'aprobado' || !vigente) {
    return { directa: false, motivo: 'sin_aprobacion_vigente' }
  }

  /*
   * El tope se compara contra el canon del inmueble. `cabeEnTope` devuelve
   * `null` cuando no hay tope — y null NO es un false disfrazado: hay
   * aseguradoras que respaldan sin comprometer techo. Sin ese número no
   * podemos afirmar que el inmueble le entra, así que la persona pasa por el
   * formulario. No se le niega nada; se le pide lo de siempre.
   */
  if (canonCop === undefined) return { directa: false, motivo: 'tope_desconocido' }
  const entra = cabeEnTope(canonCop, aprobacion.topeAprobadoCop)
  if (entra === null) return { directa: false, motivo: 'tope_desconocido' }
  if (!entra) return { directa: false, motivo: 'fuera_del_tope' }

  if (!prefill || !prefill.hasPreviousApplication) {
    return { directa: false, motivo: 'sin_postulacion_previa' }
  }

  // La misma validación que usa el wizard para dejar pasar de un paso al otro.
  const postulacion = aplicarPrefill(createEmptyApplication(''), prefill)
  const pasosIncompletos = PASOS_CON_DATOS.filter(
    (paso) =>
      !validateStep(
        paso,
        {
          personal: postulacion.personal,
          employment: postulacion.employment,
          income: postulacion.income,
          documents: postulacion.documents,
        },
        // El consentimiento se otorga en la pantalla, no viene del prefill:
        // se pasa en true para que estos pasos no fallen por él.
        { acceptTerms: true, authorizeVerification: true },
      ).isValid,
  )

  if (pasosIncompletos.length > 0) {
    return { directa: false, motivo: 'faltan_datos', pasosIncompletos }
  }

  return { directa: true }
}
