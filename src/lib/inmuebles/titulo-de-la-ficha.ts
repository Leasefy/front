/**
 * El título y la dirección de la portada del inmueble cuando el «título» que
 * llegó es en realidad la dirección cruda de la cartera migrada
 * («CR 53 CL 129 SUR - 58 INT 701 BARRIO LOCERIA , CALDAS - ANTIOQUIA»).
 *
 * Revisión de diseño del 22-10-2026: ese texto en mayúsculas ocupaba cuatro
 * renglones a 390 como h1, y debajo la ciudad del registro decía «Medellín»
 * mientras la dirección decía Caldas. Aquí, sólo para mostrar:
 *   · el h1 pasa a «{Tipo} en {ciudad}» («Apartamento en Caldas»);
 *   · la dirección se escribe legible («Carrera 53 # 129 Sur - 58 · int. 701»);
 *   · la ciudad sale de la dirección cuando la trae; si el registro dice otra,
 *     no se pinta (no se sabe cuál es la buena y no se inventa).
 * Un título que no es una dirección queda como vino; si viene todo en
 * mayúsculas («MONTEFLOR ACACIA») se escribe con mayúscula inicial.
 */

import { normalizarDireccionCo, viaPrincipal } from './normalizar-direccion-co';

const PALABRAS_MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en']);

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** «MONTEFLOR ACACIA» → «Monteflor Acacia». Lo que ya trae minúsculas queda igual. */
export function sinMayusculasSostenidas(texto: string): string {
  const letras = texto.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  if (letras.length < 4 || letras !== letras.toUpperCase()) return texto;
  return texto
    .toLowerCase()
    .split(/(\s+)/)
    .map((p, i) => (i > 0 && PALABRAS_MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('');
}

/** ¿El título es una dirección? Empieza por una vía con número («CR 53», «Calle 10»). */
export function tituloEsDireccion(titulo: string | null | undefined): boolean {
  if (!titulo) return false;
  const via = viaPrincipal(titulo);
  if (!via) return false;
  // La vía tiene que estar al PRINCIPIO: «Apartamento en la Calle 10» es un título.
  const primera = titulo.trim().split(/\s+/)[0] ?? '';
  return /^(cr|cra|kr|kra|carrera|cl|cll|calle|av|avenida|dg|diagonal|tv|transversal|ak|ac|circular|cq)\.?$/i.test(primera);
}

/** La ciudad que trae la dirección después de la coma: «…, CALDAS - ANTIOQUIA» → «Caldas». */
export function ciudadDeLaDireccion(direccion: string): string | null {
  const partes = direccion.split(',');
  if (partes.length < 2) return null;
  const cola = partes[partes.length - 1]!.split(/\s+-\s+/)[0]!.trim();
  if (!cola || /\d/.test(cola)) return null;
  return sinMayusculasSostenidas(cola);
}

/** «INT 701» / «AP 2201» / «APTO 304» → «int. 701» / «apto. 2201». */
function interior(direccion: string): string | null {
  const m = /\b(INT|INTERIOR|AP|APT|APTO|APARTAMENTO|CASA|LOCAL|OF|OFICINA)\.?\s*(\d+[A-Z]?)\b/i.exec(direccion);
  if (!m) return null;
  const tipo = m[1]!.toLowerCase();
  const nombre =
    tipo.startsWith('int') ? 'int.' : tipo.startsWith('ap') ? 'apto.' : tipo === 'casa' ? 'casa' : tipo.startsWith('of') ? 'of.' : 'local';
  return `${nombre} ${m[2]}`;
}

export interface PortadaDelInmueble {
  titulo: string;
  /** La dirección legible, o `null` si no se puede armar. */
  direccion: string | null;
  /** La ciudad que se puede afirmar; `null` si la dirección y el registro no coinciden. */
  ciudad: string | null;
  /** ¿El título original era una dirección? */
  eraDireccion: boolean;
}

export function portadaDelInmueble(
  c: { propertyTitle?: string | null; propertyCity?: string | null },
  /** «Apartamento», «Casa»… ya traducido. */
  tipo: string,
): PortadaDelInmueble {
  const original = (c.propertyTitle ?? '').trim();
  const ciudadDelRegistro = c.propertyCity?.trim() || null;
  if (!tituloEsDireccion(original)) {
    return {
      titulo: sinMayusculasSostenidas(original),
      direccion: null,
      ciudad: ciudadDelRegistro,
      eraDireccion: false,
    };
  }
  const ciudadDeLaDir = ciudadDeLaDireccion(original);
  const contradicen =
    ciudadDeLaDir !== null && ciudadDelRegistro !== null && sinTildes(ciudadDeLaDir) !== sinTildes(ciudadDelRegistro);
  const ciudad = ciudadDeLaDir ?? ciudadDelRegistro;
  const via = normalizarDireccionCo(original);
  const int = interior(original);
  return {
    titulo: ciudad ? `${tipo} en ${ciudad}` : tipo,
    direccion: via ? [via, int].filter(Boolean).join(' · ') : sinMayusculasSostenidas(original),
    ciudad: contradicen ? ciudadDeLaDir : ciudad,
    eraDireccion: true,
  };
}
