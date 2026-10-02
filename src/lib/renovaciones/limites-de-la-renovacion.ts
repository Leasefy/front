/**
 * Los topes de la renovación, con las MISMAS cifras y frases que el back
 * (02-10-2026).
 *
 * `proposedRent`, `negotiatedRent` y `negotiatedAdminFee` van a columnas
 * `int4`: un canon con ceros de más daba un 500 (P2020) y la pantalla decía
 * «Reintenta». El back ya lo para con una frase por campo; acá se ataja antes
 * de mandar.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/renovaciones/dto/limites-de-la-renovacion.ts`.
 * Si cambia uno, cambia el otro.
 */
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

/** El tope de la columna `int4`, en una cifra que se lee. */
export const VALOR_MAXIMO_DE_LA_RENOVACION_COP = 2_000_000_000

export const MENSAJES_DE_LA_RENOVACION = {
  canonPropuestoEntero: 'El canon propuesto debe ser un número entero de pesos, sin decimales.',
  canonPropuestoNegativo: 'El canon propuesto no puede ser negativo.',
  canonPropuestoMaximo: 'El canon propuesto no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  canonNegociadoEntero: 'El canon negociado debe ser un número entero de pesos, sin decimales.',
  canonNegociadoNegativo: 'El canon negociado no puede ser negativo.',
  canonNegociadoMaximo: 'El canon negociado no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  administracionEntera: 'La administración negociada debe ser un número entero de pesos, sin decimales.',
  administracionNegativa: 'La administración negociada no puede ser negativa.',
  administracionMaxima: 'La administración negociada no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  notaVacia: 'Escribe la nota antes de agregarla.',
} as const

export interface ValoresDeLaRenovacion {
  proposedRent?: number | null
  negotiatedRent?: number | null
  negotiatedAdminFee?: number | null
}

const REGLAS: ReadonlyArray<{
  campo: keyof ValoresDeLaRenovacion
  entero: string
  negativo: string
  maximo: string
}> = [
  {
    campo: 'proposedRent',
    entero: MENSAJES_DE_LA_RENOVACION.canonPropuestoEntero,
    negativo: MENSAJES_DE_LA_RENOVACION.canonPropuestoNegativo,
    maximo: MENSAJES_DE_LA_RENOVACION.canonPropuestoMaximo,
  },
  {
    campo: 'negotiatedRent',
    entero: MENSAJES_DE_LA_RENOVACION.canonNegociadoEntero,
    negativo: MENSAJES_DE_LA_RENOVACION.canonNegociadoNegativo,
    maximo: MENSAJES_DE_LA_RENOVACION.canonNegociadoMaximo,
  },
  {
    campo: 'negotiatedAdminFee',
    entero: MENSAJES_DE_LA_RENOVACION.administracionEntera,
    negativo: MENSAJES_DE_LA_RENOVACION.administracionNegativa,
    maximo: MENSAJES_DE_LA_RENOVACION.administracionMaxima,
  },
]

/**
 * Los valores de la renovación revisados como los revisa el back
 * (`UpdateRenovacionStageDto`), campo por campo: la frase de cada uno que no
 * cabe, con el nombre del DTO. Un valor ausente no opina. Es lo que el cajón
 * pinta BAJO cada campo antes de mandar (02-10-2026).
 */
export function erroresDeLosValores(
  valores: ValoresDeLaRenovacion,
): Partial<Record<keyof ValoresDeLaRenovacion, string>> {
  const errores: Partial<Record<keyof ValoresDeLaRenovacion, string>> = {}
  for (const r of REGLAS) {
    const v = valores[r.campo]
    if (v === null || v === undefined) continue
    if (!Number.isInteger(v)) errores[r.campo] = r.entero
    else if (v < 0) errores[r.campo] = r.negativo
    else if (v > VALOR_MAXIMO_DE_LA_RENOVACION_COP) errores[r.campo] = r.maximo
  }
  return errores
}

/**
 * Los valores de la renovación revisados como los revisa el back
 * (`UpdateRenovacionStageDto`). Devuelve la primera frase que falle, o
 * `undefined` si todo cabe. Un valor ausente no opina.
 */
export function revisarValoresDeLaRenovacion(valores: ValoresDeLaRenovacion): string | undefined {
  const errores = erroresDeLosValores(valores)
  for (const r of REGLAS) {
    if (errores[r.campo]) return errores[r.campo]
  }
  return undefined
}

/**
 * Lo que se dice cuando una acción de la renovación falla, por el traductor:
 * «conexión» sólo sin respuesta, un 5xx es nuestro (con la referencia), un
 * 4xx dice lo que mandó el back. Desde el 02-10-2026 va en el cajón (bajo su
 * campo o en el aviso de la acción), no en un toast.
 */
export function mensajeDeLaRenovacion(error: unknown, accion: string): string {
  return mensajeParaLaPersona(error, {
    porDefecto: 'Prueba de nuevo en un momento.',
    accion,
  })
}
