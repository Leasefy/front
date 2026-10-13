/**
 * Pure normaliser for Colombian urban addresses (T-0159).
 *
 * Real portfolios write "CR 55 N 53 A - 35 TO 1 AP 2201- PQ 3049 RESERVAS D".
 * The geocoder cannot resolve the unit/complement noise, so the row ends on the
 * municipality centroid (61% of the Portofino import). This turns the address
 * into the canonical nomenclature form "Carrera 55 # 53 A - 35" that geocoders
 * do understand, or returns null when the text is not a parseable address
 * (building names, landmarks, a street without a cross street).
 *
 * Grammar (after tokenising into numbers / words / '#' / '-'):
 *
 *   VIA  NUM [LETTER] [BIS] [LETTER] [CARDINAL]      first leg (the road)
 *   [#|N|NO|-|second VIA]                            optional separators
 *   NUM  [LETTER] [BIS] [LETTER] [CARDINAL]          second leg (cross street)
 *   [-] [NUM]                                        plate number (optional)
 *
 * Everything from the first unrecognised word on (APTO, TO, PQ, INT, a building
 * name...) is complement noise and is dropped. Text BEFORE the first road is
 * dropped too ("EDIFICIO X, CALLE 10 ...").
 */

import type { DireccionAUbicar } from './ubicar-direccion';

const VIAS: Record<string, string> = {
  CL: 'Calle', CLL: 'Calle', CLLE: 'Calle', CALLE: 'Calle',
  CR: 'Carrera', CRA: 'Carrera', CRR: 'Carrera', KR: 'Carrera', KRA: 'Carrera',
  CARR: 'Carrera', CARRERA: 'Carrera',
  AV: 'Avenida', AVDA: 'Avenida', AVENIDA: 'Avenida',
  AC: 'Avenida Calle', AK: 'Avenida Carrera',
  DG: 'Diagonal', DIAG: 'Diagonal', DIAGONAL: 'Diagonal',
  TV: 'Transversal', TRV: 'Transversal', TRANSV: 'Transversal', TRANSVERSAL: 'Transversal',
  CIR: 'Circular', CIRC: 'Circular', CIRCULAR: 'Circular',
};

const CARDINALES: Record<string, string> = {
  SUR: 'Sur', ESTE: 'Este', NORTE: 'Norte', OESTE: 'Oeste',
  // Single letters glued to the number: "77S" is 77 Sur, "32 E" is 32 Este.
  S: 'Sur', E: 'Este',
};

const NUMERAL = new Set(['NO', 'NRO', 'NUM']);

interface Tramo {
  num: string;
  letra?: string;
  bis?: boolean;
  letraBis?: string;
  cardinal?: string;
}

function tokenizar(bruta: string): string[] {
  const limpia = bruta
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\([^)]*\)/g, ' ') // parenthesised complements
    .replace(/[º°ª.,;:]/g, ' ');
  return limpia.match(/\d+|[A-Z]+|#|-/g) ?? [];
}

const esNum = (t?: string) => t !== undefined && /^\d+$/.test(t);
const esLetra = (t?: string) => t !== undefined && /^[A-Z]$/.test(t);

/** A single letter that is a road suffix, not the numeral "N 53" nor a cardinal. */
function esLetraDeVia(t: string[], i: number): boolean {
  return esLetra(t[i]) && !(t[i] === 'N' && esNum(t[i + 1])) && !CARDINALES[t[i]];
}

function leerTramo(t: string[], start: number): [Tramo | null, number] {
  let i = start;
  if (!esNum(t[i])) return [null, i];
  const tramo: Tramo = { num: t[i] };
  i++;
  if (esLetraDeVia(t, i)) {
    tramo.letra = t[i];
    i++;
  }
  if (t[i] === 'BIS') {
    tramo.bis = true;
    i++;
    if (esLetraDeVia(t, i)) {
      tramo.letraBis = t[i];
      i++;
    }
  }
  if (t[i] && CARDINALES[t[i]]) {
    tramo.cardinal = CARDINALES[t[i]];
    i++;
  }
  return [tramo, i];
}

function formatear(t: Tramo): string {
  return [t.num, t.letra, t.bis ? 'Bis' : undefined, t.letraBis, t.cardinal]
    .filter(Boolean)
    .join(' ');
}

/** "Calle 10 # 20 - 30", or null when the text is not a parseable address. */
export function normalizarDireccionCo(bruta?: string | null): string | null {
  const t = tokenizar(bruta ?? '');
  let i = t.findIndex((x, k) => VIAS[x] !== undefined && esNum(t[k + 1]));
  if (i < 0) return null;

  const via = VIAS[t[i]];
  const [primero, j] = leerTramo(t, i + 1);
  if (!primero) return null;
  i = j;

  // Separators between the road and the cross street.
  while (i < t.length) {
    const x = t[i];
    if (x === '#' || x === '-' || NUMERAL.has(x) || VIAS[x] !== undefined) i++;
    else if (x === 'N' && esNum(t[i + 1])) i++;
    else break;
  }

  const [segundo, k] = leerTramo(t, i);
  if (!segundo) return null;
  i = k;

  while (t[i] === '-' || t[i] === '#') i++;
  const placa = esNum(t[i]) ? t[i] : undefined;

  return `${via} ${formatear(primero)} # ${formatear(segundo)}${placa ? ` - ${placa}` : ''}`;
}

/** The full geocoder query for a normalised address, or null if unparseable. */
export function consultaNormalizada(d: DireccionAUbicar): string | null {
  const n = normalizarDireccionCo(d.direccion);
  if (!n) return null;
  return [n, d.ciudad, d.departamento, 'Colombia']
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join(', ');
}
