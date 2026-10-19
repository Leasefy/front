'use client'

/**
 * cambios-de-modo.ts — las propuestas de Naira de cambiar el modo de un agente del Piloto (paso 2 de «Naira lo sabe
 * todo», Nico 18-10-2026: «Propone, una persona aprueba», «Solo en el panel»).
 *
 * `GET  /api/agency/{agencyId}/naira/cambios-de-modo`                       → las de los últimos 30 días, lo abierto primero.
 * `POST /api/agency/{agencyId}/naira/cambios-de-modo/{cambioId}/decision`   → `{ decision: 'aprobar' | 'rechazar' }`.
 *
 * Va aparte de `cliente.ts` a propósito: aprobar SUBIR a Automático puede pedir el segundo factor de ahora (403
 * `SEGUNDO_FACTOR_RECIENTE`, como el selector del Piloto) y el transporte de Naira convierte todo 403 en `sin_permiso`
 * sin mirar el cuerpo. Acá ese 403 es `segundo_factor` y el diálogo `ConfirmarAutomatico` pide las seis cifras.
 * Nunca tira: todo lo que sale mal es un `kind`.
 *
 * Paso 3 (Nico, 18-10-2026): también las que DESCUBRIÓ Naira con el modelo (`origen: 'naira'`, con su porqué en
 * español), que pueden ser frenar un agente (`regla: 'frenar'`, `a: 'apagado'`). Un micro anterior no manda el origen:
 * se lee como `regla`.
 */

import { z } from 'zod'

import { agentFetch } from '@/lib/api/agent-fetch'

const Modo = z.enum(['sombra', 'copiloto', 'autonomo'])
/** El destino: un modo o `apagado` (frenar el agente para la inmobiliaria). */
const Destino = z.enum(['sombra', 'copiloto', 'autonomo', 'apagado'])
const Razon = z.enum(['modo_cambiado', 'ya_no_corresponde', 'no_se_pudo_aplicar'])

export const CambioDeModoSchema = z.object({
  id: z.string(),
  agente: z.string(),
  nombre: z.string(),
  de: Modo,
  a: Destino,
  regla: z.enum(['subir', 'bajar', 'manual', 'frenar']),
  /** Las cifras que la justifican; la frase se arma en el idioma del panel. */
  cifras: z.record(z.string(), z.number()),
  /** La misma frase, en español, armada por el micro (respaldo). */
  porQue: z.string(),
  /** Quién la pidió: las reglas fijas o Naira con el modelo («Lo descubrió Naira»). */
  origen: z.enum(['regla', 'naira']).default('regla'),
  /** El porqué en palabras de Naira (sólo las que descubrió ella; en español). */
  porqueDeNaira: z.string().nullable().default(null),
  propuestoEn: z.string(),
  expiraEn: z.string(),
  estado: z.enum(['abierto', 'aprobado', 'rechazado', 'vencido', 'aplicado', 'no_aplicado']),
  razon: Razon.nullable(),
})
export type CambioDeModo = z.infer<typeof CambioDeModoSchema>

const ListaSchema = z.object({ cambios: z.array(CambioDeModoSchema) })
const ResultadoSchema = z.object({ resultado: z.enum(['aplicado', 'no_aplicado', 'rechazado']), razon: Razon.nullable(), mensaje: z.string() })
export type ResultadoDelCambio = z.infer<typeof ResultadoSchema>

export type LecturaDeCambios =
  | { readonly kind: 'ok'; readonly cambios: readonly CambioDeModo[] }
  | { readonly kind: 'sin_permiso' }
  | { readonly kind: 'apagada' }
  | { readonly kind: 'no_disponible' }

export type DecisionDelCambio =
  | { readonly kind: 'ok'; readonly resultado: ResultadoDelCambio }
  | { readonly kind: 'segundo_factor'; readonly fallo: { readonly code: string } }
  | { readonly kind: 'conflicto'; readonly razon: string | null }
  | { readonly kind: 'no_disponible' }

const CODIGO_SEGUNDO_FACTOR_RECIENTE = 'SEGUNDO_FACTOR_RECIENTE'

function urlDe(agencyId: string, resto = ''): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base || agencyId.trim() === '') return null
  return `${base.replace(/\/+$/, '')}/api/agency/${encodeURIComponent(agencyId)}/naira/cambios-de-modo${resto}`
}

async function cuerpoDe(res: Response): Promise<unknown> {
  return res.json().catch(() => null)
}

export async function leerCambiosDeModo(agencyId: string): Promise<LecturaDeCambios> {
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
  const r = ListaSchema.safeParse(await cuerpoDe(res))
  return r.success ? { kind: 'ok', cambios: r.data.cambios } : { kind: 'no_disponible' }
}

export async function decidirCambioDeModo(agencyId: string, cambioId: string, decision: 'aprobar' | 'rechazar'): Promise<DecisionDelCambio> {
  const url = urlDe(agencyId, `/${encodeURIComponent(cambioId)}/decision`)
  if (url === null || cambioId.trim() === '') return { kind: 'no_disponible' }
  let res: Response
  try {
    res = await agentFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision }) })
  } catch {
    return { kind: 'no_disponible' }
  }
  const cuerpo = await cuerpoDe(res)
  if (res.status === 403) {
    const code = cuerpo && typeof cuerpo === 'object' ? (cuerpo as { code?: unknown }).code : undefined
    return code === CODIGO_SEGUNDO_FACTOR_RECIENTE ? { kind: 'segundo_factor', fallo: { code: CODIGO_SEGUNDO_FACTOR_RECIENTE } } : { kind: 'no_disponible' }
  }
  if (res.status === 409 || res.status === 404) {
    const razon = cuerpo && typeof cuerpo === 'object' ? (cuerpo as { reason?: unknown }).reason : null
    return { kind: 'conflicto', razon: typeof razon === 'string' ? razon : null }
  }
  if (!res.ok) return { kind: 'no_disponible' }
  const r = ResultadoSchema.safeParse(cuerpo)
  return r.success ? { kind: 'ok', resultado: r.data } : { kind: 'no_disponible' }
}
