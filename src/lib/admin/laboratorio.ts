/**
 * laboratorio.ts — lo puro del Laboratorio del maestro en /admin → Maestro (Nico, 19-10-2026: «quiero que al final el
 * maestro sea así de crack»; «Repetición + Correr ahora»).
 *
 * QUÉ ES: la línea de tiempo de la repetición (los pasos de la bitácora con sus tiempos reales, comprimidos para verse en
 * unos 20 segundos), cuánto lleva cada rol del maestro, los nombres donde la bitácora dice «I3», y cómo se pinta cada
 * veredicto. Sin React.
 */

import type { LaboratorioResponse, PasoDelMaestro, RolDelMaestro, VeredictoDelEnsayo } from '@/lib/admin/agent-api'

export const ROLES: ReadonlyArray<{ rol: RolDelMaestro; nombre: string; hace: string }> = [
  { rol: 'lector', nombre: 'Lector', hace: 'lee el diario de cada Naira' },
  { rol: 'pensador', nombre: 'Pensador', hace: 'busca qué mejorar y lo propone' },
  { rol: 'verificador', nombre: 'Verificador', hace: 'ensaya cada propuesta con 30 días reales' },
  { rol: 'revisor', nombre: 'Revisor', hace: 'intenta tumbar cada propuesta' },
  { rol: 'medidor', nombre: 'Medidor', hace: 'mide si sirvió lo aplicado' },
  { rol: 'archivista', nombre: 'Archivista', hace: 'abre, cierra y guarda la noche' },
]

/** Cuánto dura la repetición entera (más o menos) y los topes de cada espera. */
export const DURACION_DE_LA_REPETICION_MS = 20_000
const ESPERA_MINIMA_MS = 90
const ESPERA_MAXIMA_MS = 1_600

/**
 * Las esperas entre un paso y el siguiente: proporcionales a las reales, comprimidas para que la noche entera dure unos
 * 20 segundos, sin bajar de 90 ms ni pasar de 1,6 s. La primera es 0.
 */
export function lineaDeTiempo(pasos: readonly Pick<PasoDelMaestro, 'en'>[]): number[] {
  if (pasos.length === 0) return []
  const reales = pasos.map((p, i) => (i === 0 ? 0 : Math.max(0, Date.parse(p.en) - Date.parse(pasos[i - 1]?.en ?? p.en))))
  const total = reales.reduce((s, x) => s + x, 0)
  const escala = total > 0 ? DURACION_DE_LA_REPETICION_MS / total : 0
  return reales.map((r, i) => (i === 0 ? 0 : Math.round(Math.min(ESPERA_MAXIMA_MS, Math.max(ESPERA_MINIMA_MS, r * escala)))))
}

/** Lo que lleva cada rol hasta el paso `n` (sin incluirlo) contra lo que hará en la noche entera. */
export function avanceDeLosRoles(pasos: readonly PasoDelMaestro[], n: number): Record<RolDelMaestro, { hechos: number; total: number; ultimo: PasoDelMaestro | null }> {
  const out = Object.fromEntries(ROLES.map((r) => [r.rol, { hechos: 0, total: 0, ultimo: null as PasoDelMaestro | null }])) as Record<
    RolDelMaestro,
    { hechos: number; total: number; ultimo: PasoDelMaestro | null }
  >
  pasos.forEach((p, i) => {
    const x = out[p.rol]
    if (!x) return
    x.total++
    if (i < n) {
      x.hechos++
      x.ultimo = p
    }
  })
  return out
}

/** alias («I3») → nombre: del anillo de la noche y de los pasos del lector (en vivo, antes de que haya anillo). */
export function nombresPorAlias(lab: Pick<LaboratorioResponse, 'inmobiliarias'>, pasos: readonly PasoDelMaestro[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const i of lab.inmobiliarias) m[i.alias] = i.nombre
  for (const p of pasos) {
    const alias = typeof p.detalle.alias === 'string' ? p.detalle.alias : null
    if (alias && p.nombre && !m[alias]) m[alias] = p.nombre
  }
  return m
}

/** Las inmobiliarias del anillo: las de la noche guardada o, en vivo, las que el lector ya leyó. */
export function inmobiliariasDelAnillo(lab: Pick<LaboratorioResponse, 'inmobiliarias'>, pasos: readonly PasoDelMaestro[]): LaboratorioResponse['inmobiliarias'] {
  if (lab.inmobiliarias.length > 0) return lab.inmobiliarias
  const vistas = new Map<string, LaboratorioResponse['inmobiliarias'][number]>()
  for (const p of pasos) {
    if (p.paso !== 'leyo' || typeof p.detalle.alias !== 'string') continue
    vistas.set(p.detalle.alias, {
      alias: p.detalle.alias,
      tenantId: typeof p.detalle.tenantId === 'string' ? p.detalle.tenantId : p.detalle.alias,
      nombre: p.nombre ?? p.detalle.alias,
      diarios: Number(p.detalle.diarios ?? 0),
      preguntas: Number(p.detalle.preguntas ?? 0),
      categorias: null,
      agentes: [],
    })
  }
  return [...vistas.values()].sort((a, b) => Number(a.alias.slice(1)) - Number(b.alias.slice(1)))
}

/** La hora de un paso en Bogotá («01:30:04»). */
export function horaDeBogota(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '--:--:--'
  return new Date(t - 5 * 3_600_000).toISOString().slice(11, 19)
}

export const VEREDICTO: Readonly<Record<VeredictoDelEnsayo, { texto: string; tono: 'ok' | 'bad' | 'neutro' | 'vacio' }>> = {
  mejora: { texto: 'mejora', tono: 'ok' },
  neutro: { texto: 'no cambia mucho', tono: 'neutro' },
  empeora: { texto: 'empeora', tono: 'bad' },
  sin_datos: { texto: 'sin datos', tono: 'vacio' },
}

/** El valor más alto de unas grillas (para la escala de grises del campo de diferencias). */
export function maximoDe(grillas: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>> | null>): number {
  let m = 0
  for (const g of grillas) for (const fila of g ?? []) for (const v of fila) if (v > m) m = v
  return m
}
