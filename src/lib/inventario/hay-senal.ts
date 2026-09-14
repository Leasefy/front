/**
 * ¿Hay señal de verdad?
 *
 * `navigator.onLine` MIENTE, y miente de la forma peor: dice `true` con sólo
 * estar conectado a una red —el wifi del edificio, la red de datos con una
 * barra— aunque no salga ni un paquete. Un botón «Subir inventario» que se
 * habilita con eso manda a la persona a un spinner eterno en el sótano de un
 * edificio, que es justo el caso que Nico describió.
 *
 * Por eso son dos preguntas: `navigator.onLine === false` se cree (ahí sí es
 * definitivo, no hay red) y cualquier otra cosa se COMPRUEBA con un pedido
 * real al back. `/health` es público (no pide sesión) y no toca nada.
 */

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/** Más que esto es «no hay señal» a efectos prácticos. */
export const TOPE_MS = 5000;

export interface OpcionesDeSenal {
  /** Para las pruebas. Por defecto, el `fetch` del navegador. */
  fetchImpl?: typeof fetch;
  /** Para las pruebas. Por defecto, `navigator.onLine`. */
  enLinea?: () => boolean;
  topeMs?: number;
}

export async function haySenal(opciones: OpcionesDeSenal = {}): Promise<boolean> {
  const {
    fetchImpl = typeof fetch !== 'undefined' ? fetch : undefined,
    enLinea = () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    topeMs = TOPE_MS,
  } = opciones;

  // Un `false` del navegador es definitivo: no hay a quién preguntarle.
  if (!enLinea()) return false;
  if (!fetchImpl) return false;

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), topeMs);
  try {
    const r = await fetchImpl(`${BACKEND}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: corte.signal,
    });
    // Un 503 del `/health` es el back diciendo «estoy, pero mal». Para subir
    // un inventario alcanza con que conteste: lo que se está midiendo acá es
    // si hay camino, no si la base está sana.
    return r.status < 500 || r.status === 503;
  } catch {
    return false;
  } finally {
    clearTimeout(reloj);
  }
}
