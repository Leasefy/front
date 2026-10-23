/**
 * Revisora r25 (C5, ronda 26): varias pantallas de Cobranza pegaban el error
 * CRUDO del hook a la frase («No pudimos cargar las cartas. 500», «…
 * fetch_failed», un texto en inglés del micro). Los hooks viejos sólo guardan
 * ese texto; esto lo vuelve algo que `FalloDeCarga` sabe decir (el status, la
 * red caída o el asistente que no contesta), sin mostrarlo nunca tal cual.
 */
import { caidaDelAsistente } from '@/lib/api/agent-fetch'
import { suenaARedCaida } from '@/lib/conexion/leer-el-error'

export function falloDelTexto(error: unknown): unknown {
  if (error === null || error === undefined || error === '') return null
  if (typeof error !== 'string') return error
  const texto = error.trim()
  const status = /^\d{3}$/.test(texto) ? Number(texto) : /\b([45]\d\d)\b/.exec(texto)?.[1]
  if (status !== undefined) return { status: Number(status), message: texto }
  if (texto === 'fetch_failed' || suenaARedCaida(texto)) return caidaDelAsistente(new TypeError('Failed to fetch'))
  if (texto === 'not_configured' || texto.includes('NEXT_PUBLIC_AGENT_URL')) {
    return caidaDelAsistente(new TypeError('Failed to fetch'))
  }
  return { status: 500, message: texto }
}
