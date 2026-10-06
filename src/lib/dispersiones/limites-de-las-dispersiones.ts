/**
 * Los topes de lo que una persona escribe en las dispersiones (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/dispersiones/dto/limites-de-las-dispersiones.ts`:
 * MISMO número, MISMA frase. Si cambias uno, cambia el otro.
 *
 * La referencia del giro (`dispersions.transfer_reference`, `VarChar(100)`) la
 * escribe quien marca la plata como girada, copiándola del banco. Pegada de
 * más (el extracto entero) el back la rechaza con un 400 en
 * `transferReference`; acá se ataja antes de mandar nada.
 */

export const MAX_LARGO_REFERENCIA_DEL_GIRO = 100

export const MENSAJES_DE_LAS_DISPERSIONES = {
  referenciaDelGiroLarga: 'La referencia del giro puede tener hasta 100 caracteres.',
} as const

/** Qué está mal con la referencia del giro, o `null` si se puede mandar. */
export function errorDeLaReferenciaDelGiro(referencia: string): string | null {
  return referencia.trim().length > MAX_LARGO_REFERENCIA_DEL_GIRO
    ? MENSAJES_DE_LAS_DISPERSIONES.referenciaDelGiroLarga
    : null
}
