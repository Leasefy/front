/**
 * El director del Piloto (fase 1): las reglas PURAS con que el front lo pinta.
 *
 * Nada de esto decide nada del negocio: el micro manda el plan, las metas y el
 * gasto. Esto sólo los pone en palabras y números de Colombia, y ordena la
 * Bandeja como dice el contrato (`director-api-front.md`, «Bandeja»).
 */

type Idioma = 'es' | 'en'

const localeDe = (idioma: Idioma) => (idioma === 'en' ? 'en-US' : 'es-CO')

/**
 * La Bandeja con el director: primero lo que pidió el director, de mayor a
 * menor prioridad; después el orden de siempre, quien más lleva esperando.
 * Orden estable y sin tocar la lista que recibe.
 */
export function ordenarBandeja<T extends { desde: string; director?: { prioridad: number } | null }>(
  items: readonly T[],
): T[] {
  const espera = (i: T) => {
    const t = new Date(i.desde).getTime()
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY
  }
  return [...items].sort((a, b) => {
    const pa = a.director ? a.director.prioridad : null
    const pb = b.director ? b.director.prioridad : null
    if (pa !== null && pb !== null && pa !== pb) return pb - pa
    if (pa !== null && pb === null) return -1
    if (pa === null && pb !== null) return 1
    return espera(a) - espera(b)
  })
}

/** Un valor de una meta en su unidad: «84 %», «12 días», «36 h». */
export function valorDeMeta(valor: number | null, unidad: string, idioma: Idioma = 'es'): string {
  if (valor === null || !Number.isFinite(valor)) return '—'
  const loc = localeDe(idioma)
  if (unidad === 'porcentaje') {
    return new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: 1 }).format(valor)
  }
  const n = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(valor)
  if (unidad === 'dias') {
    if (idioma === 'en') return `${n} ${valor === 1 ? 'day' : 'days'}`
    return `${n} ${valor === 1 ? 'día' : 'días'}`
  }
  if (unidad === 'horas') return `${n} h`
  return n
}

/** Lo que va en el campo de «ajustar»: en la unidad que se lee (88, no 0,88). */
export function objetivoEnElCampo(valor: number, unidad: string): string {
  const enPantalla = unidad === 'porcentaje' ? Math.round(valor * 1000) / 10 : valor
  return String(enPantalla).replace('.', ',')
}

/** Lo que se escribió en el campo, de vuelta a la unidad del micro. `null` si no es un número. */
export function objetivoDesdeElCampo(escrito: string, unidad: string): number | null {
  const limpio = escrito.trim().replace(/\s|%/g, '').replace(',', '.')
  if (limpio === '' || !/^-?\d+(\.\d+)?$/.test(limpio)) return null
  const n = Number(limpio)
  if (!Number.isFinite(n)) return null
  return unidad === 'porcentaje' ? Math.round(n * 10) / 1000 : n
}

/** Dólares con dos decimales (lo único técnico que la inmobiliaria ve del modelo: cuánto cuesta). */
export function formatoUsd(usd: number, idioma: Idioma = 'es'): string {
  return new Intl.NumberFormat(localeDe(idioma), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd)
}

/** `claude-fable-5-1` → «Claude Fable 5.1». Un id que no se reconoce se muestra tal cual. */
export function nombreDelModelo(id: string | null): string | null {
  if (!id) return null
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(id)
  if (!m) return id
  const familia = (m[1] as string).charAt(0).toUpperCase() + (m[1] as string).slice(1)
  return `Claude ${familia} ${m[2]}.${m[3]}`
}

/** La fecha de HOY en Bogotá (`YYYY-MM-DD`), que es la que usa el micro para «el plan de hoy». */
export function fechaDeHoyEnBogota(ahora: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
}

/** «5:02 a. m.» en hora de Bogotá. */
export function horaEnBogota(iso: string | null, idioma: Idioma = 'es'): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString(localeDe(idioma), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  })
}

/** «29 de septiembre» (o con año si no es el año en curso). Acepta `YYYY-MM-DD` o ISO. */
export function fechaLarga(fecha: string | null, idioma: Idioma = 'es', ahora: Date = new Date()): string | null {
  if (!fecha) return null
  const d = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T12:00:00-05:00`) : new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  const mismoAno = fechaDeHoyEnBogota(ahora).slice(0, 4) === fechaDeHoyEnBogota(d).slice(0, 4)
  return d.toLocaleDateString(localeDe(idioma), {
    day: 'numeric',
    month: 'long',
    ...(mismoAno ? {} : { year: 'numeric' }),
    timeZone: 'America/Bogota',
  })
}

/** Una clave que no tiene nombre propio, leída como palabra: `niti` → «Niti». */
export function humanizarClave(clave: string): string {
  const s = clave.replace(/[._-]+/g, ' ').trim().toLowerCase()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : clave
}
