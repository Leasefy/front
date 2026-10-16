/**
 * Lo que la persona ya escribió en su estudio, mientras crea la cuenta.
 *
 * Juan (Portofino, 15-10-2026): desde el marketplace, «Hacer mi estudio»
 * llenaba los datos y al final mandaba al login, y se perdía todo. Nico eligió
 * «pasos primero, cuenta al final»: el estudio se llena sin cuenta y, al
 * pagar, la cuenta se crea en una ventana encima. Crear la cuenta con correo
 * pasa por el enlace de confirmación, que casi siempre abre OTRA pestaña, y
 * por el onboarding del inquilino: por eso vive en `localStorage` y no en
 * `sessionStorage` (como `arriendo-en-curso`, que no lleva datos personales).
 *
 * Como sí lleva datos personales (nombre, cédula, celular, correo): vence a las
 * 24 h, se borra en cuanto el estudio se crea o la persona sale con «Cerrar»,
 * y NUNCA guarda la autorización (`consent`): ésa se vuelve a dar.
 */

import type { PreApprovalFormFields } from '@/app/aprobacion/form-logic'

export type BorradorDelEstudio = Omit<PreApprovalFormFields, 'consent'>

const CLAVE = 'leasefy:borrador-del-estudio'
const VIGENCIA_MS = 24 * 60 * 60 * 1000

const CAMPOS: readonly (keyof BorradorDelEstudio)[] = [
  'nombres',
  'apellidos',
  'email',
  'cedula',
  'phone',
  'ciudad',
  'canon',
  'tipoInmueble',
]

export function guardarBorradorDelEstudio(campos: PreApprovalFormFields, ahora = Date.now()): void {
  const borrador: Record<string, string> = {}
  for (const c of CAMPOS) borrador[c] = campos[c]
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify({ campos: borrador, guardadoEn: ahora }))
  } catch {
    // Sin almacenamiento (modo privado): la cuenta se crea igual; habrá que volver a escribir.
  }
}

/** El borrador vigente, o `null` (no hay, venció o está dañado: entonces se borra). */
export function leerBorradorDelEstudio(ahora = Date.now()): BorradorDelEstudio | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE)
    if (!crudo) return null
    const leido = JSON.parse(crudo) as { campos?: Record<string, unknown>; guardadoEn?: unknown }
    const vigente =
      typeof leido.guardadoEn === 'number' && ahora - leido.guardadoEn >= 0 && ahora - leido.guardadoEn < VIGENCIA_MS
    if (!vigente || !leido.campos || typeof leido.campos !== 'object') {
      window.localStorage.removeItem(CLAVE)
      return null
    }
    const borrador = {} as BorradorDelEstudio
    for (const c of CAMPOS) {
      const v = leido.campos[c]
      borrador[c] = typeof v === 'string' ? v : ''
    }
    return borrador
  } catch {
    return null
  }
}

export function borrarBorradorDelEstudio(): void {
  try {
    window.localStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}
