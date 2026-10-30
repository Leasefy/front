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

/** El agente inmobiliario (Nico, 27-10-2026): su cuenta y después su registro corto, en el publicador. */
export const DESTINO_DEL_AGENTE = '/publica?perfil=agente'

/**
 * 🔴 Nico, 27-10-2026: «aquí es para que publiquen y luego los llevamos a la plataforma con todo en demo menos
 * Arrendamientos; si paga le aparecen esos pasos según lo que eligió». La inmobiliaria y el propietario que dejan el
 * registro a medias vuelven al registro CORTO del publicador (nombre y WhatsApp), nunca al asistente largo (razón
 * social, NIT…): esos datos se piden al pagar. El asistente (`/onboarding/inmobiliaria`) sigue para quien ya lo empezó.
 */
const RUTAS: Record<PerfilDeOnboarding, string> = {
  tenant: '/onboarding/inquilino',
  landlord: '/publica?perfil=landlord',
  agency: '/publica?perfil=agency',
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

/**
 * Igual que `rutaDeOnboarding`, pero con el destino que la persona traía
 * (Juan, Portofino, 15-10-2026: el estudio desde el marketplace terminaba en
 * el inicio del inquilino y no en el estudio). Sólo los onboardings del
 * inquilino y del propietario saben volver (`?returnUrl=`); el selector y el
 * de la inmobiliaria siguen como siempre. Sin destino (o el inicio), igual.
 */
export function rutaDeOnboardingConRegreso(
  perfil: PerfilDeOnboarding | null | undefined,
  destino: string | null | undefined,
): string {
  if (esDestinoQueRegistraSolo(destino)) return destino as string
  const ruta = rutaDeOnboarding(perfil)
  // Sólo el onboarding del inquilino sabe volver; el publicador lleva al panel al terminar.
  if (!destino || destino === '/' || perfil !== 'tenant') return ruta
  return `${ruta}?returnUrl=${encodeURIComponent(destino)}`
}

/** El publicador rápido del marketplace (Juan y Nico, 19-10-2026). */
export const RUTA_DEL_PUBLICADOR = '/publica'

/**
 * Destinos que hacen su propio registro, más corto: quien creó la cuenta para
 * publicar va al publicador (que le pide nombre y WhatsApp), NO al registro
 * completo del perfil («esos datos los tomamos después», Juan).
 */
export function esDestinoQueRegistraSolo(destino: string | null | undefined): boolean {
  if (!destino) return false
  return destino === RUTA_DEL_PUBLICADOR || destino.startsWith(`${RUTA_DEL_PUBLICADOR}?`) || destino.startsWith(`${RUTA_DEL_PUBLICADOR}/`)
}
