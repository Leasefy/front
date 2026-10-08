/**
 * El experimento de cómo Laura ofrece el acuerdo, para el /admin de Leasefy
 * (07-10-2026, Nico: «una persona aprueba, y es Leasefy para todas»).
 *
 * Back: `GET/POST /api/v1/admin/experiments/laura-ofrece-el-acuerdo[/empezar|/pausar|/adoptar]`
 * (proxy al micro, `back/src/admin/resources/experiments/`). La forma de la
 * respuesta es `EstadoDelExperimento` del micro
 * (`agent/src/cartera/experimentos/el-acuerdo-db.ts`).
 */

import { adminApi } from '@/lib/admin/api'
import { fmtCOP } from '@/lib/admin/format'

export const FORMA_COMO_HOY = 'a-como-hoy'
export const FORMA_MENOS_CUOTAS = 'b-menos-cuotas'
export type Forma = typeof FORMA_COMO_HOY | typeof FORMA_MENOS_CUOTAS

export const MAX_CUOTAS_POR_DEFECTO = 2
export const MAX_CUOTAS_MINIMO = 1
export const MAX_CUOTAS_MAXIMO = 12

export interface ResumenDeLaForma {
  variantKey: string
  asignados: number
  medidos: number
  sinDatos: number
  enCurso: number
  plataTotal: number
  plataPorDeudor: number
  conAlgunPago: number
}

export type Recomendacion =
  | { tipo: 'falta_muestra'; faltan: number }
  | { tipo: 'gana'; variantKey: string }
  | { tipo: 'empate' }

export interface EstadoDelExperimento {
  disponible: boolean
  experimentKey: string
  estado: 'sin_empezar' | 'running' | 'paused' | 'completed'
  maxCuotas: number | null
  startedAt: string | null
  endedAt: string | null
  diasDeLaMedicion: number
  muestraMinimaPorForma: number
  formas: ResumenDeLaForma[]
  comparacion: { diferencia: number; bajo: number; alto: number; significativa: boolean } | null
  recomendacion: Recomendacion
  adoptada: { variantKey: string; adoptadaPor: string; adoptadaAt: string } | null
  inmobiliariasQueLoApagaron: number
}

const BASE = '/experiments/laura-ofrece-el-acuerdo'

export function verElExperimento(signal?: AbortSignal): Promise<EstadoDelExperimento> {
  return adminApi<EstadoDelExperimento>(BASE, { signal, noForbiddenRedirect: true })
}

export function empezarElExperimento(maxCuotas: number): Promise<EstadoDelExperimento> {
  return adminApi<EstadoDelExperimento>(`${BASE}/empezar`, { method: 'POST', body: { maxCuotas }, noForbiddenRedirect: true })
}

export function pausarElExperimento(): Promise<EstadoDelExperimento> {
  return adminApi<EstadoDelExperimento>(`${BASE}/pausar`, { method: 'POST', body: {}, noForbiddenRedirect: true })
}

export function adoptarLaGanadora(variantKey: Forma): Promise<EstadoDelExperimento> {
  return adminApi<EstadoDelExperimento>(`${BASE}/adoptar`, {
    method: 'POST',
    body: { variantKey },
    noForbiddenRedirect: true,
  })
}

/** El mismo rango que el back y el micro: un entero de 1 a 12. */
export function maxCuotasValido(texto: string): number | null {
  const t = texto.trim()
  if (!/^\d{1,2}$/.test(t)) return null
  const n = Number(t)
  return n >= MAX_CUOTAS_MINIMO && n <= MAX_CUOTAS_MAXIMO ? n : null
}

/** El nombre de cada forma, para una persona. */
export function nombreDeLaForma(variantKey: string, maxCuotas: number | null): string {
  if (variantKey === FORMA_COMO_HOY) return 'A · como hoy'
  if (variantKey === FORMA_MENOS_CUOTAS) {
    if (maxCuotas === null) return 'B · menos cuotas'
    return maxCuotas <= 1 ? 'B · sólo pago total' : `B · como mucho ${maxCuotas} cuotas`
  }
  return variantKey
}

/** Qué hace cada forma, en una frase. */
export function queHaceLaForma(variantKey: string, maxCuotas: number | null): string {
  if (variantKey === FORMA_COMO_HOY) return 'Laura ofrece las cuotas que autoriza cada inmobiliaria, como hoy.'
  if (maxCuotas === null) return 'Laura ofrece menos cuotas que las que autoriza la inmobiliaria.'
  const tope = maxCuotas <= 1 ? 'sólo el pago total' : `como mucho ${maxCuotas} cuotas`
  return `Laura ofrece ${tope}, aunque la inmobiliaria autorice más. A quien ya tiene ${maxCuotas <= 1 ? 'pago total' : `${maxCuotas} o menos`}, no le cambia nada.`
}

/** La recomendación en una frase. */
export function fraseDeLaRecomendacion(e: EstadoDelExperimento): string {
  const r = e.recomendacion
  if (r.tipo === 'falta_muestra') {
    return `Todavía no hay con qué decidir: faltan ${r.faltan} deudores medidos (se necesitan ${e.muestraMinimaPorForma} por forma, con sus ${e.diasDeLaMedicion} días cumplidos).`
  }
  if (r.tipo === 'empate') {
    return 'Con lo medido, ninguna de las dos recupera claramente más plata. Lo prudente es seguir como hoy.'
  }
  const c = e.comparacion
  const cuanto = c ? fmtCOP(Math.abs(Math.round(c.diferencia))) : null
  return `${nombreDeLaForma(r.variantKey, e.maxCuotas)} recupera más plata en ${e.diasDeLaMedicion} días${cuanto ? `: ${cuanto} más por deudor` : ''}. La diferencia no es casualidad (intervalo del 95 % sin el cero).`
}

/** El estado de la corrida para la pill. */
export function estadoParaMostrar(e: EstadoDelExperimento): { texto: string; tono: 'ok' | 'warn' | 'muted' | 'info' } {
  if (e.estado === 'running') return { texto: 'corriendo', tono: 'ok' }
  if (e.estado === 'paused') return { texto: 'en pausa', tono: 'warn' }
  if (e.estado === 'completed') return { texto: 'terminado', tono: 'info' }
  return { texto: 'sin empezar', tono: 'muted' }
}
