/**
 * Los datos del propietario en su registro (`/onboarding/propietario`),
 * revisados con las MISMAS reglas y frases que el back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/users/dto/limites-del-perfil.ts` (`MAX_LARGO_NOMBRE`,
 * `nombreLargo`, `apellidoLargo`) y del `@Matches` del celular de
 * `CompleteOnboardingDto` (`^(\+57)?3\d{9}$`, que es lo que revisa
 * `errorTelefono`). Si cambia allá, cambia acá.
 *
 * Antes el paso sólo pedía «no vacío»: un nombre de 300 letras o un celular
 * que no empieza por 3 llegaban al back, que respondía 400, y la pantalla no
 * decía nada (el `catch` sólo hacía `console.error`).
 */

import { errorTelefono, normalizarTelefono } from '@/lib/phone/countries'

/** El tope de `firstName` y de `lastName` en el DTO del back. */
export const MAX_LARGO_NOMBRE = 100

export const MENSAJES_DEL_PROPIETARIO = {
  faltaNombre: 'Ingresa tu nombre completo para continuar',
  nombreLargo: 'El nombre puede tener hasta 100 caracteres.',
  apellidoLargo: 'El apellido puede tener hasta 100 caracteres.',
} as const

export type CampoDelPropietario = 'displayName' | 'phone'

export type ErroresDelPropietario = Partial<Record<CampoDelPropietario, string>>

/**
 * El nombre completo partido como lo manda el paso: la primera palabra es el
 * nombre y el resto el apellido (sin apellido, el back recibe el nombre dos
 * veces, porque no acepta un apellido vacío).
 */
export function partirElNombre(displayName: string): { firstName: string; lastName: string } {
  const partes = displayName.trim().split(/\s+/).filter(Boolean)
  const firstName = partes[0] ?? ''
  return { firstName, lastName: partes.slice(1).join(' ') || firstName }
}

/**
 * Qué está mal. Vacío = se puede enviar. El celular es opcional: vacío está
 * bien; escrito, tiene que ser un celular de verdad (si no, el back lo rechaza).
 */
export function revisarDatosDelPropietario(datos: { displayName: string; phone: string }): ErroresDelPropietario {
  const errores: ErroresDelPropietario = {}

  if (!datos.displayName.trim()) {
    errores.displayName = MENSAJES_DEL_PROPIETARIO.faltaNombre
  } else {
    const { firstName, lastName } = partirElNombre(datos.displayName)
    if (firstName.length > MAX_LARGO_NOMBRE) errores.displayName = MENSAJES_DEL_PROPIETARIO.nombreLargo
    else if (lastName.length > MAX_LARGO_NOMBRE) errores.displayName = MENSAJES_DEL_PROPIETARIO.apellidoLargo
  }

  if (datos.phone.replace(/\D/g, '').length > 0) {
    const telefono = errorTelefono(datos.phone)
    if (telefono) errores.phone = telefono
  }

  return errores
}

/** El celular como lo acepta el back (E.164), o nada si no se escribió. */
export function celularParaElBack(phone: string): string | undefined {
  if (!phone.replace(/\D/g, '')) return undefined
  return normalizarTelefono(phone) ?? undefined
}
