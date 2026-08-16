'use client';

/**
 * Dos problemas con la misma raíz: nadie sabe qué está pidiendo quién.
 *
 * 1. **Se pide lo mismo muchas veces.** Cada componente que llama a
 *    `useInmobiliariaConfig()` dispara su propio GET. Medido en una sola
 *    pantalla del panel: **53 peticiones, y sólo 4 rutas pedidas una sola
 *    vez** — `/inmobiliaria/config` iba **10 veces**, todas arrancando en el
 *    mismo milisegundo, así que cada una esperaba a las otras nueve.
 *
 * 2. **Después de una acción, la tabla no se entera.** Generar una dispersión,
 *    borrar un propietario, aprobar una cotización: el cambio ya está en la
 *    base y la pantalla sigue mostrando lo de antes hasta que alguien recarga.
 *    Decirle a la gente «recargá» es contarle un detalle de implementación.
 *
 * Este módulo resuelve los dos con la misma pieza: el cliente HTTP es el único
 * lugar por donde pasa todo, así que ahí sabemos qué recurso se está leyendo y
 * cuál se acaba de modificar.
 *
 * - Los GET iguales **en vuelo** comparten una sola petición.
 * - Los POST/PUT/PATCH/DELETE **avisan** qué recurso tocaron, y los hooks que
 *   lo estaban leyendo se refrescan solos.
 *
 * ⚠️ Esto NO es un caché. La promesa compartida se olvida en cuanto termina:
 * un GET posterior sale de verdad. Compartir sólo lo que está en vuelo da todo
 * el ahorro sin ninguna posibilidad de mostrar algo viejo.
 */

/**
 * Segmentos que no nombran un recurso: son el área del producto, no la cosa.
 *
 * `/inmobiliaria/propietarios` y `/landlord/propietarios` son el mismo recurso
 * visto por dos roles; si el prefijo contara, una acción de uno no refrescaría
 * la pantalla del otro.
 */
const PREFIJOS = new Set(['inmobiliaria', 'landlord', 'tenant', 'api', 'v1']);

/** Un id no es un recurso: `/propietarios/<uuid>` sigue siendo `propietarios`. */
const PARECE_ID = /^[0-9a-f-]{8,}$|^\d+$/i;

/**
 * Qué recurso toca una ruta del back.
 *
 * ```
 * /inmobiliaria/propietarios?page=1        → propietarios
 * /inmobiliaria/dispersiones/<id>/process  → dispersiones
 * /properties/<id>/agent                   → properties
 * ```
 */
export function recursoDe(path: string): string {
  const sinQuery = path.split('?')[0];
  for (const seg of sinQuery.split('/')) {
    if (!seg || PREFIJOS.has(seg) || PARECE_ID.test(seg)) continue;
    return seg;
  }
  return sinQuery;
}

/**
 * Acciones que cambian MÁS de lo que dice su ruta.
 *
 * Generar dispersiones nace de los cobros y los deja liquidados; pagar un
 * cobro mueve la cartera. Sin esto, la pantalla de al lado sigue mostrando el
 * número viejo y no hay forma de que el usuario sepa por qué.
 */
const TAMBIEN_TOCA: Record<string, readonly string[]> = {
  dispersiones: ['cobros', 'propietarios'],
  cobros: ['cartera', 'dispersiones'],
  contratos: ['consignaciones', 'cobros'],
  consignaciones: ['propiedades', 'properties'],
  properties: ['consignaciones'],
  propiedades: ['consignaciones'],
  renovaciones: ['contratos'],
  mantenimiento: ['operaciones'],
};

// ── GETs iguales en vuelo: una sola petición ────────────────────────────────

const enVuelo = new Map<string, Promise<unknown>>();

/**
 * Si ya hay un GET idéntico corriendo, devolvés ESE. Si no, arrancás uno y lo
 * dejás disponible mientras dure.
 *
 * Se borra en el `finally`, con éxito o con error: un fallo compartido no
 * puede quedar pegado impidiendo el próximo intento.
 */
export function compartirGet<T>(clave: string, hacer: () => Promise<T>): Promise<T> {
  const yaVa = enVuelo.get(clave);
  if (yaVa) return yaVa as Promise<T>;

  const promesa = hacer().finally(() => {
    enVuelo.delete(clave);
  });
  enVuelo.set(clave, promesa);
  return promesa;
}

/** Cuántos GET hay compartiéndose ahora. Sólo para tests. */
export function _enVuelo(): number {
  return enVuelo.size;
}

// ── Avisos de cambio ────────────────────────────────────────────────────────

type Oyente = () => void;
const oyentes = new Map<string, Set<Oyente>>();

/**
 * Un recurso cambió: los que lo estaban leyendo vuelven a pedirlo.
 *
 * Lo llama el cliente HTTP solo, después de cada mutación que salió bien. No
 * hay que acordarse en cada pantalla — y por eso una acción nueva nace ya
 * refrescando la tabla.
 */
export function invalidar(recurso: string): void {
  const tocados = new Set<string>([recurso, ...(TAMBIEN_TOCA[recurso] ?? [])]);
  for (const r of tocados) {
    for (const cb of oyentes.get(r) ?? []) {
      try {
        cb();
      } catch {
        // Un oyente que falla no puede dejar sin avisar a los demás: cada
        // pantalla es independiente de las otras.
      }
    }
  }
}

/**
 * Escuchar cambios de uno o más recursos. Devuelve cómo dejar de escuchar.
 */
export function alCambiar(recursos: readonly string[], cb: Oyente): () => void {
  for (const r of recursos) {
    const set = oyentes.get(r) ?? new Set<Oyente>();
    set.add(cb);
    oyentes.set(r, set);
  }
  return () => {
    for (const r of recursos) {
      const set = oyentes.get(r);
      if (!set) continue;
      set.delete(cb);
      if (set.size === 0) oyentes.delete(r);
    }
  };
}

/** Sólo para tests: deja el registro como recién arrancado. */
export function _reiniciar(): void {
  enVuelo.clear();
  oyentes.clear();
}
