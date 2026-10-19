'use client'

/**
 * lecciones-para-ori.ts — lo que Naira le quiere enseñar a Ori (paso 4 de «Naira lo sabe todo», Nico 18-10-2026: «Le
 * enseña, el admin confirma», «En Naira → Aprobaciones»).
 *
 * `GET  /api/agency/{agencyId}/naira/lecciones-para-ori`                        → las lecciones, lo por decidir primero,
 *                                                                                 y si Ori ya usa lo aprendido.
 * `POST /api/agency/{agencyId}/naira/lecciones-para-ori/{leccionId}/decision`   → `{ decision: 'aprobar' | 'rechazar' }`.
 *
 * Aprobar = Ori la aprende (la usa al responder si las lecciones del chat están prendidas); rechazar = Naira no la vuelve a
 * proponer. Va aparte de `cliente.ts` como `cambios-de-modo.ts`, con la misma forma. Nunca tira: todo lo que sale mal es
 * un `kind`.
 */

import { z } from 'zod'

import { agentFetch } from '@/lib/api/agent-fetch'

export const LeccionParaOriSchema = z.object({
  id: z.string(),
  /** Lo que Ori aprendería, tal cual (en español: lo escribe Naira). */
  texto: z.string(),
  agente: z.string().nullable(),
  /** El nombre del agente («Vidi (inspección)»), o null si la lección es de lo decidido en Aprobaciones. */
  nombre: z.string().nullable(),
  proceso: z.string().nullable(),
  /** Qué hace el proceso, en una frase, si la lección es de un proceso. */
  queHaceElProceso: z.string().nullable(),
  sentido: z.enum(['aprueban', 'descartan']),
  cifras: z.record(z.string(), z.number()),
  estado: z.enum(['por_decidir', 'aprendida', 'descartada']),
  propuestaEn: z.string(),
  decididaEn: z.string().nullable(),
})
export type LeccionParaOri = z.infer<typeof LeccionParaOriSchema>

const ListaSchema = z.object({ lecciones: z.array(LeccionParaOriSchema), oriLasUsa: z.boolean() })
const ResultadoSchema = z.object({ resultado: z.enum(['aprendida', 'descartada']), mensaje: z.string() })

export type LecturaDeLecciones =
  | { readonly kind: 'ok'; readonly lecciones: readonly LeccionParaOri[]; readonly oriLasUsa: boolean }
  | { readonly kind: 'sin_permiso' }
  | { readonly kind: 'apagada' }
  | { readonly kind: 'no_disponible' }

export type DecisionDeLaLeccion =
  | { readonly kind: 'ok'; readonly resultado: 'aprendida' | 'descartada' }
  | { readonly kind: 'conflicto' }
  | { readonly kind: 'no_disponible' }

function urlDe(agencyId: string, resto = ''): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base || agencyId.trim() === '') return null
  return `${base.replace(/\/+$/, '')}/api/agency/${encodeURIComponent(agencyId)}/naira/lecciones-para-ori${resto}`
}

export async function leerLeccionesParaOri(agencyId: string): Promise<LecturaDeLecciones> {
  const url = urlDe(agencyId)
  if (url === null) return { kind: 'no_disponible' }
  let res: Response
  try {
    res = await agentFetch(url, { method: 'GET' })
  } catch {
    return { kind: 'no_disponible' }
  }
  if (res.status === 403) return { kind: 'sin_permiso' }
  if (res.status === 404) return { kind: 'apagada' }
  if (!res.ok) return { kind: 'no_disponible' }
  const r = ListaSchema.safeParse(await res.json().catch(() => null))
  return r.success ? { kind: 'ok', lecciones: r.data.lecciones, oriLasUsa: r.data.oriLasUsa } : { kind: 'no_disponible' }
}

export async function decidirLeccionParaOri(agencyId: string, leccionId: string, decision: 'aprobar' | 'rechazar'): Promise<DecisionDeLaLeccion> {
  const url = urlDe(agencyId, `/${encodeURIComponent(leccionId)}/decision`)
  if (url === null || leccionId.trim() === '') return { kind: 'no_disponible' }
  let res: Response
  try {
    res = await agentFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision }) })
  } catch {
    return { kind: 'no_disponible' }
  }
  // 409: otra persona ya la decidió; 404: ya no existe. En los dos casos, lo que se ve quedó viejo.
  if (res.status === 409 || res.status === 404) return { kind: 'conflicto' }
  if (!res.ok) return { kind: 'no_disponible' }
  const r = ResultadoSchema.safeParse(await res.json().catch(() => null))
  return r.success ? { kind: 'ok', resultado: r.data.resultado } : { kind: 'no_disponible' }
}
