/**
 * Lo programado desde el chat que quedó listo (D4, pregunta 19 — Nico 30-10: «aviso al abrir el chat»).
 *
 * Al abrir el chat del panel se pide al micro `GET /api/agency/{agencyId}/ai-hub/chat/programado/listo`
 * (sólo lo de quien llama). El aviso de arriba dice cuántas quedaron listas, la primera con su texto y
 * «Hacerlo ahora» (manda «haz lo programado» en el hilo, que el chat ya entiende), y lo que salió solo
 * en Automático, dicho como hecho. Nunca lanza: sin micro o con error, no hay aviso.
 */
import { agentFetch } from '@/lib/api/agent-fetch'

export interface ProgramadaLista {
  id: string
  que: string
  texto: string
  desde: string
}

export interface ProgramadaQueSalioSola {
  id: string
  que: string
  texto: string
  en: string
}

export interface LoProgramadoListo {
  listas: ProgramadaLista[]
  salieronSolas: ProgramadaQueSalioSola[]
}

/** Lo que el botón del aviso manda en el hilo. */
export const MENSAJE_DE_HACERLO_AHORA = 'haz lo programado'

export function urlDeLoProgramadoListo(agencyId: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base || !agencyId) return null
  return `${base}/api/agency/${agencyId}/ai-hub/chat/programado/listo`
}

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** Sólo lo bien formado; lo demás se descarta (nunca un aviso a medias). */
export function loProgramadoListoDe(cuerpo: unknown): LoProgramadoListo | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null
  const c = cuerpo as { listas?: unknown; salieronSolas?: unknown }
  const listas = (Array.isArray(c.listas) ? c.listas : []).flatMap((x): ProgramadaLista[] => {
    const f = x as Partial<ProgramadaLista>
    return esTexto(f?.id) && esTexto(f.texto) && esTexto(f.que) && esTexto(f.desde) ? [{ id: f.id, que: f.que, texto: f.texto, desde: f.desde }] : []
  })
  const salieronSolas = (Array.isArray(c.salieronSolas) ? c.salieronSolas : []).flatMap((x): ProgramadaQueSalioSola[] => {
    const f = x as Partial<ProgramadaQueSalioSola>
    return esTexto(f?.id) && esTexto(f.texto) && esTexto(f.que) && esTexto(f.en) ? [{ id: f.id, que: f.que, texto: f.texto, en: f.en }] : []
  })
  if (listas.length === 0 && salieronSolas.length === 0) return null
  return { listas, salieronSolas }
}

/** Nunca lanza. `null` = no hay nada que avisar (o no se pudo leer: el aviso es un extra). */
export async function leerLoProgramadoListo(agencyId: string | null | undefined, signal?: AbortSignal): Promise<LoProgramadoListo | null> {
  const url = urlDeLoProgramadoListo(agencyId)
  if (!url) return null
  try {
    const res = await agentFetch(url, { method: 'GET', signal })
    if (!res.ok) return null
    return loProgramadoListoDe(await res.json())
  } catch {
    return null
  }
}
