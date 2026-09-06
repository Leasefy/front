/**
 * pasos-del-tour.ts — los tres pasos del recorrido del panel, y cuáles de
 * ellos se pueden mostrar de verdad.
 *
 * Separado del componente para poder probar la parte que importa sin DOM: qué
 * pasos sobreviven cuando la persona no tiene un módulo, y qué pasa cuando no
 * sobrevive ninguno.
 *
 * Cada paso apunta a un elemento REAL por selector. Si el elemento no está en
 * la página —porque el rol no ve ese módulo, o porque la pantalla todavía no
 * terminó de montar— el paso se salta. Un recorrido que señala un hueco es
 * peor que uno más corto.
 */

export interface PasoDelTour {
  id: string;
  /** Selector del elemento a resaltar. */
  selector: string;
  tituloKey: string;
  cuerpoKey: string;
}

export const PASOS_DEL_TOUR: readonly PasoDelTour[] = [
  {
    id: 'buscador',
    selector: '[data-tour-target="buscador"]',
    tituloKey: 'inmobiliaria.tour.buscador.titulo',
    cuerpoKey: 'inmobiliaria.tour.buscador.cuerpo',
  },
  {
    id: 'piloto',
    // La píldora del header ya existía con este testid; no hace falta otro
    // anclaje sólo para el tour.
    selector: '[data-testid="piloto-modo-header"]',
    tituloKey: 'inmobiliaria.tour.piloto.titulo',
    cuerpoKey: 'inmobiliaria.tour.piloto.cuerpo',
  },
  {
    id: 'agentes',
    selector: '[data-tour-target="sidebar-cobranza"]',
    tituloKey: 'inmobiliaria.tour.agentes.titulo',
    cuerpoKey: 'inmobiliaria.tour.agentes.cuerpo',
  },
];

/**
 * Los pasos cuyo elemento existe en este documento, en orden.
 *
 * `existe` se inyecta para poder probarlo sin navegador; en producción es
 * `(sel) => document.querySelector(sel) != null`.
 */
export function pasosVisibles(
  existe: (selector: string) => boolean,
  pasos: readonly PasoDelTour[] = PASOS_DEL_TOUR,
): PasoDelTour[] {
  return pasos.filter((p) => {
    try {
      return existe(p.selector);
    } catch {
      // Un selector inválido no puede tumbar el recorrido entero.
      return false;
    }
  });
}

/**
 * Selectores de las capas que bloquean el panel entero. Mientras alguna esté
 * en pantalla, el recorrido NO arranca: guiar por un panel que todavía no se
 * puede tocar es señalar cosas que no responden, y además el recorrido pelearía
 * con la capa por quién está encima.
 *
 * Hoy sólo el muro de migración (la puesta en marcha de una inmobiliaria
 * nueva). Se deja como lista porque la próxima capa así va a querer lo mismo.
 */
export const CAPAS_QUE_BLOQUEAN = ['[data-testid="muro-migracion"]'];

export function elPanelEstaBloqueado(
  existe: (selector: string) => boolean,
): boolean {
  return CAPAS_QUE_BLOQUEAN.some((sel) => {
    try {
      return existe(sel);
    } catch {
      return false;
    }
  });
}
