/**
 * pasos-del-tour.ts — el guion del recorrido del panel, y qué parte de ese
 * guion se puede contar de verdad en la pantalla que hay delante.
 *
 * Separado del componente para poder probar lo que importa sin DOM: qué pasos
 * sobreviven cuando la persona no tiene un módulo, en qué orden quedan, y qué
 * pasa cuando no sobrevive ninguno.
 *
 * ── Las tres reglas del guion ──────────────────────────────────────────────
 *
 * 1. **Cada paso apunta a un elemento REAL por selector.** Si el elemento no
 *    está —porque el rol no ve ese módulo, porque la pantalla todavía no
 *    montó, o porque en móvil el sidebar no se dibuja— el paso se salta. Un
 *    recorrido que señala un hueco es peor que uno más corto.
 * 2. **El orden es el del negocio, no el del menú**: buscar → captar → el
 *    portafolio → los candidatos → el contrato → cobrar → pagar → medir →
 *    cuánta IA → preguntar → tu cuenta.
 * 3. **Nada inventado.** Cada cuerpo describe algo que el panel hace hoy. Si
 *    un módulo se apaga, se borra su paso de esta lista, no se le cambia el
 *    texto.
 *
 * ── Bienvenida y cierre ────────────────────────────────────────────────────
 *
 * El recorrido no es una ristra de burbujas: abre con una bienvenida centrada
 * (sin recorte, saluda por el nombre) y cierra con un resumen. Las dos son
 * PANTALLAS del recorrido, no pasos: no anclan a nada y por eso no se pueden
 * caer. `pantallasDelTour` arma la secuencia completa — y devuelve vacío
 * cuando no queda ningún paso, porque una bienvenida seguida de un cierre no
 * le enseña nada a nadie.
 */

export interface PasoDelTour {
  id: string;
  /** Selector del elemento a resaltar. */
  selector: string;
  tituloKey: string;
  cuerpoKey: string;
  /** Línea corta de atajo o dato, debajo del cuerpo. */
  datoKey?: string;
}

/** Arma las tres claves de un paso a partir de su id, para no escribirlas a mano. */
function paso(id: string, selector: string, conDato = true): PasoDelTour {
  const base = `inmobiliaria.tour.pasos.${id}`;
  return {
    id,
    selector,
    tituloKey: `${base}.titulo`,
    cuerpoKey: `${base}.cuerpo`,
    ...(conDato ? { datoKey: `${base}.dato` } : {}),
  };
}

export const PASOS_DEL_TOUR: readonly PasoDelTour[] = [
  // Orientarse: lo primero que hace falta con 156 rutas delante.
  paso('buscador', '[data-tour-target="buscador"]'),
  // Captar: por acá entra un inmueble nuevo al portafolio.
  paso('nuevo', '[data-tour-target="nuevo"]'),
  // El inventario ya captado.
  paso('inmuebles', '[data-tour-target="sidebar-inmuebles"]'),
  // Quién quiere arrendarlo.
  paso('postulaciones', '[data-tour-target="sidebar-postulaciones"]'),
  // Lo que se firma, y la cuenta que abre.
  paso('contratos', '[data-tour-target="sidebar-contratos"]'),
  // La plata que entra.
  paso('cobros', '[data-tour-target="sidebar-cobros"]'),
  // La plata que sale.
  paso('pagos', '[data-tour-target="sidebar-pagos"]'),
  // Medir el negocio.
  paso('reportes', '[data-tour-target="sidebar-reportes"]'),
  // Cuánto hace la IA sola. La píldora del header ya existía con este testid;
  // no hace falta otro anclaje sólo para el tour.
  paso('piloto', '[data-testid="piloto-modo-header"]'),
  // Preguntarle al panel en palabras.
  paso('chat', '[data-tour-target="sidebar-chat"]'),
  // Tu cuenta, los ajustes, y por dónde se vuelve a ver esto.
  paso('perfil', '[data-tour-target="perfil"]'),
];

/**
 * Los pasos cuyo elemento se puede señalar en este documento, en orden.
 *
 * `existe` se inyecta para poder probarlo sin navegador; en producción NO es
 * un `querySelector` a secas: un elemento presente pero de tamaño cero —el
 * sidebar por debajo de `lg`, una fila dentro de un contenedor `hidden`— no se
 * puede señalar, y el recorrido se quedaría clavado en un paso sin recuadro.
 * Ver `sePuedeSenalar` en el componente.
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

/** Una pantalla del recorrido: la bienvenida, un paso anclado, o el cierre. */
export type PantallaDelTour =
  | { tipo: 'bienvenida' }
  | { tipo: 'paso'; paso: PasoDelTour; indiceDelPaso: number; totalDePasos: number }
  | { tipo: 'cierre' };

/**
 * La secuencia completa: bienvenida → los pasos que sobrevivieron → cierre.
 *
 * Sin pasos devuelve `[]` — nada que montar. El número que se muestra en la
 * tarjeta («Paso 3 de 9») cuenta SÓLO los pasos anclados, no la bienvenida ni
 * el cierre: prometer nueve y mostrar once es la clase de detalle que hace
 * sentir el recorrido más largo de lo que es.
 */
export function pantallasDelTour(pasos: readonly PasoDelTour[]): PantallaDelTour[] {
  if (pasos.length === 0) return [];
  return [
    { tipo: 'bienvenida' },
    ...pasos.map((p, i) => ({
      tipo: 'paso' as const,
      paso: p,
      indiceDelPaso: i,
      totalDePasos: pasos.length,
    })),
    { tipo: 'cierre' },
  ];
}

/**
 * Selectores de las capas que bloquean el panel entero. Mientras alguna esté
 * en pantalla, el recorrido NO arranca: guiar por un panel que todavía no se
 * puede tocar es señalar cosas que no responden, y además el recorrido pelearía
 * con la capa por quién está encima.
 *
 * Dos familias:
 *  · el muro de migración (la puesta en marcha de una inmobiliaria nueva);
 *  · cualquier modal de Radix abierto (`data-state="open"`), porque el
 *    recorrido no va encima de un diálogo que la persona abrió a propósito.
 *
 * En los dos casos la preferencia se deja COMO ESTÁ: el recorrido sale solo
 * cuando la capa cae, en vez de perderse.
 */
export const CAPAS_QUE_BLOQUEAN = [
  '[data-testid="muro-migracion"]',
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
];

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
