/**
 * 🔴 UN SELECTOR VACÍO NO ES LO MISMO QUE UNO QUE NO PUDO CARGAR.
 *
 * ── De dónde sale esto (21-09-2026, mirando la pantalla) ──────────────────
 *
 * Con la base de desarrollo atrasada una columna, el diálogo de «Generar
 * documento» decía, en el selector de inmuebles: **«No hay inmuebles»**. Y los
 * había: 2.965. Lo que pasó fue un 503 que nadie miró.
 *
 * Es el mismo defecto que Nico describió el 18-09 —«¿esto realmente sí está
 * conectado?»— y la razón por la que existe `EstadoDeDatos`: **un fallo que se
 * ve idéntico a «no hay nada» es peor que un error, porque nadie lo reporta.**
 * Quien lee «no hay inmuebles» no vuelve a intentar: se va a averiguar por qué
 * su portafolio está vacío.
 *
 * `EstadoDeDatos` ya resuelve esto para un BLOQUE de pantalla. Un selector no
 * puede usarlo —su hueco es una línea de texto, no una región— así que la misma
 * distinción vive acá, en una función pura que las pantallas comparten.
 *
 * Los cuatro estados, en el orden que importa:
 *
 *   1. cargando  → «Cargando los inmuebles…» (todavía no se sabe)
 *   2. falló     → «No pudimos traer los inmuebles» (se sabe, y es nuestro)
 *   3. ninguno   → lo que esa pantalla tenga que decir (se sabe, y no hay)
 *   4. hay       → la pista de búsqueda
 */

export interface EstadoDelSelector {
  cargando: boolean;
  /** El error entero o un booleano; acá sólo importa si hubo o no. */
  error?: unknown;
  /** Cuántas opciones quedaron para elegir. */
  cuantos: number;
  /**
   * Cómo se llaman las cosas, en plural y CON artículo: «los inmuebles», «los
   * contratos». Entra tal cual en «Cargando …» y «No pudimos traer …».
   */
  queSon: string;
  /** Qué decir cuando SÍ hay de dónde elegir: «Busca por título o dirección». */
  pista: string;
  /**
   * Qué decir cuando la lista llegó vacía DE VERDAD. Es obligatorio a
   * propósito: cada pantalla sabe qué significa su vacío («Todavía no tienes
   * inmuebles arrendados» no es lo mismo que «No hay inmuebles»), y un texto
   * armado con plantilla saldría en mal español la mitad de las veces.
   */
  cuandoNoHay: string;
}

export function loQueDiceUnSelector({
  cargando,
  error,
  cuantos,
  queSon,
  pista,
  cuandoNoHay,
}: EstadoDelSelector): string {
  if (cargando) return `Cargando ${queSon}…`;
  // 🔴 El error ANTES del vacío, siempre: al fallar la lectura la lista
  // también quedó en cero, y si el vacío se evalúa primero la pantalla afirma
  // «no hay» cuando lo único cierto es que no se pudo preguntar.
  if (error) return `No pudimos traer ${queSon}`;
  if (cuantos === 0) return cuandoNoHay;
  return pista;
}

/**
 * ¿El selector se puede usar? Ni con la lista cargando, ni caída, ni vacía.
 *
 * Vive al lado de la frase para que no se separen: un selector habilitado que
 * dice «No pudimos traer los inmuebles» se abre sobre una lista vacía, y eso
 * vuelve a parecer «no hay».
 */
export function elSelectorSirve({
  cargando,
  error,
  cuantos,
}: Pick<EstadoDelSelector, 'cargando' | 'error' | 'cuantos'>): boolean {
  return !cargando && !error && cuantos > 0;
}
