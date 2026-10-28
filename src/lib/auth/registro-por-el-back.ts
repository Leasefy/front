import { apiClient, ApiError } from '@/lib/api/client'

/**
 * El registro con correo y contraseña por el back (Nico, 27-10-2026: «al crear la cuenta no me llegó correo» y «me
 * sigue apareciendo esto»). `supabase.auth.signUp` mandaba la confirmación por el correo de Supabase, que topa a
 * pocos por hora para todo el proyecto: cuando se acababa, nadie se podía registrar. Ahora el back crea la cuenta
 * con `generateLink` (no manda nada) y el correo sale por Resend, con el mismo código de 6 dígitos y el mismo
 * botón a `/auth/callback`.
 *
 * Un back anterior no tiene la ruta (404): se devuelve `'sin-ruta'` y quien llama sigue por Supabase como antes.
 */
export type ResultadoDelRegistro = 'hecho' | 'sin-ruta'

export async function registrarPorElBack(pedido: {
  email: string
  password: string
  regreso?: string
  datos?: Record<string, string>
}): Promise<ResultadoDelRegistro> {
  try {
    await apiClient.post('/auth/registro', pedido)
    return 'hecho'
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return 'sin-ruta'
    throw comoErrorDeSupabase(error)
  }
}

export async function reenviarPorElBack(email: string, regreso?: string): Promise<ResultadoDelRegistro> {
  try {
    await apiClient.post('/auth/registro/reenviar', { email, ...(regreso ? { regreso } : {}) })
    return 'hecho'
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return 'sin-ruta'
    throw comoErrorDeSupabase(error)
  }
}

/**
 * Los rechazos del back con la forma de los de Supabase, para que las pantallas del registro (que ya saben leer
 * `user_already_exists`, `over_email_send_rate_limit` y `weak_password`) digan lo mismo que siempre. Lo demás
 * (un 5xx, la red) sale tal cual: lo dice el traductor.
 */
export function comoErrorDeSupabase(error: unknown): unknown {
  if (!(error instanceof ApiError)) return error
  if (error.code === 'USUARIO_YA_EXISTE') {
    return Object.assign(new Error('User already registered'), { code: 'user_already_exists', status: 422 })
  }
  if (error.code === 'ESPERA_PARA_OTRO_CORREO') {
    const segundos = Number((error.detalle as { segundos?: unknown } | undefined)?.segundos)
    const texto = Number.isFinite(segundos) && segundos > 0 ? `For security purposes, you can only request this after ${segundos} seconds.` : 'Email rate limit exceeded'
    return Object.assign(new Error(texto), { code: 'over_email_send_rate_limit', status: 429 })
  }
  if (error.code === 'CLAVE_DEBIL') {
    return Object.assign(new Error('Password is too weak'), { code: 'weak_password', status: 422 })
  }
  return error
}
