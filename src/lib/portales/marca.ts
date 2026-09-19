/**
 * marca.ts — cómo se dibuja un portal.
 *
 * ## Logo real cuando lo hay, monograma cuando no
 *
 * Nico pidió los logos reales (18-09-2026) y están puestos: cuatro de seis.
 * Cada uno con su procedencia y su licencia escritas en
 * `public/portales/PROCEDENCIA.md` — sin esa fila no entra ninguno, porque un
 * logo sin procedencia es una demanda esperando.
 *
 * 🔴 `fincaraiz.png` es **CC BY-SA 4.0**: pide atribución. Se usa sin modificar
 * y sólo para identificar al portal, que es el caso más defendible; si algún
 * día se compone dentro de otra pieza gráfica hay que poner el crédito o
 * sacarlo. El detalle está en PROCEDENCIA.md §B.
 *
 * Faltan Metrocuadrado —su sitio sirve el logo desde JavaScript y lo único
 * público es un favicon— y «Sitio propio», que somos nosotros y usa el símbolo
 * del sistema de diseño. Los dos caen al monograma, que es lo que corresponde:
 * lo que NUNCA se hace es redibujar el logo de memoria o teñir un cuadrado con
 * «más o menos su color». Eso deja una **marca falsa de una empresa que
 * existe**, en la pantalla que le dice a la inmobiliaria dónde se publica el
 * inmueble de su cliente.
 *
 * Misma decisión y mismo formato que las aseguradoras
 * (`lib/aseguradoras/marca.ts` + `public/aseguradoras/PROCEDENCIA.md`).
 *
 * ## Por qué el MONOGRAMA es neutro aunque los logos vayan a color
 *
 * `docs/DESIGN.md` §1: **un solo acento**. El logo real de cada portal lleva su
 * color —es su marca y así se reconoce—, pero va contenido en su recuadro. El
 * monograma de los que no tienen archivo NO se inventa un color: sería el único
 * color de la pantalla que no significa nada.
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
 * Para agregar uno hacen falta las dos cosas:
 *   1. el archivo en `public/portales/`, y
 *   2. una fila en `public/portales/PROCEDENCIA.md` con de dónde salió y con
 *      qué licencia — igual que `public/aseguradoras/PROCEDENCIA.md`.
 *
 * Sin el punto 2 no entra. Sacar una entrada de acá devuelve esa tarjeta a su
 * monograma sin tocar nada más — que es lo que hay que hacer si un portal pide
 * que dejemos de usar su marca.
 */
const LOGOS: Record<string, string> = {
  // Wikimedia Commons, dominio público (PROCEDENCIA.md §A).
  MERCADO_LIBRE: '/portales/mercado-libre.svg',
  PROPERATI: '/portales/properati.png',
  // 🔴 CC BY-SA 4.0: pide atribución (PROCEDENCIA.md §B).
  FINCARAIZ: '/portales/fincaraiz.png',
  // Del sitio oficial; copyright NO verificado (PROCEDENCIA.md §C).
  CIENCUADRAS: '/portales/ciencuadras.svg',
}

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
