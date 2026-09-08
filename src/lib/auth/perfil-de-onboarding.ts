/**
 * El perfil que la persona eligió en «Selecciona tu perfil», y a dónde va.
 *
 * ── Por qué existe (Nico, 2026-09-07) ──────────────────────────────────────
 * «Creaste la cuenta, confirmaste el correo, te quedaste en la pantalla de
 * elegir perfil y cerraste. Cuando vuelvas y entres con tu contraseña, te
 * dejamos en el paso donde lo dejaste.» Hasta hoy la elección no se guardaba
 * en ningún lado: quien elegía «inmobiliaria», llegaba al paso previo y se
 * iba, volvía a «Selecciona tu perfil» en la próxima entrada — y desde otro
 * dispositivo también, porque lo poco que se guardaba vivía en el navegador.
 *
 * La elección va a `user_metadata.intended_role` de Supabase: es donde el
 * registro con `?role=` ya la dejaba, viaja con la sesión (no depende de
 * este navegador) y no toca el `role` real, que lo asigna el back sólo
 * cuando el onboarding termina.
 */

export type PerfilDeOnboarding = 'tenant' | 'landlord' | 'agency'

/** La clave en `user_metadata`. La misma que escribe el registro con `?role=`. */
export const CLAVE_DE_PERFIL_ELEGIDO = 'intended_role'

export const RUTA_DEL_SELECTOR_DE_PERFIL = '/onboarding/seleccionar-rol'

const RUTAS: Record<PerfilDeOnboarding, string> = {
  tenant: '/onboarding/inquilino',
  landlord: '/onboarding/propietario',
  agency: '/onboarding/inmobiliaria',
}

export function esPerfilDeOnboarding(valor: unknown): valor is PerfilDeOnboarding {
  return valor === 'tenant' || valor === 'landlord' || valor === 'agency'
}

/** Lee la elección guardada en los metadatos del usuario de Supabase. */
export function leerPerfilElegido(metadata: unknown): PerfilDeOnboarding | null {
  if (!metadata || typeof metadata !== 'object') return null
  const valor = (metadata as Record<string, unknown>)[CLAVE_DE_PERFIL_ELEGIDO]
  return esPerfilDeOnboarding(valor) ? valor : null
}

/**
 * A dónde mandar a alguien con el onboarding sin terminar: al onboarding del
 * perfil que ya eligió, o al selector si todavía no eligió ninguno.
 */
export function rutaDeOnboarding(perfil: PerfilDeOnboarding | null | undefined): string {
  return perfil ? RUTAS[perfil] : RUTA_DEL_SELECTOR_DE_PERFIL
}
