/**
 * Cómo se ESCRIBE la plata (P8 a y P9 a de «centavos en todo»).
 *
 * Determinista a propósito, sin `toLocaleString` ni `Intl`: un documento no
 * puede decir «$2,500,000.00» en una copia y «$ 2.500.000» en otra porque la
 * máquina que lo generó tenía otro locale (la misma regla de
 * `documentos/plantillas-legales/formato.ts`).
 *
 * Este archivo es IGUAL en el back, el micro y el front (`lib/plata/formato.ts`).
 */
import { aCentavos, type ValorDePlata } from './plata';

export interface OpcionesDeFormato {
  /**
   * P8 a: `'si-hay'` (pantallas) escribe los centavos sólo cuando el valor los
   * tiene (`$ 1.234.567` y `$ 1.234.567,89`); `'siempre'` (documentos
   * contables y PDFs) siempre con dos (`$ 1.234.567,00`).
   */
  decimales?: 'si-hay' | 'siempre';
}

function conPuntosDeMil(entero: number): string {
  return entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * `1234567.89` → «$ 1.234.567,89»; `2500000` → «$ 2.500.000»;
 * `-1500.5` → «-$ 1.500,50». Coma decimal y punto de mil, como se escribe en
 * Colombia.
 */
export function formatoPesos(valor: ValorDePlata, opciones: OpcionesDeFormato = {}): string {
  const c = aCentavos(valor);
  const signo = c < 0 ? '-' : '';
  const absoluto = Math.abs(c);
  const enteros = Math.floor(absoluto / 100);
  const centavos = absoluto % 100;
  const conDecimales = opciones.decimales === 'siempre' || centavos !== 0;
  const cola = conDecimales ? `,${String(centavos).padStart(2, '0')}` : '';
  return `${signo}$ ${conPuntosDeMil(enteros)}${cola}`;
}

const UNIDADES = [
  '', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte',
] as const;

const DECENAS = [
  '', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta',
  'ochenta', 'noventa',
] as const;

const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
] as const;

/** 21-29 se escriben pegadas y con tilde donde corresponde. */
const VEINTI = [
  'veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
  'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
] as const;

function menorDeMil(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto: string;
  if (resto <= 20) texto = UNIDADES[resto];
  else if (resto < 30) texto = VEINTI[resto - 20];
  else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    texto = u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
  }
  return [CENTENAS[c], texto].filter(Boolean).join(' ');
}

function hastaUnMillon(n: number): string {
  if (n < 1000) return menorDeMil(n);
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const cabeza = miles === 1 ? 'mil' : `${menorDeMil(miles)} mil`;
  return resto === 0 ? cabeza : `${cabeza} ${menorDeMil(resto)}`;
}

/** Entero de 0 a 999.999.999.999 en letras, en minúsculas («un millón doscientos mil»). */
function enteroEnLetras(n: number): string {
  if (n === 0) return 'cero';
  const millones = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const partes: string[] = [];
  if (millones > 0) partes.push(millones === 1 ? 'un millón' : `${hastaUnMillon(millones)} millones`);
  if (resto > 0) partes.push(hastaUnMillon(resto));
  return partes.join(' ');
}

/**
 * P9 a: la plata en letras, en mayúsculas, sin «M/CTE» (lo pone la plantilla,
 * junto a la cifra entre paréntesis):
 *
 *   · `1200000.5` → «UN MILLÓN DOSCIENTOS MIL PESOS CON CINCUENTA CENTAVOS»
 *   · `2500000`   → «DOS MILLONES QUINIENTOS MIL PESOS» (sin «con cero centavos»)
 *   · `0.01`      → «CERO PESOS CON UN CENTAVO»
 *
 * Misma forma que `pesosEnLetras` de las plantillas legales (sin «DE» después
 * de un millón redondo: «UN MILLÓN PESOS»), para que pasar los documentos a
 * centavos no cambie ningún texto que ya se firmó; sólo suma los centavos.
 * Un negativo va en letras sin el signo (los documentos lo dicen con palabras).
 * Fuera de rango (≥ un billón) devuelve `null`: mejor nada que mal.
 */
export function enLetras(valor: ValorDePlata | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const c = Math.abs(aCentavos(valor));
  const enteros = Math.floor(c / 100);
  const centavos = c % 100;
  if (enteros >= 1_000_000_000_000) return null;
  const pesosEnLetras = `${enteroEnLetras(enteros)} ${enteros === 1 ? 'peso' : 'pesos'}`;
  const cola =
    centavos === 0
      ? ''
      : ` con ${enteroEnLetras(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  return `${pesosEnLetras}${cola}`.toUpperCase();
}
