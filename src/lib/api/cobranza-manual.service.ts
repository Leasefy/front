/**
 * La cobranza a mano — `/inmobiliaria/cobranza/*` del back y la carta a mano
 * del micro (COBRANZA-MANUAL, 04-10-2026).
 *
 * 🔴 Nada de esto le escribe a un inquilino: registrar una gestión sólo anota,
 * traer la cartera sólo la pone en Cobranza y la carta se descarga sin enviar.
 *
 * Los cuerpos se arman clave por clave: el back valida con
 * `forbidNonWhitelisted: true` y una clave de más es un 400.
 */
import { apiClient } from '@/lib/api/client'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import type {
  DatosDeLaCarta,
  DeDondeSaleLaCobranza,
  EstadoDeLaPromesa,
  GestionNueva,
  HistorialDeLaPersona,
  EntradaDelHistorial,
  PromesasDelEquipo,
  QuienEs,
  ResultadoDeLaCarta,
  ResultadoDeTraerLaCartera,
} from './cobranza-manual.types'

const BASE = '/inmobiliaria/cobranza'

/** La parte del cuerpo que dice de quién es. */
export function aQuien(quien: QuienEs): Record<string, string> {
  if ('contractId' in quien) {
    return quien.cuotaId
      ? { contractId: quien.contractId, cuotaId: quien.cuotaId }
      : { contractId: quien.contractId }
  }
  if ('documento' in quien) return { documento: quien.documento }
  return { deudorId: quien.deudorId }
}

/** La cadena de consulta del historial. */
export function consultaDelHistorial(quien: QuienEs): string {
  if ('contractId' in quien) return `contrato=${encodeURIComponent(quien.contractId)}`
  if ('documento' in quien) return `documento=${encodeURIComponent(quien.documento)}`
  return `deudor=${encodeURIComponent(quien.deudorId)}`
}

export function cuerpoDeLaGestion(quien: QuienEs, gestion: GestionNueva): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = { tipo: gestion.tipo, ...aQuien(quien) }
  if (gestion.tipo !== 'NOTA' && gestion.resultado) cuerpo.resultado = gestion.resultado
  const comentario = gestion.comentario?.trim()
  if (comentario) cuerpo.comentario = comentario
  if (gestion.promesa) {
    cuerpo.promesa = { fecha: gestion.promesa.fecha, montoCop: gestion.promesa.montoCop }
  }
  return cuerpo
}

export const cobranzaManualApi = {
  /** Registrar una gestión (y su promesa). No manda nada a nadie. */
  async registrar(quien: QuienEs, gestion: GestionNueva): Promise<{ gestion: EntradaDelHistorial }> {
    return apiClient.post<{ gestion: EntradaDelHistorial }>(
      `${BASE}/gestiones`,
      cuerpoDeLaGestion(quien, gestion),
    )
  },

  /** El historial de una persona: lo del equipo y lo del agente, juntos. */
  async historial(quien: QuienEs): Promise<HistorialDeLaPersona> {
    return apiClient.get<HistorialDeLaPersona>(`${BASE}/gestiones?${consultaDelHistorial(quien)}`)
  },

  /** Las promesas del equipo con su estado de hoy. */
  async promesas(estado?: EstadoDeLaPromesa): Promise<PromesasDelEquipo> {
    return apiClient.get<PromesasDelEquipo>(
      estado ? `${BASE}/promesas?estado=${estado}` : `${BASE}/promesas`,
    )
  },

  /** Pasarle YA a Cobranza la cartera de los contratos. No contacta a nadie. */
  async traerLaCartera(): Promise<ResultadoDeTraerLaCartera> {
    return apiClient.post<ResultadoDeTraerLaCartera>(`${BASE}/traer-la-cartera`, {})
  },

  /** Por dónde le llega la cartera a Cobranza y por qué. */
  async deDondeSale(): Promise<DeDondeSaleLaCobranza> {
    return apiClient.get<DeDondeSaleLaCobranza>(`${BASE}/de-donde-sale`)
  },
}

/**
 * La carta prejurídica a mano (micro). 200 = el PDF; 422 = qué datos faltan.
 * Cualquier otro fallo sube como `ApiError` (con su `message` en español).
 */
export async function generarCartaAMano(args: {
  agentUrl: string
  agencyId: string
  debtorId: string
  datos: DatosDeLaCarta
}): Promise<ResultadoDeLaCarta> {
  const datos: Record<string, string> = {}
  for (const [k, v] of Object.entries(args.datos)) {
    const t = typeof v === 'string' ? v.trim() : ''
    if (t) datos[k] = t
  }
  const res = await agentFetch(
    `${args.agentUrl}/api/agency/${args.agencyId}/cartera/legal-artifacts/carta-a-mano`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debtorId: args.debtorId, datos }),
    },
  )
  if (res.status === 422) {
    const cuerpo = (await res.json()) as {
      faltan?: Array<{ campo: string; etiqueta: string }>
      conocidos?: Record<string, string>
    }
    return {
      tipo: 'faltan-datos',
      faltan: (cuerpo.faltan ?? []) as Array<{ campo: never; etiqueta: string }>,
      conocidos: cuerpo.conocidos ?? {},
    }
  }
  if (!res.ok) throw await falloDelMicro(res)
  const archivo = await res.blob()
  return { tipo: 'pdf', archivo, nombre: `carta-prejuridica-${args.debtorId.slice(0, 8)}.pdf` }
}

/**
 * Qué sabe el sistema y qué falta para la carta, SIN armarla (al abrir el
 * formulario): no deja rastro ni genera nada.
 */
export async function revisarCartaAMano(args: {
  agentUrl: string
  agencyId: string
  debtorId: string
}): Promise<Extract<ResultadoDeLaCarta, { tipo: 'faltan-datos' }>> {
  const res = await agentFetch(
    `${args.agentUrl}/api/agency/${args.agencyId}/cartera/legal-artifacts/carta-a-mano`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debtorId: args.debtorId, revisar: true, datos: {} }),
    },
  )
  if (!res.ok) throw await falloDelMicro(res)
  const cuerpo = (await res.json()) as {
    faltan?: Array<{ campo: string; etiqueta: string }>
    conocidos?: Record<string, string>
  }
  return {
    tipo: 'faltan-datos',
    faltan: (cuerpo.faltan ?? []) as Array<{ campo: never; etiqueta: string }>,
    conocidos: cuerpo.conocidos ?? {},
  }
}
