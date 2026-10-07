import { ApiError } from '@/lib/api/client'

/**
 * La respuesta que no salió bien del micro de agentes, como un `ApiError` con
 * su status y su cuerpo entero (02-10-2026, tanda 2 de errores, A6).
 *
 * Cobranza, el piloto, los agentes IA y la conciliación llaman al micro con
 * `agentFetch` (un `fetch` que devuelve la `Response` cruda). Hasta acá cada
 * hook hacía `throw new Error(\`approve ${res.status}\`)` o devolvía
 * `{ ok: false, error: 'not_configured' }`, y la pantalla pintaba «403»,
 * «approve 500» o un código en inglés; o culpaba a la conexión.
 *
 * Con un `ApiError` el traductor (`mensajeParaLaPersona`,
 * `repartirErroresDelServidor`) sabe qué pasó:
 *  · un 400 del sobre trae `campos` para su campo;
 *  · un 5xx dice «de nuestro lado» con la referencia (`referencia` o el
 *    `requestId` del micro);
 *  · un 403 o un 409 dicen su `message`, nunca «la conexión».
 *
 * El texto del error es SÓLO el `message` del sobre (en español). El `error`
 * del cuerpo viejo del micro va en inglés y no es para una persona: queda en
 * `detalle` (y en `code` si es lo único que hay, para que la pantalla decida
 * con él), pero nunca se muestra.
 *
 * Un `fetch` que ni salió no pasa por acá: tira su `TypeError` («Failed to
 * fetch») y el traductor lo lee como status 0 (conexión).
 *
 * (El cotizador, de A4, tiene su gemelo en `lib/hooks/cotizador/`; los dos
 * deberían vivir en `lib/errores/`, que está congelado en esta tanda.)
 */
export async function falloDelMicro(res: Pick<Response, 'status' | 'json'>): Promise<ApiError> {
  let cuerpo: Record<string, unknown> | undefined
  try {
    const leido: unknown = await res.json()
    if (leido && typeof leido === 'object' && !Array.isArray(leido)) {
      cuerpo = leido as Record<string, unknown>
    }
  } catch {
    // Sin cuerpo o no es JSON (un 502 del balanceador): queda sólo el status.
  }
  const message = cuerpo?.message
  const texto = Array.isArray(message)
    ? message.map((m) => String(m)).filter(Boolean)
    : typeof message === 'string'
      ? message
      : ''
  // El sobre nuevo trae `code`; el cuerpo viejo, un `error` que a veces es un
  // código estable (`DUPLICATE_PLAN_RISK`, `not_configured`).
  const code =
    typeof cuerpo?.code === 'string'
      ? cuerpo.code
      : typeof cuerpo?.error === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(cuerpo.error)
        ? cuerpo.error
        : undefined
  return new ApiError(res.status, texto, code, cuerpo)
}
