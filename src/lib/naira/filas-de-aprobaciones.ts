/**
 * filas-de-aprobaciones.ts — todo lo que Naira propone, en UNA tabla (Nico, 18-10-2026: «todo lo que hay que aprobar
 * debería quedar en una tabla para poder ver todo lo que Naira muestra o propone»).
 *
 * Junta las propuestas de acción (`GET …/naira/actions`) y las de cambio de modo (`GET …/naira/cambios-de-modo`) en
 * filas, separadas en «Por decidir» y «Decididas». Las acciones conservan el ORDEN DEL SERVIDOR (13-05); los cambios de
 * modo se intercalan sin moverlas: por vencimiento entre lo por decidir y por fecha de la propuesta (lo nuevo primero)
 * entre lo decidido. Puro: sin red, sin reloj.
 */

import type { CambioDeModo } from '@/lib/api/naira/cambios-de-modo'
import type { NairaActionSummary } from '@/lib/api/naira/contrato'
import { CLAVE_DEL_DESTINO_EXTERNO, grupoDeLaPropuesta } from '@/lib/naira/vocabulario-de-aprobaciones'
import { CLAVE_DEL_ROL } from '@/lib/naira/vocabulario-de-seguimiento'

export type FilaDeAprobacion =
  | { readonly kind: 'accion'; readonly clave: string; readonly accion: NairaActionSummary }
  | { readonly kind: 'modo'; readonly clave: string; readonly cambio: CambioDeModo }

export interface FilasDeAprobaciones {
  readonly porDecidir: readonly FilaDeAprobacion[]
  readonly decididas: readonly FilaDeAprobacion[]
}

const instante = (iso: string): number => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

/** Mete `nueva` antes de la primera fila para la que `vaAntes(nueva, fila)` es verdad (o al final). */
function intercalar(filas: FilaDeAprobacion[], nueva: FilaDeAprobacion, vaAntes: (a: FilaDeAprobacion, b: FilaDeAprobacion) => boolean): void {
  const i = filas.findIndex((f) => vaAntes(nueva, f))
  if (i === -1) filas.push(nueva)
  else filas.splice(i, 0, nueva)
}

const venceEn = (f: FilaDeAprobacion): string => (f.kind === 'accion' ? f.accion.venceEn : f.cambio.expiraEn)
const propuestaEn = (f: FilaDeAprobacion): string => (f.kind === 'accion' ? f.accion.propuestaEn : f.cambio.propuestoEn)

export function filasDeAprobaciones(acciones: readonly NairaActionSummary[], cambios: readonly CambioDeModo[] | null): FilasDeAprobaciones {
  const porDecidir: FilaDeAprobacion[] = []
  const decididas: FilaDeAprobacion[] = []
  acciones.forEach((accion, i) => {
    const fila: FilaDeAprobacion = { kind: 'accion', clave: `accion-${i}-${accion.proposalId}`, accion }
    if (grupoDeLaPropuesta(accion.estado) === 'por_decidir') porDecidir.push(fila)
    else decididas.push(fila)
  })
  for (const cambio of cambios ?? []) {
    const fila: FilaDeAprobacion = { kind: 'modo', clave: `modo-${cambio.id}`, cambio }
    if (cambio.estado === 'abierto') intercalar(porDecidir, fila, (a, b) => instante(venceEn(a)) < instante(venceEn(b)))
    else intercalar(decididas, fila, (a, b) => instante(propuestaEn(a)) > instante(propuestaEn(b)))
  }
  return { porDecidir, decididas }
}

/** Una página de las filas (la primera es la 1). */
export function paginaDe<T>(filas: readonly T[], pagina: number, porPagina: number): readonly T[] {
  const desde = (Math.max(1, pagina) - 1) * porPagina
  return filas.slice(desde, desde + porPagina)
}

/** A quién le llega una acción, en palabras: un ROL de dominio (B-5), el grupo de una externa o el otro agente. */
export function paraDeLaAccion(t: (clave: string) => string, accion: NairaActionSummary): string {
  const d = accion.destinatario
  // El grupo de una externa se escribió para ir después de «Para:» («propietarios de…»): en su columna va con mayúscula.
  const conMayuscula = (s: string) => s.charAt(0).toLocaleUpperCase('es') + s.slice(1)
  if (d.kind === 'rol') return conMayuscula(t(CLAVE_DEL_ROL[d.rol]))
  if (d.kind === 'externo') return conMayuscula(t(CLAVE_DEL_DESTINO_EXTERNO[d.aQuien]))
  return d.evento
}
