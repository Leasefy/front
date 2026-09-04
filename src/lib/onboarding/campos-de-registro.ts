/**
 * campos-de-registro.ts — lo que se revisa de cada campo del paso «Antes de
 * comenzar», con el motivo exacto por el que algo no sirve.
 *
 * Las tres revisiones devuelven `null` cuando el campo está bien y un mensaje
 * cuando no. El mensaje se pinta en el helper del input, nunca en un toast:
 * un error de campo pertenece al campo.
 *
 * El back sólo exige que `firstName` y `lastName` no lleguen vacíos
 * (`CompleteOnboardingDto`), no pone topes de longitud. Los topes de acá son
 * del front y existen para atajar pegados accidentales antes de que viajen.
 */

export const NOMBRE_MAXIMO = 80
export const RAZON_SOCIAL_MAXIMO = 120

/**
 * Nombre de persona. Se pide completo porque el back guarda nombre y apellido
 * por separado, así que un solo palabra deja el apellido repitiendo el nombre.
 */
export function revisarNombreCompleto(crudo: string): string | null {
  const valor = crudo.trim().replace(/\s+/g, ' ')

  if (!valor) return 'Escribe tu nombre completo para continuar.'
  if (valor.length > NOMBRE_MAXIMO) {
    return `El nombre no puede pasar de ${NOMBRE_MAXIMO} caracteres.`
  }
  if (/\d/.test(valor)) return 'El nombre no lleva números.'
  // Letras (con tildes y ñ), apóstrofes y guiones: "O'Brien", "Ana-María".
  if (!/^[\p{L}][\p{L}\s'’-]*$/u.test(valor)) {
    return 'El nombre lleva un carácter que no va. Usa sólo letras.'
  }
  if (valor.split(' ').length < 2) {
    return 'Falta el apellido: escribe tu nombre y tu apellido.'
  }
  return null
}

/**
 * Razón social — el nombre legal de la inmobiliaria. Acá sí entran números y
 * signos: «Inmobiliaria 2000 S.A.S.», «Arrendamientos & Cía. Ltda.».
 */
export function revisarRazonSocial(crudo: string): string | null {
  const valor = crudo.trim().replace(/\s+/g, ' ')

  if (!valor) return 'La razón social es obligatoria.'
  if (valor.length < 3) return 'La razón social es muy corta.'
  if (valor.length > RAZON_SOCIAL_MAXIMO) {
    return `La razón social no puede pasar de ${RAZON_SOCIAL_MAXIMO} caracteres.`
  }
  if (!/\p{L}/u.test(valor)) {
    return 'La razón social tiene que llevar letras, no sólo números.'
  }
  return null
}

/**
 * Parte el nombre como lo hace el resto del registro: la primera palabra es el
 * nombre y el resto el apellido. `revisarNombreCompleto` ya garantizó que hay
 * al menos dos palabras, pero el respaldo se queda por si alguien llama esto
 * sin revisar antes — el back rechaza un `lastName` vacío.
 */
export function partirNombre(crudo: string): { firstName: string; lastName: string } {
  const partes = crudo.trim().replace(/\s+/g, ' ').split(' ')
  const firstName = partes[0] ?? ''
  return { firstName, lastName: partes.slice(1).join(' ') || firstName }
}
