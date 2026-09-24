/**
 * El ritmo con que el chat «escribe» su respuesta.
 *
 * ── Por qué (Nico, 23-09) ──────────────────────────────────────────────────
 * «Está contestando muy lento; la animación typewriting está muy buena para
 * los primeros 200 a 300 caracteres, pero de ahí en adelante ve subiéndole la
 * velocidad hasta entregar la respuesta muchísimo más rápido.»
 *
 * Medido en el código anterior: 40 caracteres por segundo, con pausas de ×6 en
 * cada punto y ×3 en cada coma. Una respuesta de 1.500 caracteres tardaba más
 * de 45 s en terminar de «escribirse», aunque el texto ENTERO ya había llegado
 * del micro (el evento `message` trae la respuesta completa): la espera era
 * sólo la animación.
 *
 * ── La curva ───────────────────────────────────────────────────────────────
 * 1. Los primeros `UMBRAL_DE_TECLEO` caracteres, igual que antes: letra por
 *    letra, con sus pausas. Es lo que se siente vivo, y Nico lo quiere así.
 * 2. Después, por PALABRAS (nunca media palabra), con una velocidad que crece
 *    como `v(k) = v₀ · (1 + (k/K)²)` sobre los caracteres k ya acelerados. Es
 *    una ease-in: arranca a la misma velocidad del tecleo —sin salto— y a los
 *    pocos cientos de caracteres ya va a miles por segundo. El tiempo total de
 *    la fase acelerada tiene techo: ∫dk/v = (K/v₀)·atan(k/K) < (K/v₀)·π/2
 *    ≈ 2,4 s, sea cual sea el largo de la respuesta.
 * 3. Cuando una palabra dura menos que un cuadro, se juntan palabras hasta
 *    llenar un cuadro (~16 ms): el final se vuelca en bloques, y quien pinta
 *    los funde (ver `MarkdownRenderer`, `revelarDesde`) en vez de hacerlos
 *    parpadear letra a letra.
 *
 * Con `prefers-reduced-motion` no hay animación: todo de una vez.
 *
 * Es una función pura sobre un texto que ya llegó entero: nunca puede ir «más
 * lento que el stream» porque no hay stream que esperar.
 */

/** Hasta aquí se escribe letra por letra, al ritmo de siempre. */
export const UMBRAL_DE_TECLEO = 250;
/** Velocidad del tecleo, en caracteres por segundo. */
export const CARACTERES_POR_SEGUNDO = 40;
/** Cuántos caracteres acelerados duplican la velocidad (la K de la curva). */
export const CARACTERES_PARA_DUPLICAR = 60;
/** Un cuadro: por debajo de esto no vale la pena programar otro tic. */
export const CUADRO_MS = 16;

const PAUSA_LARGA = new Set(['.', '!', '?']);
const PAUSA_CORTA = new Set([',', ';', ':']);

export interface PasoDelRevelado {
  /** Índice (exclusivo) hasta donde se muestra el texto después de este paso. */
  hasta: number;
  /** Cuánto esperar antes del siguiente paso. */
  esperaMs: number;
  /** `true` si este paso ya es de la fase acelerada (por palabras, con fundido). */
  acelerado: boolean;
}

/** Velocidad (caracteres/segundo) a `k` caracteres de empezar a acelerar. */
export function velocidadAcelerada(k: number): number {
  const r = Math.max(0, k) / CARACTERES_PARA_DUPLICAR;
  return CARACTERES_POR_SEGUNDO * (1 + r * r);
}

/** Fin de la palabra que empieza en `desde` (incluye el espacio que la sigue). */
function finDePalabra(texto: string, desde: number): number {
  let i = desde;
  while (i < texto.length && /\s/.test(texto[i])) i++;
  while (i < texto.length && !/\s/.test(texto[i])) i++;
  while (i < texto.length && /[ \t]/.test(texto[i])) i++;
  return Math.max(i, Math.min(desde + 1, texto.length));
}

/**
 * El siguiente paso del revelado de `texto` estando en `indice`.
 * `hasta === texto.length` significa que terminó.
 */
export function pasoDelRevelado(
  texto: string,
  indice: number,
  opts: { reducirMovimiento?: boolean } = {}
): PasoDelRevelado {
  const largo = texto.length;
  if (indice >= largo) return { hasta: largo, esperaMs: 0, acelerado: false };
  if (opts.reducirMovimiento) return { hasta: largo, esperaMs: 0, acelerado: false };

  if (indice < UMBRAL_DE_TECLEO) {
    const letra = texto[indice];
    const base = 1000 / CARACTERES_POR_SEGUNDO;
    const espera = PAUSA_LARGA.has(letra) ? base * 6 : PAUSA_CORTA.has(letra) ? base * 3 : base;
    return { hasta: indice + 1, esperaMs: espera, acelerado: false };
  }

  // Fase acelerada: palabra por palabra, juntando palabras hasta llenar un cuadro.
  let hasta = indice;
  let esperaMs = 0;
  while (hasta < largo && esperaMs < CUADRO_MS) {
    const siguiente = finDePalabra(texto, hasta);
    const k = hasta - UMBRAL_DE_TECLEO;
    esperaMs += ((siguiente - hasta) / velocidadAcelerada(k)) * 1000;
    hasta = siguiente;
  }
  return { hasta, esperaMs: Math.max(esperaMs, CUADRO_MS), acelerado: true };
}

/** Cuánto tarda en total revelar `texto` (para pruebas y para medir). */
export function duracionDelRevelado(texto: string): number {
  let i = 0;
  let total = 0;
  while (i < texto.length) {
    const p = pasoDelRevelado(texto, i);
    total += p.esperaMs;
    i = p.hasta;
  }
  return total;
}

/** ¿La persona pidió menos movimiento? (Sin `window`, no.) */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
