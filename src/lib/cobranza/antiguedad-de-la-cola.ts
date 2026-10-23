/**
 * La antigüedad de una cola de trabajo de Cobranza (cartas por revisar,
 * disputas abiertas, escalaciones sin tomar, reportes por aprobar).
 *
 * Revisora r27 (K1 y K2, ronda 28): la cifra de esas pantallas repetía el
 * conteo de su pestaña («Por revisar 4» arriba y «Por revisar 4» en la
 * pestaña) y no llevaba barra. Lo que la pestaña NO dice es cuánto lleva
 * esperando lo más viejo y cómo se reparte la espera: eso es la cifra, con
 * tramos por ANTIGÜEDAD («0 a 7 días · 8 a 30 · más de 30»), una dimensión
 * distinta de la de las pestañas.
 *
 * Los días se cuentan enteros desde la fecha de entrada a la cola hasta hoy;
 * una fecha que no se lee no cuenta (no se inventa).
 */
import type { TramoDeLaCifra } from '@/components/pantalla/CifraHeroe'

const DIA = 86_400_000

export interface AntiguedadDeLaCola {
  /** Cuántos tienen fecha legible. */
  cuantos: number
  /** Los días que lleva el más viejo; null si no hay ninguno con fecha. */
  masVieja: number | null
  tramos: TramoDeLaCifra[]
}

export function diasDesde(fecha: string | null | undefined, ahora: Date = new Date()): number | null {
  if (!fecha) return null
  const t = new Date(fecha).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((ahora.getTime() - t) / DIA))
}

export function antiguedadDeLaCola(
  fechas: ReadonlyArray<string | null | undefined>,
  opciones: {
    es: boolean
    locale?: string
    ahora?: Date
    testid?: string
    /** La plata de cada uno (alineada con `fechas`): los tramos suman plata en vez de contar. */
    montos?: ReadonlyArray<number | null | undefined>
    /** Cómo se escribe la plata del tramo (obligatorio con `montos`). */
    formato?: (n: number) => string
  },
): AntiguedadDeLaCola {
  const { es, locale = es ? 'es-CO' : 'en-US', ahora = new Date(), testid, montos, formato } = opciones
  const pares = fechas
    .map((f, i) => ({ d: diasDesde(f, ahora), m: montos ? Math.max(0, Number(montos[i] ?? 0) || 0) : 1 }))
    .filter((p): p is { d: number; m: number } => p.d !== null)
  const dias = pares.map((p) => p.d)
  const cuenta = (min: number, max: number) =>
    pares.filter((p) => p.d >= min && p.d <= max).reduce((s, p) => s + p.m, 0)
  const fila = (clave: string, etiqueta: string, n: number, tono: TramoDeLaCifra['tono']): TramoDeLaCifra => ({
    clave,
    etiqueta,
    monto: n,
    tono,
    cifra: montos && formato ? formato(n) : n.toLocaleString(locale),
    'data-testid': testid ? `${testid}-tramo-${clave}` : undefined,
  })
  return {
    cuantos: dias.length,
    masVieja: dias.length > 0 ? Math.max(...dias) : null,
    tramos: [
      fila('hasta-7', es ? '0 a 7 días' : '0–7 days', cuenta(0, 7), 'neutro'),
      fila('hasta-30', es ? '8 a 30 días' : '8–30 days', cuenta(8, 30), 'aviso'),
      fila('mas-de-30', es ? 'Más de 30 días' : 'Over 30 days', cuenta(31, Number.POSITIVE_INFINITY), 'critico'),
    ],
  }
}

/** «6 días» / «1 día» / «hoy». */
export function diasEnPalabras(d: number, es: boolean): string {
  if (d === 0) return es ? 'hoy' : 'today'
  return es ? `${d} ${d === 1 ? 'día' : 'días'}` : `${d} ${d === 1 ? 'day' : 'days'}`
}
