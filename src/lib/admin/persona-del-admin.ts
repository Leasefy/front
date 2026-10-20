/**
 * Quién está en el admin, para la cabecera: «Nico · CPO».
 *
 * El nombre y el cargo viven en los metadatos de la cuenta de Supabase
 * (`user_metadata.nombre` / `user_metadata.cargo`), que se ponen al crear la
 * cuenta de cada persona del equipo. Así no hay correos escritos en el código
 * del front (que es público). Sin metadatos, el nombre sale del correo.
 */

export interface PersonaDelAdmin {
  correo: string
  nombre: string
  /** «CPO», «CTO»… `null` si la cuenta no lo tiene. */
  cargo: string | null
  /** La letra del avatar. */
  inicial: string
}

/**
 * Los fundadores de Leasefy (Nico, 19-10-2026: «créame 4 cuentas para los 4
 * fundadores»). Si la cuenta de Supabase no trae `nombre`/`cargo` en sus
 * metadatos —se crea sola con el primer enlace—, la cabecera los saca de acá.
 * Entrar al admin NO depende de esta lista: lo decide `ADMIN_EMAILS` en el back.
 */
export const FUNDADORES: Record<string, { nombre: string; cargo: string }> = {
  'juan.lopez@leasefy.co': { nombre: 'Juan', cargo: 'CEO' },
  'alex.lopez@leasefy.co': { nombre: 'Alex', cargo: 'CMO' },
  'n@leasefy.co': { nombre: 'Nico', cargo: 'CPO' },
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

/** «nico.garcia+admin@leasefy.co» → «Nico». */
export function nombreDelCorreo(correo: string): string {
  const local = (correo.split('@')[0] ?? '').split('+')[0] ?? ''
  const primero = local.split(/[._-]/).find(Boolean) ?? ''
  if (!primero) return correo
  return primero.charAt(0).toLocaleUpperCase('es-CO') + primero.slice(1)
}

export function personaDelAdmin(
  correo: string,
  metadatos?: Record<string, unknown> | null,
): PersonaDelAdmin {
  const fundador = FUNDADORES[correo.trim().toLowerCase()]
  const nombre =
    texto(metadatos?.nombre) ??
    fundador?.nombre ??
    texto(metadatos?.full_name) ??
    texto(metadatos?.name) ??
    nombreDelCorreo(correo)
  const cargo = texto(metadatos?.cargo) ?? fundador?.cargo ?? null
  return {
    correo,
    nombre,
    cargo,
    inicial: (nombre.charAt(0) || correo.charAt(0) || '·').toLocaleUpperCase('es-CO'),
  }
}
