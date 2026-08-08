/**
 * País del campo de celular.
 *
 * **Hoy Leasefy solo opera en Colombia**, así que la lista tiene un solo país y
 * el campo no muestra selector — enseñar banderas de países donde no se puede
 * arrendar promete algo que el producto no hace.
 *
 * Existe igual como módulo (y no como un `+57` suelto en el JSX) por lo que sí
 * hacía falta: la **longitud** y el **prefijo de celular** salen de acá, que es
 * lo que impedía escribir "31178899000000" en un campo de 10 dígitos.
 *
 * Para habilitar otro país: agregar una fila a `PAISES`. El campo detecta que
 * hay más de uno y muestra el selector solo.
 */

export interface Pais {
  /** ISO 3166-1 alfa-2. */
  iso: string
  nombre: string
  /** Indicativo sin el "+". */
  indicativo: string
  /** Bandera en emoji — sin assets ni sprites. */
  bandera: string
  /** Cuántos dígitos tiene el número nacional (sin indicativo). */
  longitud: number
  /**
   * Con qué dígitos puede empezar un celular. Vacío = no se valida el prefijo.
   * En Colombia todos los móviles empiezan por 3.
   */
  prefijosCelular: string[]
  /** Ejemplo para el placeholder. */
  ejemplo: string
}

export const PAISES: Pais[] = [
  {
    iso: 'CO',
    nombre: 'Colombia',
    indicativo: '57',
    bandera: '🇨🇴',
    longitud: 10,
    prefijosCelular: ['3'],
    ejemplo: '3001112233',
  },
]

export const PAIS_POR_DEFECTO = 'CO'

export function paisPorIso(iso: string): Pais {
  return PAISES.find((p) => p.iso === iso) ?? PAISES[0]
}

/** Deja solo dígitos. */
export function soloDigitos(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * Número nacional sin recortar: solo le quita el indicativo si la persona lo
 * pegó de más ("+57 300…" o "57300…").
 */
function nacionalCrudo(raw: string, pais: Pais): string {
  const d = soloDigitos(raw)
  if (d.length > pais.longitud && d.startsWith(pais.indicativo)) {
    return d.slice(pais.indicativo.length)
  }
  return d
}

/**
 * Lo que se guarda mientras se escribe: recortado al largo del país, para que
 * el campo no acepte de más. Esto SÍ trunca — es una ayuda de tecleo.
 */
export function recortarAlPais(raw: string, iso: string = PAIS_POR_DEFECTO): string {
  const pais = paisPorIso(iso)
  return nacionalCrudo(raw, pais).slice(0, pais.longitud)
}

/**
 * Normaliza a E.164 (`+<indicativo><nacional>`), o `null` si no es válido.
 *
 * ⚠️ **No trunca, a diferencia del input.** Si llegan 11 dígitos para un país
 * de 10, se rechaza en vez de recortar: recortar en silencio mandaría el SMS
 * de verificación a un número que la persona nunca escribió.
 */
export function normalizarTelefono(raw: string, iso: string = PAIS_POR_DEFECTO): string | null {
  const pais = paisPorIso(iso)
  const d = nacionalCrudo(raw, pais)
  if (d.length !== pais.longitud) return null
  if (pais.prefijosCelular.length > 0 && !pais.prefijosCelular.some((p) => d.startsWith(p))) {
    return null
  }
  return `+${pais.indicativo}${d}`
}

/** Mensaje de error concreto — no un genérico inútil. */
export function errorTelefono(raw: string, iso: string = PAIS_POR_DEFECTO): string | null {
  const pais = paisPorIso(iso)
  const d = nacionalCrudo(raw, pais)
  if (d.length === 0) return 'Ingresa tu celular.'
  if (d.length !== pais.longitud) {
    return `El celular en ${pais.nombre} tiene ${pais.longitud} dígitos.`
  }
  if (pais.prefijosCelular.length > 0 && !pais.prefijosCelular.some((p) => d.startsWith(p))) {
    const lista = pais.prefijosCelular.join(' o ')
    return `Un celular en ${pais.nombre} empieza por ${lista}.`
  }
  return null
}
