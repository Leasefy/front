/**
 * ¿Este correo tiene una cuenta? (back: `POST /auth/correo-tiene-cuenta`,
 * Nico, 01-10-2026).
 *
 * Supabase contesta «Invalid login credentials» igual para una contraseña mala
 * que para un correo que no existe. El login pregunta esto SÓLO después de ese
 * error —nunca en cada tecla ni antes de intentar entrar— para poder decirle a
 * quien no tiene cuenta que no la tiene y ofrecerle crearla.
 *
 * El back contesta el booleano y nada más, limita a 10 consultas por minuto por
 * IP (429) y responde 503 `consulta_no_disponible` si no pudo decidir.
 */
import { apiClient } from '@/lib/api/client'

export const correoTieneCuentaApi = {
  /**
   * `true`/`false` si el back lo sabe; `null` si no se pudo saber (red, 429,
   * 503, respuesta rara). Quien llama trata `null` como «sí tiene»: decirle
   * «no tienes cuenta» a quien la tiene es el error caro.
   */
  async consultar(email: string): Promise<boolean | null> {
    try {
      const r = await apiClient.post<{ tieneCuenta?: unknown }>('/auth/correo-tiene-cuenta', { email })
      return typeof r?.tieneCuenta === 'boolean' ? r.tieneCuenta : null
    } catch {
      return null
    }
  },
}
