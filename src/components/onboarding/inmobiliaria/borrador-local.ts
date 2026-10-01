/**
 * Lo escrito y AÚN NO enviado de cada paso del asistente, para que devolverse
 * de paso no lo borre (Nico, 2026-09-30: «si me devuelvo en un paso, no
 * guarda lo que sumé en este y es horrible porque toca volver a colocar
 * todo»).
 *
 * Cada paso guarda sus valores mientras la persona escribe y los recupera al
 * volver a montarse. Vive en sessionStorage: sobrevive navegar entre pasos y
 * recargar la pestaña, y muere al cerrarla. Al enviar el paso con éxito se
 * borra — desde ahí el borrador de verdad vive en el back y vuelve en
 * `draft`, como siempre («Cada paso queda guardado al continuar»).
 *
 * Todo lector/escritor va en try/catch: en ventana privada o con el storage
 * bloqueado se pierde el borrador local, nunca la función.
 */

const clave = (sessionId: string, paso: string) => `leasefy-asistente:${sessionId}:${paso}`

export function leerBorradorLocal<T>(sessionId: string, paso: string): Partial<T> | null {
  try {
    const crudo = window.sessionStorage.getItem(clave(sessionId, paso))
    if (!crudo) return null
    const valores = JSON.parse(crudo) as unknown
    return valores && typeof valores === 'object' ? (valores as Partial<T>) : null
  } catch {
    return null
  }
}

export function guardarBorradorLocal(sessionId: string, paso: string, valores: unknown): void {
  try {
    window.sessionStorage.setItem(clave(sessionId, paso), JSON.stringify(valores))
  } catch {
    /* sin storage no hay borrador local, y ya */
  }
}

export function borrarBorradorLocal(sessionId: string, paso: string): void {
  try {
    window.sessionStorage.removeItem(clave(sessionId, paso))
  } catch {
    /* nada que borrar */
  }
}
