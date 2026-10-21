/**
 * El seguimiento de una cotización del Cotizador (QA de los agentes,
 * 19-10-2026, COTIZ-17/18; decisiones de Nico):
 *
 *   · el nombre del candidato (antes la lista decía «Ref. 9e1f341d»);
 *   · «Avanzar con la recomendada» guarda la aseguradora elegida, con quién y
 *     cuándo (es lo mismo que «Guardar la opción elegida»);
 *   · «Radicar la póliza» registra a mano su número.
 *
 * Lo guarda el micro en una tabla nueva (migración para Víctor). Sin ella el
 * detalle trae `disponible: false` y guardar responde 503 FALTA_UNA_MIGRACION:
 * la pantalla lo dice y sigue funcionando como antes.
 */

import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import type { components } from '@/lib/api/generated/agent'

export type SeguimientoDeLaCotizacion = components['schemas']['AgencyCotizadorSeguimiento']

export interface CambiosDelSeguimiento {
  opcionElegida?: string | null
  polizaNumero?: string | null
}

/** Tope del micro (`agent.cotizador_seguimiento.poliza_numero`). */
export const LARGO_MAXIMO_DE_LA_POLIZA = 80

/** PUT …/seguimiento. Lanza el `ApiError` del micro si no sale bien. */
export async function guardarSeguimiento(
  agencyId: string,
  quoteId: string,
  cambios: CambiosDelSeguimiento,
): Promise<SeguimientoDeLaCotizacion> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? ''
  const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cotizador/quote/${quoteId}/seguimiento`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cambios),
  })
  if (!res.ok) throw await falloDelMicro(res)
  return (await res.json()) as SeguimientoDeLaCotizacion
}

/** ¿El micro dijo que falta la actualización de la base? (503 FALTA_UNA_MIGRACION). */
export function faltaLaActualizacion(err: unknown): boolean {
  const e = err as { status?: number; code?: string } | null
  return e?.status === 503 && e.code === 'FALTA_UNA_MIGRACION'
}

/** El enlace del caso (lo abre sólo quien es del equipo y tiene el cotizador). */
export function enlaceDelCaso(origen: string, quoteId: string): string {
  return `${origen.replace(/\/$/, '')}/panel/inmobiliaria/postulaciones/asegurabilidad/${quoteId}`
}

/** Cómo se nombra el caso: el nombre del candidato o, sin él, su referencia. */
export function quienEsElCandidato(nombre: string | null | undefined, referencia: string): string {
  const n = (nombre ?? '').trim()
  return n || `Ref. ${referencia}`
}

/** El título de la tarea del asesor (cabe en el tope de la agenda). */
export function tituloDeLaTareaDelAsesor(nombre: string | null | undefined): string {
  const n = (nombre ?? '').trim()
  return n ? `Seguir la asegurabilidad de ${n}` : 'Seguir una cotización de asegurabilidad'
}

/** La nota de la tarea: qué salió y el enlace. */
export function notaDeLaTareaDelAsesor(p: {
  aseguradora: string | null
  /** `true` = ya es la elegida; `false` = la recomendada. */
  elegida: boolean
  primaMensual: string | null
  polizaNumero: string | null
  enlace: string
}): string {
  const lineas: string[] = []
  if (p.aseguradora) {
    const prima = p.primaMensual ? ` (${p.primaMensual} al mes)` : ''
    const poliza = p.polizaNumero ? `, póliza N.º ${p.polizaNumero}` : ''
    lineas.push(`${p.elegida ? 'Opción elegida' : 'Recomendada'}: ${p.aseguradora}${prima}${poliza}.`)
  }
  lineas.push(`La cotización: ${p.enlace}`)
  return lineas.join('\n')
}
