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

/** Partículas que van pegadas al apellido que sigue: «de la Torre», «del Valle», «Pérez de Mesa». */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'van', 'von', 'da', 'di'])

/**
 * El nombre completo partido en nombres y apellidos, como en Colombia (Nico, 28-10-2026: «¿el nombre completo no daña
 * alguna base que pida nombre y apellidos por aparte?»). Las partículas («de», «del», «la»…) se pegan a la palabra que
 * sigue. Con 4 o más palabras, la mitad son nombres («Juan Camilo | López Acevedo»); con 3, el primero es el nombre y
 * los otros dos los apellidos («Nicolás | García Gómez», lo más común); con 2, uno y uno. Sin apellido, el back recibe
 * el nombre dos veces, porque no acepta un apellido vacío. En documentos se usa siempre el nombre completo junto.
 */
export function partirElNombre(displayName: string): { firstName: string; lastName: string } {
  const palabras = displayName.trim().split(/\s+/).filter(Boolean)
  // Junta cada partícula con lo que sigue: «Pérez de la Torre» → «Pérez», «de la Torre».
  const bloques: string[] = []
  let pegadas: string[] = []
  for (const p of palabras) {
    pegadas.push(p)
    if (PARTICULAS.has(p.toLowerCase())) continue
    bloques.push(pegadas.join(' '))
    pegadas = []
  }
  if (pegadas.length) bloques.push(pegadas.join(' '))
  if (bloques.length <= 1) {
    const unico = bloques[0] ?? ''
    return { firstName: unico, lastName: unico }
  }
  const nombres = bloques.length >= 4 ? Math.floor(bloques.length / 2) : 1
  return { firstName: bloques.slice(0, nombres).join(' '), lastName: bloques.slice(nombres).join(' ') }
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
