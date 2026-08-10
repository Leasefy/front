/**
 * marca.ts — cómo se dibuja una aseguradora.
 *
 * ## Por qué monograma y no el logo real
 *
 * No tenemos los archivos. Y aproximar el logo de una empresa real —redibujarlo
 * de memoria, teñir un cuadrado con «más o menos su azul»— es peor que no
 * ponerlo: queda una marca falsa de una compañía que existe, en la pantalla que
 * le dice a alguien quién respalda su arriendo. Un monograma bien tipografiado
 * no finge ser nada.
 *
 * La costura está lista: en cuanto haya SVGs, se agregan a `LOGOS` y el
 * componente los usa en vez del monograma. Es un cambio de datos, no de diseño.
 *
 * ## Por qué el monograma es neutro y no del color de cada marca
 *
 * `docs/DESIGN.md` §1: **un solo acento**, cobalto. Nueve aseguradoras con
 * nueve azules y rojos propios convierten la sección en un tablero de logos de
 * patrocinadores. Acá el color significa una sola cosa —te respaldan o no— y
 * eso se lee de un vistazo.
 */

/** Palabras que no aportan a la marca: casi todas las aseguradoras las llevan. */
const RELLENO = new Set([
  'seguros',
  'seguro',
  'aseguradora',
  'compañia',
  'compañía',
  'cia',
  'la',
  'el',
  'los',
  'las',
  'de',
  'del',
  's.a.',
  'sa',
])

/**
 * Dos letras, siempre. Con una sola queda un cuadrado anémico; con tres deja de
 * leerse como marca.
 *
 * Dos palabras útiles → inicial de cada una. Una sola → sus dos primeras letras.
 */
export function inicialesDe(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/[\s·-]+/)
    .filter(Boolean)
    .filter((p) => !RELLENO.has(p.toLowerCase().replace(/[.,]/g, '')))

  const utiles = palabras.length > 0 ? palabras : nombre.trim().split(/\s+/).filter(Boolean)
  if (utiles.length === 0) return '??'

  if (utiles.length >= 2) {
    return (utiles[0][0] + utiles[1][0]).toLocaleUpperCase('es-CO')
  }
  return utiles[0].slice(0, 2).toLocaleUpperCase('es-CO')
}

/**
 * Logos reales, por nombre de la aseguradora tal como llega del agente.
 *
 * Vacío a propósito — ver la cabecera. Cuando lleguen los archivos:
 *   1. `public/aseguradoras/sura.svg`
 *   2. `sura: '/aseguradoras/sura.svg'` acá
 * y listo. El componente ya sabe preferirlo.
 */
const LOGOS: Record<string, string> = {}

export interface MarcaAseguradora {
  nombre: string
  iniciales: string
  /** `undefined` mientras no tengamos el archivo. */
  logo?: string
}

export function marcaDe(nombre: string): MarcaAseguradora {
  const clave = nombre.trim().toLowerCase()
  return { nombre, iniciales: inicialesDe(nombre), logo: LOGOS[clave] }
}

/**
 * Ordena para que la buena noticia vaya primero.
 *
 * Quien abre esta pantalla viene a saber quién lo respalda, no quién lo dejó
 * pasar. Dentro de cada grupo se conserva el orden que mandó el agente: no
 * inventamos un ranking entre aseguradoras que nos aprobaron igual.
 */
export function respaldanPrimero<T extends { aprobada: boolean }>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => Number(b.aprobada) - Number(a.aprobada))
}
