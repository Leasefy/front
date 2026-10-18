'use client'

/**
 * El botón «Translate» del panel en inglés (Nico, 16-10-2026, la recomendada):
 * lo que escribieron las PERSONAS —el WhatsApp de un inquilino, un mensaje
 * directo— se muestra tal como lo escribieron, y sólo cuando alguien lo pide se
 * traduce con Haiku. Así se paga sólo lo que se lee.
 *
 *   POST {NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/traducir
 *        { textos: string[] (≤ 20, ≤ 4000 c/u) } → { traducciones: string[], traducidos: number }
 *
 * (`agent/src/server/routes/agency-traducir.ts`). Lo que no se pudo traducir
 * vuelve igual: `traducidos` dice cuántos cambiaron de verdad.
 */

import { agentFetch } from './agent-fetch'
import { falloDelMicro } from './fallo-del-micro'

/** Los topes del micro (`TOPE_DE_TEXTOS`, `TOPE_DEL_TEXTO`). */
export const TEXTOS_POR_PEDIDO = 20
export const LARGO_MAXIMO_DEL_TEXTO = 4000

export interface ResultadoDeLaTraduccion {
  /** Cada texto en inglés, en el mismo orden; el que no se pudo, tal como vino. */
  traducciones: string[]
  /** Cuántos cambiaron. 0 = ya estaban en inglés o no se pudo ninguno. */
  traducidos: number
}

async function unPedido(agencyId: string, textos: string[]): Promise<ResultadoDeLaTraduccion> {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base) throw new Error('El asistente de Leasefy no está configurado.')
  const res = await agentFetch(`${base}/api/agency/${encodeURIComponent(agencyId)}/traducir`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ textos }),
  })
  if (!res.ok) throw await falloDelMicro(res)
  const cuerpo = (await res.json()) as Partial<ResultadoDeLaTraduccion>
  const traducciones = Array.isArray(cuerpo.traducciones) ? cuerpo.traducciones : []
  // Una respuesta de otro largo no se puede emparejar con los mensajes.
  if (traducciones.length !== textos.length) return { traducciones: textos, traducidos: 0 }
  return {
    traducciones: traducciones.map((t, i) => (typeof t === 'string' ? t : textos[i])),
    traducidos: typeof cuerpo.traducidos === 'number' ? cuerpo.traducidos : 0,
  }
}

/**
 * Traduce al inglés, de a `TEXTOS_POR_PEDIDO`. Un texto más largo que el tope
 * se manda recortado al tope: el micro lo rechazaría entero.
 */
export async function traducirAlIngles(agencyId: string, textos: readonly string[]): Promise<ResultadoDeLaTraduccion> {
  const recortados = textos.map((t) => t.slice(0, LARGO_MAXIMO_DEL_TEXTO))
  const traducciones: string[] = []
  let traducidos = 0
  for (let i = 0; i < recortados.length; i += TEXTOS_POR_PEDIDO) {
    const tanda = recortados.slice(i, i + TEXTOS_POR_PEDIDO)
    const r = await unPedido(agencyId, tanda)
    traducciones.push(...r.traducciones)
    traducidos += r.traducidos
  }
  return { traducciones, traducidos }
}
