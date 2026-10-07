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
import { FRASES_DE_SUPABASE, mensajeDeSupabase } from './errores-de-supabase'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

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

const CODIGO_INCORRECTO = FRASES_DE_SUPABASE.mfa_verification_failed

const SESION_CERRADA = FRASES_DE_SUPABASE.session_not_found

/** Lo que dice un error de Supabase Auth (REST o SDK). */
export interface ErrorDeSupabaseAuth {
  status?: number
  /** `error_code` del cuerpo, o `code` del `AuthError` del SDK. */
  codigo?: string
  /** `msg` / `message` crudo (en inglés). */
  mensaje?: string
}

/**
 * Las frases que en el segundo factor dicen otra cosa que en el resto de la
 * entrada: `insufficient_aal` sale al querer quitarlo desde una sesión `aal1`.
 */
const FRASES_DEL_SEGUNDO_FACTOR: Readonly<Record<string, string>> = {
  insufficient_aal:
    'Para quitar el segundo factor primero escribe el código de tu app de autenticación. Si ya no la tienes, restablécelo con un código a tu correo.',
}

/**
 * El error del segundo factor, en español. Delega en el traductor de Supabase
 * (`errores-de-supabase.ts`): por `codigo` y por `status`, con la regla de oro
 * (status 0 = conexión; 5xx = falló de nuestro lado).
 *
 * Única excepción a «nunca por el texto»: cuando GoTrue NO manda código (una
 * respuesta vieja o un error del SDK sin `code`), dos pistas del texto que
 * Nico pidió fijar —sesión vencida no es «código incorrecto» (01-10), y un
 * TOTP inválido sí lo es—. Con código, el texto no se mira.
 */
export function mensajeDeSupabaseAuth({ status, codigo, mensaje }: ErrorDeSupabaseAuth): string {
  if (!codigo && mensaje && status !== 0 && (status === undefined || status < 500)) {
    // Antes que «invalid|expired»: la sesión vencida («invalid JWT… token is
    // expired») trae las dos palabras y no es un código malo (Nico, 01-10).
    if (/\bjwt\b|token is expired|session/i.test(mensaje)) return SESION_CERRADA
    if (/invalid|expired/i.test(mensaje)) return CODIGO_INCORRECTO
  }
  return mensajeDeSupabase(
    { status, code: codigo },
    {
      frases: FRASES_DEL_SEGUNDO_FACTOR,
      accion: 'completar la operación con tu segundo factor',
      porDefecto: 'No pudimos completar la operación con tu segundo factor. Intenta de nuevo en un momento.',
    },
  )
}

/**
 * ¿La sesión ya no sirve? (vencida, renovación rechazada, token inválido). Con
 * ella muerta ningún código entra: la pantalla del segundo factor tiene que
 * mandar a la contraseña, no quedarse pidiendo códigos (Nico, 05-10). Decide
 * el mismo traductor que pone el aviso, así que aviso y salida no se separan.
 */
export function laSesionSeCerro(datos: ErrorDeSupabaseAuth): boolean {
  return mensajeDeSupabaseAuth(datos) === SESION_CERRADA
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

/**
 * Los errores del back al restablecer con el código del correo. Los códigos
 * propios del restablecimiento tienen su frase; lo demás va por el traductor
 * de la plataforma (02-10-2026): «conexión» sólo si no hubo respuesta, un 5xx
 * dice que fue nuestro con su referencia, un 4xx trae lo que dijo el back.
 */
export function mensajeDelRestablecimiento(err: unknown): string {
  if (esErrorDelBack(err)) {
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
  }
  // `demasiados_envios`, `restablecimiento_fallo` y el 429 del limitador ya
  // traen su texto en español: el traductor lo deja pasar.
  return mensajeParaLaPersona(err, {
    accion: 'restablecer el segundo factor',
    porDefecto: 'No pudimos restablecer el segundo factor. Intenta de nuevo en unos minutos.',
  })
}
