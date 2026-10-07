/**
 * EL traductor de los errores de Supabase Auth (02-10-2026).
 *
 * Supabase responde en inglés («Invalid login credentials», «User already
 * registered», «Password should be at least…») y las pantallas de entrada lo
 * leían por el TEXTO: un cambio de redacción de Supabase rompía el caso, y lo
 * que no se reconocía terminaba en «Error al iniciar sesión. Intenta de nuevo.»
 * aunque la red estuviera perfecta, o en el inglés crudo.
 *
 * Acá se lee por lo que no cambia:
 *
 *  · el `code` del `AuthError` del SDK, o el `error_code` del cuerpo cuando la
 *    llamada es REST directa (`invalid_credentials`, `user_already_exists`,
 *    `weak_password`, `over_email_send_rate_limit`…);
 *  · el `status`;
 *  · el nombre de la clase de auth-js (`AuthRetryableFetchError` con status 0
 *    es «el pedido no salió»).
 *
 * Nunca por el texto en inglés.
 *
 * 🔴 La regla de oro del traductor de la plataforma
 * (`src/lib/errores/traductor-de-errores.ts`), que es a quien se le delega lo
 * que no es propio de Supabase:
 *
 *  · «conexión» SÓLO cuando no hubo respuesta (status 0, `Failed to fetch`);
 *  · un 5xx (o un `request_timeout`, `unexpected_failure`…) dice que falló de
 *    nuestro lado, sin culpar a nadie;
 *  · un 4xx con código conocido dice qué está mal; uno sin código conocido usa
 *    la frase de la pantalla (`porDefecto`), nunca el inglés.
 */

import { esSinRespuesta, mensajeParaLaPersona, type OpcionesDelMensaje } from '@/lib/errores/traductor-de-errores'

export interface ErrorDeSupabaseLeido {
  /** Status HTTP; 0 = el pedido no salió; `undefined` = no vino de HTTP. */
  status?: number
  /** `code` del `AuthError`, o `error_code` del cuerpo REST. */
  codigo?: string
  /** El nombre de la clase de auth-js (`AuthRetryableFetchError`, `AuthSessionMissingError`…). */
  nombre?: string
  /** `weak_password`: por qué (`length`, `characters`, `pwned`). */
  motivos: string[]
}

function comoObjeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/**
 * Lo que dice un error de Supabase, venga del SDK (`AuthApiError`,
 * `AuthWeakPasswordError`…) o de un `fetch` directo a `/auth/v1/*` (el cuerpo
 * de GoTrue: `{ code, error_code, msg, weak_password }`).
 */
export function leerErrorDeSupabase(error: unknown): ErrorDeSupabaseLeido {
  const o = comoObjeto(error)
  if (!o) return { motivos: [] }
  const status = typeof o.status === 'number' ? o.status : typeof o.code === 'number' ? o.code : undefined
  const codigo =
    typeof o.code === 'string' && o.code ? o.code : typeof o.error_code === 'string' && o.error_code ? o.error_code : undefined
  const nombre = typeof o.name === 'string' ? o.name : undefined
  const debil = comoObjeto(o.weak_password)
  const motivosCrudos = Array.isArray(o.reasons) ? o.reasons : Array.isArray(debil?.reasons) ? debil.reasons : []
  const motivos = motivosCrudos.filter((m): m is string => typeof m === 'string')
  return { status, codigo, nombre, motivos }
}

const SESION_CERRADA = 'Tu sesión se cerró. Vuelve a entrar con tu contraseña.'
const DEMASIADOS_INTENTOS = 'Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.'
const ENLACE_VENCIDO = 'El enlace venció o ya se usó. Pide uno nuevo.'
const ESCRIBENOS = 'escríbenos a hola@leasefy.co'

/**
 * Una frase por código de Supabase Auth. Las pantallas pueden cambiar la de un
 * código con `frases` (el «Código incorrecto» del segundo factor, el «ya la
 * usaste antes» de la contraseña nueva).
 */
export const FRASES_DE_SUPABASE: Readonly<Record<string, string>> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed:
    'Tu correo todavía no está confirmado. Busca el enlace en tu bandeja (y en spam) o pide uno nuevo.',
  user_already_exists: 'Ya hay una cuenta con este correo.',
  email_exists: 'Ya hay una cuenta con este correo.',
  identity_already_exists: 'Esa cuenta de Google ya está unida a otro usuario de Leasefy.',
  weak_password:
    'Elige una contraseña más segura: ésta es muy común o apareció en filtraciones de datos conocidas.',
  same_password: 'La nueva contraseña tiene que ser distinta de la que ya tienes.',
  email_address_invalid: 'Ese correo no es válido. Revísalo.',
  email_address_not_authorized: `No podemos enviar correos a esa dirección. Usa otro correo o ${ESCRIBENOS}.`,
  over_email_send_rate_limit:
    'Ya te enviamos varios correos hace poco. Espera unos minutos y revisa también spam antes de pedir otro.',
  over_request_rate_limit: DEMASIADOS_INTENTOS,
  over_sms_send_rate_limit: DEMASIADOS_INTENTOS,
  otp_expired: ENLACE_VENCIDO,
  flow_state_expired: ENLACE_VENCIDO,
  flow_state_not_found: 'El enlace se abrió en otro navegador o ya se usó. Pide uno nuevo y ábrelo aquí mismo.',
  bad_code_verifier: 'El enlace se abrió en otro navegador o ya se usó. Pide uno nuevo y ábrelo aquí mismo.',
  signup_disabled: `Por ahora no se pueden crear cuentas nuevas. Si necesitas una, ${ESCRIBENOS}.`,
  user_banned: `Esta cuenta está bloqueada. Para revisarla, ${ESCRIBENOS}.`,
  user_not_found: 'No encontramos una cuenta con ese correo.',
  session_not_found: SESION_CERRADA,
  session_expired: SESION_CERRADA,
  refresh_token_not_found: SESION_CERRADA,
  refresh_token_already_used: SESION_CERRADA,
  bad_jwt: SESION_CERRADA,
  invalid_jwt: SESION_CERRADA,
  no_authorization: SESION_CERRADA,
  reauthentication_needed: 'Por seguridad, vuelve a entrar con tu contraseña antes de cambiarla.',
  captcha_failed: 'No pudimos comprobar que eres una persona. Recarga la página e intenta de nuevo.',
  provider_disabled: 'Esa forma de entrar no está habilitada. Entra con tu correo y tu contraseña.',
  email_provider_disabled: `La entrada con correo no está habilitada en este momento. Si te pasa de nuevo, ${ESCRIBENOS}.`,
  mfa_verification_failed:
    'Código incorrecto. El código cambia cada 30 segundos: espera al siguiente e intenta de nuevo.',
  mfa_challenge_expired:
    'Código incorrecto. El código cambia cada 30 segundos: espera al siguiente e intenta de nuevo.',
  mfa_verification_rejected:
    'Código incorrecto. El código cambia cada 30 segundos: espera al siguiente e intenta de nuevo.',
  mfa_factor_not_found: 'Ese segundo factor ya no existe. Recarga la página e intenta de nuevo.',
  mfa_factor_name_conflict: 'Quedaron activaciones a medias del segundo factor. Recarga la página e intenta de nuevo.',
  too_many_enrolled_mfa_factors:
    'Quedaron activaciones a medias del segundo factor. Recarga la página e intenta de nuevo.',
}

/**
 * Códigos que no son de la persona: Supabase (o su gancho) falló. Se dicen
 * como un 5xx aunque lleguen con otro status.
 */
const CODIGOS_NUESTROS = new Set([
  'unexpected_failure',
  'request_timeout',
  'hook_timeout',
  'hook_timeout_after_retry',
  'hook_payload_over_size_limit',
  'hook_payload_invalid_content_type',
])

/** El código de Supabase de un error, o `undefined` (para decidir: `invalid_credentials` → ¿tiene cuenta?). */
export function codigoDeSupabase(error: unknown): string | undefined {
  return leerErrorDeSupabase(error).codigo
}

/** ¿El pedido a Supabase no salió? (`AuthRetryableFetchError` con status 0, `Failed to fetch`). */
export function sinRespuestaDeSupabase(error: unknown): boolean {
  return leerErrorDeSupabase(error).status === 0 || esSinRespuesta(error)
}

/**
 * `weak_password` dice por qué: filtrada (`pwned`), corta (`length`) o sin
 * variedad (`characters`). Se dice lo que de verdad pasó.
 */
function fraseDeContrasenaDebil(motivos: string[]): string {
  if (motivos.includes('pwned')) return 'Esa contraseña apareció en filtraciones de datos conocidas. Elige otra.'
  if (motivos.includes('length')) return 'La contraseña es muy corta. Usa una más larga.'
  if (motivos.includes('characters')) return 'La contraseña necesita más variedad: combina letras, números y símbolos.'
  return FRASES_DE_SUPABASE.weak_password
}

export interface OpcionesDeSupabase extends OpcionesDelMensaje {
  /** Frases propias de la pantalla para algunos códigos; ganan sobre las de acá. */
  frases?: Readonly<Partial<Record<string, string>>>
}

/**
 * La frase para la persona. `porDefecto` es lo que dice la pantalla cuando el
 * error no se reconoce (nunca el inglés de Supabase); `accion` arma el texto
 * de un fallo nuestro («No pudimos crear tu cuenta: algo falló de nuestro
 * lado…»).
 */
export function mensajeDeSupabase(error: unknown, { frases, porDefecto, accion }: OpcionesDeSupabase = {}): string {
  const { status, codigo, nombre } = leerErrorDeSupabase(error)

  // Sin respuesta: lo único que habla de la conexión. (Un `TypeError` que no
  // es de red —«x is not a function»— cae en el `porDefecto` del traductor.)
  if (status === 0) return mensajeParaLaPersona({ status: 0 }, { porDefecto, accion })
  if (error instanceof TypeError) return mensajeParaLaPersona(error, { porDefecto, accion })

  if (codigo) {
    const propia = frases?.[codigo]
    if (propia) return propia
    if (codigo === 'weak_password') return fraseDeContrasenaDebil(leerErrorDeSupabase(error).motivos)
    if (Object.prototype.hasOwnProperty.call(FRASES_DE_SUPABASE, codigo)) return FRASES_DE_SUPABASE[codigo]
  }

  // Un 5xx o un código que es de Supabase y no de la persona: «fue nuestro».
  // Se pasa SÓLO el status: el mensaje de Supabase está en inglés y el
  // traductor lo mostraría.
  if ((codigo && CODIGOS_NUESTROS.has(codigo)) || (typeof status === 'number' && status >= 500)) {
    return mensajeParaLaPersona({ status: typeof status === 'number' && status >= 500 ? status : 500 }, { porDefecto, accion })
  }
  if (status === 429) return DEMASIADOS_INTENTOS
  if (status === 401 || nombre === 'AuthSessionMissingError') return SESION_CERRADA

  return porDefecto ?? 'No pudimos completar esto. Prueba de nuevo en un momento.'
}
