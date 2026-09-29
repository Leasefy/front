/**
 * Restablecer el segundo factor con un código al correo (back:
 * `src/auth/segundo-factor/`, 29-09-2026).
 *
 * Para quien pasó la contraseña (sesión `aal1`) pero perdió su app de
 * autenticación: Supabase no deja quitar un factor verificado sin `aal2`, y
 * quitarlo sólo con la contraseña sería un bypass. La segunda prueba es este
 * código, que llega al correo de la cuenta.
 *
 *   · `solicitar` → 204 SIEMPRE (no dice si la cuenta tiene factor); 429
 *     `demasiados_envios` (3 por hora); 503 `restablecimiento_no_disponible`.
 *   · `confirmar` → 204 y los factores borrados; 422 `codigo_invalido` |
 *     `codigo_vencido` | `demasiados_intentos`.
 *
 * Los mensajes para la persona: `mensajeDelRestablecimiento`
 * (`lib/auth/errores-del-segundo-factor.ts`).
 */
import { apiClient } from '@/lib/api/client'

export const segundoFactorApi = {
  solicitarRestablecimiento(): Promise<void> {
    return apiClient.post<void>('/auth/segundo-factor/restablecer/solicitar')
  },
  confirmarRestablecimiento(codigo: string): Promise<void> {
    return apiClient.post<void>('/auth/segundo-factor/restablecer/confirmar', { codigo })
  },
}
