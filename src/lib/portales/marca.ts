/**
 * marca.ts — cómo se dibuja un portal.
 *
 * ## Logo real cuando lo hay, monograma cuando no
 *
 * Nico pidió «cada portal con su logo». Hoy no tenemos ni uno: no hay archivos
 * en el repo y bajarlos del sitio de cada portal deja un logo con copyright sin
 * verificar dentro del producto. Redibujarlos de memoria o teñir un cuadrado
 * con «más o menos su color» es peor todavía: deja una **marca falsa de una
 * empresa que existe**, en la pantalla que le dice a la inmobiliaria dónde se
 * está publicando su inmueble.
 *
 * Es la misma decisión que ya está tomada para las aseguradoras
 * (`lib/aseguradoras/marca.ts` + `public/aseguradoras/PROCEDENCIA.md`), y se
 * repite acá por el mismo motivo. Cuando consigamos los archivos con su
 * licencia verificada, se agregan a `LOGOS` y cada tarjeta cambia sola.
 *
 * ## Por qué el monograma es neutro y no del color de cada portal
 *
 * `docs/DESIGN.md` §1: **un solo acento**. Seis portales con seis amarillos,
 * rojos y azules propios convierten la sección en un tablero de patrocinadores
 * y el color deja de significar nada. Acá significa una sola cosa: si ese
 * portal puede recibir avisos o no.
 */

/** Palabras que no aportan a la marca. */
const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'com', 'co'])

/**
 * Dos letras, siempre. Con una queda un cuadrado anémico; con tres deja de
 * leerse como marca.
 *
 * Dos palabras útiles → inicial de cada una. Una sola → sus dos primeras.
 */
export function inicialesDelPortal(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/[\s·.-]+/)
    .filter(Boolean)
    .filter((p) => !RELLENO.has(p.toLowerCase()))

  const utiles = palabras.length > 0 ? palabras : nombre.trim().split(/\s+/).filter(Boolean)
  if (utiles.length === 0) return '??'
  if (utiles.length >= 2) {
    return (utiles[0][0] + utiles[1][0]).toLocaleUpperCase('es-CO')
  }
  return utiles[0].slice(0, 2).toLocaleUpperCase('es-CO')
}

/**
 * Logos reales, por código de portal.
 *
 * 🔴 VACÍO A PROPÓSITO. Para agregar uno hacen falta las dos cosas:
 *   1. el archivo en `public/portales/`, y
 *   2. una línea en `public/portales/PROCEDENCIA.md` con de dónde salió y con
 *      qué licencia — igual que `public/aseguradoras/PROCEDENCIA.md`.
 *
 * Sin el punto 2 no entra: un logo sin procedencia es una demanda esperando.
 */
const LOGOS: Record<string, string> = {}

export interface MarcaDePortal {
  iniciales: string
  /** `undefined` mientras no tengamos el archivo con su licencia. */
  logo?: string
}

export function marcaDelPortal(portal: string, nombre: string): MarcaDePortal {
  return { iniciales: inicialesDelPortal(nombre), logo: LOGOS[portal] }
}

/**
 * 🔴 `SITIO_PROPIO` es el catálogo de Leasefy, no un portal de afuera: es el
 * único que publica solo. La pantalla lo separa porque la instrucción para la
 * persona es distinta —ahí no hay archivo que subir a ninguna parte—.
 */
export const EL_CATALOGO_DE_LEASEFY = 'SITIO_PROPIO'
