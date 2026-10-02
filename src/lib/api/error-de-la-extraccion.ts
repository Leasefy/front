/**
 * El error de una extracción con IA del micro (`/terceros/extract`,
 * `/property-capture/extract`) como `ApiError`, con el sobre ENTERO (02-10-2026).
 *
 * Esas dos rutas llaman al micro con `fetch` directo (no pasan por
 * `apiClient`). Antes se hacía `new ApiError(status, body.error)`: se perdían
 * el `code`, los `campos` y la `referencia` de un 5xx, y el traductor no podía
 * aplicar la regla de oro. Ahora el micro manda el mismo sobre que el back
 * (`{ statusCode, code, message, campos?, referencia? }`) y conserva `error`
 * como texto; acá se guarda todo en `detalle` para que
 * `mensajeParaLaPersona` / `repartirErroresDelServidor` lo lean.
 */

import { ApiError } from './client';

function textoDelCuerpo(cuerpo: Record<string, unknown>, status: number): string | string[] {
  const { message, error } = cuerpo;
  if (Array.isArray(message) && message.length > 0) return message.map(String);
  if (typeof message === 'string' && message.trim()) return message;
  // Un micro anterior al sobre sólo mandaba `error` (texto).
  if (typeof error === 'string' && error.trim()) return error;
  return `Error ${status}`;
}

export async function errorDeLaExtraccion(res: Response): Promise<ApiError> {
  const leido: unknown = await res.json().catch(() => ({}));
  const cuerpo =
    leido && typeof leido === 'object' && !Array.isArray(leido) ? (leido as Record<string, unknown>) : {};
  const code = typeof cuerpo.code === 'string' ? cuerpo.code : undefined;
  return new ApiError(res.status, textoDelCuerpo(cuerpo, res.status), code, cuerpo);
}
