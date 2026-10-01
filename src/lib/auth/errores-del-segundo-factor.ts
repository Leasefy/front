/**
 * Los errores del segundo factor, en español que se entiende.
 *
 * 🔴 Nació de un toast que decía «Error 422» a secas (Nico, 29-09-2026): la
 * persona tocó «Desactivar» desde el login y Supabase respondió que hace falta
 * `aal2`. GoTrue contesta `{ error_code, msg }` — no `message` —, así que la
 * pantalla caía al genérico `Error ${status}`. Acá se traduce todo lo que
 * puede salir de ese flujo: lo de Supabase Auth y lo del back
 * (`/auth/segundo-factor/restablecer/*`). Nada devuelve el número pelado.
 */
/**
 * Lo que se lee de un `ApiError` del cliente del back. Se mira por forma y no
 * con `instanceof`: `MfaSetupSection` y sus pruebas no cargan el cliente
 * entero, y esto tiene que servirles igual.
 */
interface ErrorDelBack {
  status: number
  code?: string
  message: string
}

function esErrorDelBack(err: unknown): err is ErrorDelBack {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { status?: unknown }).status === 'number' &&
    typeof (err as { message?: unknown }).message === 'string'
  )
}

export const MENSAJE_NO_DISPONIBLE =
  'Esta opción todavía no está disponible; pídele a un administrador de Leasefy que te restablezca el segundo factor.'

const CODIGO_INCORRECTO =
  'Código incorrecto. El código cambia cada 30 segundos: espera al siguiente e intenta de nuevo.'

/** Lo que dice un error de Supabase Auth (REST o SDK). */
export interface ErrorDeSupabaseAuth {
  status?: number
  /** `error_code` del cuerpo, o `code` del `AuthError` del SDK. */
  codigo?: string
  /** `msg` / `message` crudo (en inglés). */
  mensaje?: string
}

export function mensajeDeSupabaseAuth({ status, codigo, mensaje }: ErrorDeSupabaseAuth): string {
  switch (codigo) {
    case 'insufficient_aal':
      return 'Para quitar el segundo factor primero escribe el código de tu app de autenticación. Si ya no la tienes, restablécelo con un código a tu correo.'
    case 'mfa_verification_failed':
    case 'mfa_challenge_expired':
    case 'mfa_verification_rejected':
      return CODIGO_INCORRECTO
    case 'mfa_factor_not_found':
      return 'Ese segundo factor ya no existe. Recarga la página e intenta de nuevo.'
    case 'mfa_factor_name_conflict':
    case 'too_many_enrolled_mfa_factors':
      return 'Quedaron activaciones a medias del segundo factor. Recarga la página e intenta de nuevo.'
    case 'session_not_found':
    case 'bad_jwt':
    case 'no_authorization':
      return 'Tu sesión se cerró. Vuelve a entrar con tu contraseña.'
    case 'over_request_rate_limit':
      return 'Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.'
  }
  // Antes que «invalid|expired»: la sesión vencida («invalid JWT… token is
  // expired») trae las dos palabras y no es un código malo (Nico, 01-10).
  if (/\bjwt\b|token is expired|session/i.test(mensaje ?? '')) {
    return 'Tu sesión se cerró. Vuelve a entrar con tu contraseña.'
  }
  if (/invalid|expired/i.test(mensaje ?? '')) return CODIGO_INCORRECTO
  if (status === 401) return 'Tu sesión se cerró. Vuelve a entrar con tu contraseña.'
  if (status === 429) return 'Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.'
  if (status !== undefined && status >= 500) {
    return 'El servicio de autenticación no respondió bien. Intenta de nuevo en un momento.'
  }
  return 'No pudimos completar la operación con tu segundo factor. Intenta de nuevo en un momento.'
}

/** Un `Error` con el mensaje ya traducido (y el código crudo, por si sirve). */
export class ErrorDelSegundoFactor extends Error {
  constructor(
    message: string,
    public codigo?: string,
  ) {
    super(message)
    this.name = 'ErrorDelSegundoFactor'
  }
}

export function errorDeSupabaseAuth(datos: ErrorDeSupabaseAuth): ErrorDelSegundoFactor {
  return new ErrorDelSegundoFactor(mensajeDeSupabaseAuth(datos), datos.codigo)
}

/** Los errores del back al restablecer con el código del correo. */
export function mensajeDelRestablecimiento(err: unknown): string {
  if (!esErrorDelBack(err)) {
    return 'No pudimos restablecer el segundo factor. Revisa tu conexión e intenta de nuevo.'
  }
  switch (err.code) {
    case 'codigo_invalido':
      return err.message && !/^Error \d{3}$/.test(err.message)
        ? err.message
        : 'El código no es correcto. Revísalo en el correo que te mandamos.'
    case 'codigo_vencido':
      return 'El código venció: dura 10 minutos. Pide uno nuevo.'
    case 'demasiados_intentos':
      return 'Escribiste mal el código demasiadas veces. Pide uno nuevo.'
    case 'restablecimiento_no_disponible':
      return MENSAJE_NO_DISPONIBLE
  }
  // `demasiados_envios`, `restablecimiento_fallo`, el 429 del limitador y la
  // red caída ya traen su texto en español (el back o `apiClient`).
  if (err.code && err.message && !/^Error \d{3}$/.test(err.message)) return err.message
  if (err.status === 0 || err.status === 429) return err.message
  return 'No pudimos restablecer el segundo factor. Intenta de nuevo en unos minutos.'
}
