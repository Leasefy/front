import { ApiError } from '@/lib/api/client'

/**
 * La respuesta que no salió bien del micro (el cotizador), como un `ApiError`
 * con su status y su cuerpo entero (02-10-2026).
 *
 * Antes los `fetch` a mano del cotizador hacían `throw new Error(String(res.status))`
 * o `throw new Error(body.error ?? \`Error ${res.status}\`)`, y la pantalla
 * pintaba «403», «Error 500» o el `error` del micro en inglés («Forbidden —
 * no membership row»). Con el `ApiError` el traductor
 * (`mensajeParaLaPersona`, `repartirErroresDelServidor`, `FalloDeCarga`) sabe
 * qué pasó: un 400 trae `campos` para su campo, un 5xx dice «de nuestro lado»
 * con la referencia (`requestId` del micro) y un 403 no es la conexión.
 *
 * El texto del error es SÓLO el `message` del sobre (en español). El `error`
 * del cuerpo viejo del micro va en inglés y no es para una persona: queda en
 * `detalle` por si alguien lo necesita, pero nunca se muestra.
 *
 * Un `fetch` que ni salió no pasa por acá: tira su `TypeError` («Failed to
 * fetch») y el traductor lo lee como status 0 (conexión).
 */
export async function falloDeLaRespuesta(res: Pick<Response, 'status' | 'json'>): Promise<ApiError> {
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
  const code = typeof cuerpo?.code === 'string' ? cuerpo.code : undefined
  return new ApiError(res.status, texto, code, cuerpo)
}
