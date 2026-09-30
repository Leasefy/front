/**
 * Por qué no se pudo crear la cuenta, en español que se entiende.
 *
 * 🔴 Nació en producción (Nico, 30-09-2026): con un primer correo el registro
 * pasaba a «Revisa tu correo»; al volver y poner OTRO correo, «Crear cuenta»
 * terminaba en «Error al crear la cuenta. Intenta de nuevo.» y nada más. Cada
 * `signUp` manda un correo de confirmación, y Supabase tiene un tope de correos
 * de auth por hora para TODO el proyecto (lo comparten el registro, el reenvío,
 * la recuperación de contraseña y las invitaciones). El segundo intento choca
 * con ese tope y responde 429 `over_email_send_rate_limit`; el formulario sólo
 * reconocía «already registered» y «Password should be», así que todo lo demás
 * —el tope incluido— se volvía el genérico y el código se perdía.
 *
 * Supabase Auth (GoTrue) manda `status` y `code` además de un `message` en
 * inglés; acá se decide por el código y el status, y el texto sólo desempata.
 * Se lee por forma y no con `instanceof` (igual que `errores-del-segundo-factor`):
 * las pantallas y sus pruebas no cargan el SDK entero.
 */

export type MotivoDelRegistro =
  | 'ya-existe'
  | 'limite-de-correos'
  | 'limite-de-intentos'
  | 'clave-debil'
  | 'correo-invalido'
  | 'correo-no-autorizado'
  | 'registro-cerrado'
  | 'fallo-del-correo'
  | 'fallo-de-la-base'
  | 'sin-conexion'
  | 'desconocido'

export interface ErrorDelRegistro {
  motivo: MotivoDelRegistro
  status?: number
  /** `code` del `AuthError` (p. ej. `over_email_send_rate_limit`). */
  codigo?: string
  /** «only request this after N seconds»: los segundos que pide Supabase. */
  segundos?: number
}

function campo(err: unknown, nombre: string): unknown {
  return typeof err === 'object' && err !== null ? (err as Record<string, unknown>)[nombre] : undefined
}

export function leerErrorDelRegistro(err: unknown): ErrorDelRegistro {
  const status = typeof campo(err, 'status') === 'number' ? (campo(err, 'status') as number) : undefined
  const codigo = typeof campo(err, 'code') === 'string' ? (campo(err, 'code') as string) : undefined
  const nombre = typeof campo(err, 'name') === 'string' ? (campo(err, 'name') as string) : ''
  const mensaje = err instanceof Error ? err.message : typeof campo(err, 'message') === 'string' ? (campo(err, 'message') as string) : ''
  const segundosPedidos = /after (\d+) seconds?/i.exec(mensaje)
  const segundos = segundosPedidos ? Number(segundosPedidos[1]) : undefined
  const base = { status, codigo, ...(segundos !== undefined ? { segundos } : {}) }

  if (codigo === 'user_already_exists' || codigo === 'email_exists' || /already (been )?(registered|exists)/i.test(mensaje)) {
    return { motivo: 'ya-existe', ...base }
  }
  if (codigo === 'over_email_send_rate_limit' || /email rate limit|for security purposes/i.test(mensaje)) {
    return { motivo: 'limite-de-correos', ...base }
  }
  if (codigo === 'over_request_rate_limit' || status === 429) {
    return { motivo: 'limite-de-intentos', ...base }
  }
  if (codigo === 'weak_password' || nombre === 'AuthWeakPasswordError' || /password should/i.test(mensaje)) {
    return { motivo: 'clave-debil', ...base }
  }
  if (codigo === 'email_address_not_authorized') return { motivo: 'correo-no-autorizado', ...base }
  if (codigo === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(mensaje)) {
    return { motivo: 'correo-invalido', ...base }
  }
  if (codigo === 'signup_disabled' || codigo === 'email_provider_disabled') return { motivo: 'registro-cerrado', ...base }
  if (/sending (confirmation|magic link)? ?e?-?mail|error sending/i.test(mensaje)) return { motivo: 'fallo-del-correo', ...base }
  if (/database error/i.test(mensaje)) return { motivo: 'fallo-de-la-base', ...base }
  if (nombre === 'AuthRetryableFetchError' || status === 0 || /failed to fetch|network|load failed/i.test(mensaje)) {
    return { motivo: 'sin-conexion', ...base }
  }
  return { motivo: 'desconocido', ...base }
}

export interface OpcionesDelMensaje {
  /** Cada pantalla dice a su manera qué hacer si el correo ya tiene cuenta. */
  yaExiste?: string
  /** El genérico de la pantalla; se le suma la referencia del error. */
  generico?: string
}

const GENERICO = 'Error al crear la cuenta. Intenta de nuevo.'

export function mensajeDelRegistro(err: unknown, opciones: OpcionesDelMensaje = {}): string {
  const e = leerErrorDelRegistro(err)
  switch (e.motivo) {
    case 'ya-existe':
      return opciones.yaExiste ?? 'Este correo ya está registrado. Inicia sesión en su lugar.'
    case 'limite-de-correos':
      return e.segundos
        ? `Acabamos de enviarle un correo a esta dirección. Espera ${e.segundos} segundos antes de pedir otro.`
        : 'Se enviaron muchos correos de confirmación en poco tiempo y no pudimos mandar el tuyo. Espera unos minutos e intenta de nuevo.'
    case 'limite-de-intentos':
      return 'Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.'
    case 'clave-debil':
      return 'Esa contraseña es muy débil o muy conocida. Prueba con otra más larga que mezcle letras, números y símbolos.'
    case 'correo-invalido':
      return 'Ese correo no es válido. Revísalo e intenta de nuevo.'
    case 'correo-no-autorizado':
      return 'Todavía no podemos enviar correos a esa dirección. Usa otro correo o escríbenos.'
    case 'registro-cerrado':
      return 'El registro con correo no está disponible en este momento.'
    case 'fallo-del-correo':
      return 'No pudimos enviar el correo de confirmación. Intenta de nuevo en unos minutos.'
    case 'fallo-de-la-base':
      return 'No pudimos guardar la cuenta. Intenta de nuevo en unos minutos; si sigue igual, escríbenos.'
    case 'sin-conexion':
      return 'No hubo conexión con el servidor. Revisa tu internet e intenta de nuevo.'
    case 'desconocido': {
      const referencia = e.codigo ?? (e.status !== undefined ? String(e.status) : null)
      const generico = opciones.generico ?? GENERICO
      return referencia ? `${generico} Referencia: ${referencia}.` : generico
    }
  }
}

/**
 * El rastro para quien depura: status y código, NUNCA el correo. Antes el
 * error se tiraba sin dejar nada, y lo único que quedaba era el genérico.
 */
export function registrarFalloDelRegistro(donde: string, err: unknown): void {
  const { motivo, status, codigo } = leerErrorDelRegistro(err)
  console.error(`[registro] ${donde}: signUp falló`, { motivo, status, codigo })
}
