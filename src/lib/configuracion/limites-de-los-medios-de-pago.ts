/**
 * Los topes de un medio de pago, con las MISMAS cifras y frases que el back
 * (02-10-2026, tanda 2 del sistema de errores).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/medios-de-pago/limites-de-los-medios-de-pago.ts`.
 * Si cambias algo allá, cámbialo acá.
 */

import type { NuevoMedioDePago } from '@/lib/api/medios-de-pago.types'

export const MIN_LARGO_NOMBRE_DEL_MEDIO = 2
export const MAX_LARGO_NOMBRE_DEL_MEDIO = 80
export const MAX_LARGO_INSTRUCCIONES = 500

/** Los campos de texto que se topan, con su tope y su frase. */
export const TOPES_DEL_MEDIO = {
  nombre: { tope: MAX_LARGO_NOMBRE_DEL_MEDIO, frase: 'El nombre del medio puede tener hasta 80 caracteres.' },
  instrucciones: { tope: MAX_LARGO_INSTRUCCIONES, frase: 'Las instrucciones pueden tener hasta 500 caracteres.' },
  banco: { tope: 80, frase: 'El banco puede tener hasta 80 caracteres.' },
  tipoDeCuenta: { tope: 20, frase: 'El tipo de cuenta puede tener hasta 20 caracteres.' },
  numeroDeCuenta: { tope: 40, frase: 'El número de cuenta puede tener hasta 40 caracteres.' },
  titular: { tope: 120, frase: 'El titular puede tener hasta 120 caracteres.' },
  documentoTitular: { tope: 30, frase: 'El documento del titular puede tener hasta 30 caracteres.' },
  enlace: { tope: 300, frase: 'El enlace puede tener hasta 300 caracteres.' },
} as const satisfies Partial<Record<keyof NuevoMedioDePago, { tope: number; frase: string }>>

export type CampoTopadoDelMedio = keyof typeof TOPES_DEL_MEDIO

export const MENSAJE_NOMBRE_CORTO = 'El nombre del medio debe tener al menos 2 caracteres.'

/** Lo que el back rechazaría por largo, campo por campo (vacío = se puede mandar). */
export function erroresDeLargoDelMedio(valores: NuevoMedioDePago): Partial<Record<CampoTopadoDelMedio, string>> {
  const errores: Partial<Record<CampoTopadoDelMedio, string>> = {}
  for (const campo of Object.keys(TOPES_DEL_MEDIO) as CampoTopadoDelMedio[]) {
    const v = valores[campo]
    // El back recorta los espacios antes de guardar, pero valida lo que llega.
    if (typeof v === 'string' && v.length > TOPES_DEL_MEDIO[campo].tope) errores[campo] = TOPES_DEL_MEDIO[campo].frase
  }
  return errores
}
