/**
 * El relevo entre las tarjetas de la puesta en marcha: la decisión de la
 * migración avisa que se va con «en otro momento» / «no requiero», y si lo
 * que entra enseguida es el segundo factor dentro del panel, éste NO aparece
 * como un modal nuevo: toma la tarjeta donde estaba y sólo cambia el
 * contenido (Nico, 30-09-2026: «no se ve que es como un paso que continúa»).
 *
 * Es un aviso de módulo, no estado de React: la decisión vive dentro del
 * panel y el segundo factor lo reemplaza desde el layout, así que no comparten
 * ningún contexto. No se consume al leerlo —en desarrollo el modo estricto
 * monta dos veces y la segunda lectura tiene que ver lo mismo—: vence solo.
 * Una recarga lo borra, y ahí la escena entra con su animación de siempre.
 */

/** Lo que tarda, como mucho, entre el clic y que el segundo factor entre. */
const VIGENCIA_MS = 20_000;

let relevo: { foto: string; en: number } | null = null;

/** La tarjeta que se va deja anotada su foto para que la siguiente parta de ahí. */
export function anunciarRelevo(foto: string): void {
  relevo = { foto, en: Date.now() };
}

/** La foto de la tarjeta que acaba de irse, o `null` si nadie se fue hace poco. */
export function leerRelevo(): string | null {
  if (relevo === null) return null;
  if (Date.now() - relevo.en > VIGENCIA_MS) {
    relevo = null;
    return null;
  }
  return relevo.foto;
}

/** Nadie tomó el relevo (el panel se abrió sin segundo factor): se olvida. */
export function olvidarRelevo(): void {
  relevo = null;
}
