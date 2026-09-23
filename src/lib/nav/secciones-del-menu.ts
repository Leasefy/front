/**
 * secciones-del-menu — el menú plano, vuelto bloques plegables.
 *
 * El pedido (Nico, 2026-09-22, con captura del panel de la inmobiliaria): «No
 * se distingue muy bien entre la sección y las opciones; deberíamos volverlas
 * secciones con dropdown porque tenemos mucha información». El rótulo de
 * sección (mono, 11 px, `text-fg-subtle` #726E68) y las filas (`text-fg-muted`
 * #6E6A63) tenían prácticamente el MISMO gris: la jerarquía la cargaba sólo el
 * tamaño, y a 11 px contra 14 px eso no alcanza para leer «esto agrupa, eso se
 * abre».
 *
 * El menú sigue viajando PLANO (`NavItem[]` con cabeceras `kind: 'section'`)
 * porque así lo filtran los permisos (`filterAgencyNav`) y lo lee la fila
 * activa (`hrefDeLaFilaActiva`). Acá sólo se AGRUPA para pintar, sin cambiar
 * qué filas hay: ninguna puerta se gana ni se pierde por plegar.
 *
 * Tipos estructurales a propósito (como `fila-activa-del-menu.ts`): lo usan
 * `PlanSidebar` y la navegación móvil, y no hace falta atarse a su `NavItem`.
 */

export interface FilaAgrupable {
  href: string;
  label: string;
  kind?: 'section';
  /**
   * La fila NO pertenece a la sección de arriba aunque venga después de ella.
   * Existe por el «pie» del panel (Reportes), que es un grupo SIN cabecera:
   * en la lista plana quedaba debajo de «Directorio» y, al volverse plegable,
   * se habría escondido adentro de una sección que no es la suya.
   */
  suelta?: boolean;
  badge?: number;
  ai?: boolean;
  tag?: string;
}

export type BloqueDelMenu<T extends FilaAgrupable> =
  | { tipo: 'sueltas'; filas: T[] }
  | { tipo: 'seccion'; clave: string; cabecera: T; filas: T[] };

/**
 * Parte la lista plana en bloques, en el mismo orden:
 *   · lo que va ANTES de la primera cabecera (Inicio, Chat) queda suelto;
 *   · cada cabecera se lleva las filas que la siguen, hasta la próxima
 *     cabecera o hasta una fila `suelta`;
 *   · una cabecera que se quedó sin filas no se pinta (un acordeón vacío es un
 *     botón que no abre nada).
 */
export function agruparEnSecciones<T extends FilaAgrupable>(filas: readonly T[]): BloqueDelMenu<T>[] {
  const bloques: BloqueDelMenu<T>[] = [];
  for (const fila of filas) {
    const ultimo = bloques[bloques.length - 1];
    if (fila.kind === 'section') {
      bloques.push({ tipo: 'seccion', clave: claveDeSeccion(fila), cabecera: fila, filas: [] });
    } else if (ultimo && (ultimo.tipo === 'sueltas' || !fila.suelta)) {
      ultimo.filas.push(fila);
    } else {
      bloques.push({ tipo: 'sueltas', filas: [fila] });
    }
  }
  // Sin filas no hay nada que abrir: la cabecera vacía no se pinta.
  return bloques.filter((b) => b.filas.length > 0);
}

/**
 * La llave con la que se recuerda si una sección está abierta. Es el `href`
 * de la cabecera (`#sec-agentes`), que no depende del idioma — el rótulo sí:
 * con la llave en el rótulo, cambiar a inglés «olvidaba» todo lo plegado.
 */
export function claveDeSeccion(cabecera: { href: string; label: string }): string {
  return cabecera.href.startsWith('#') ? cabecera.href.slice(1) : cabecera.href || cabecera.label;
}

export interface ResumenDeSeccion {
  /** Suma de los contadores de las filas (0 = no hay nada que contar). */
  pendientes: number;
  /** Alguna fila es de un agente de IA. */
  conIa: boolean;
}

/**
 * Lo que la cabecera tiene que seguir diciendo cuando la sección está
 * cerrada: si se pliega «Operación», el 16 de Contratos no puede desaparecer
 * del menú. Un contador `undefined` no suma (no se pudo contar ≠ cero).
 */
export function resumenDeSeccion(filas: readonly FilaAgrupable[]): ResumenDeSeccion {
  let pendientes = 0;
  let conIa = false;
  for (const f of filas) {
    if (typeof f.badge === 'number' && f.badge > 0) pendientes += f.badge;
    if (f.ai) conIa = true;
  }
  return { pendientes, conIa };
}

// ─── Qué secciones están abiertas, recordado por persona ────────────────────

const PREFIJO = 'leasefy-sidebar-secciones';

/** Una llave por usuario: dos personas en el mismo equipo no se pisan el menú. */
export function llaveDeAlmacenamiento(usuarioId: string | null | undefined): string {
  return usuarioId ? `${PREFIJO}:${usuarioId}` : PREFIJO;
}

/** `true` = abierta, `false` = cerrada; una sección que no figura usa el valor por defecto. */
export type EstadoDeSecciones = Record<string, boolean>;

/**
 * Lee lo guardado. Cualquier cosa que falle —almacenamiento bloqueado en una
 * ventana privada, cuota, JSON roto, un valor que no es un objeto— devuelve
 * `{}`: todas las secciones en su valor por defecto. Plegar el menú es una
 * comodidad; nunca puede tumbar el panel.
 */
export function leerSecciones(llave: string, almacen: Pick<Storage, 'getItem'> | null | undefined): EstadoDeSecciones {
  try {
    const crudo = almacen?.getItem(llave);
    if (!crudo) return {};
    const valor: unknown = JSON.parse(crudo);
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
    const limpio: EstadoDeSecciones = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      if (typeof v === 'boolean') limpio[k] = v;
    }
    return limpio;
  } catch {
    return {};
  }
}

/** Guarda sin quejarse: si no se puede, el estado vive sólo en esta sesión. */
export function guardarSecciones(
  llave: string,
  estado: EstadoDeSecciones,
  almacen: Pick<Storage, 'setItem'> | null | undefined,
): void {
  try {
    almacen?.setItem(llave, JSON.stringify(estado));
  } catch {
    // Almacenamiento lleno o bloqueado: no es crítico.
  }
}

/**
 * Valor por defecto: ABIERTA. Quien entra por primera vez ve todo el menú —
 * esconder módulos a quien todavía no sabe que existen es perderle puertas—,
 * y cierra lo que no usa; el panel se lo recuerda.
 */
export function estaAbierta(estado: EstadoDeSecciones, clave: string): boolean {
  return estado[clave] ?? true;
}

/**
 * `window.localStorage` puede tirar con sólo NOMBRARLO (SecurityError con las
 * cookies de terceros bloqueadas, o en un iframe con sandbox). Por eso el
 * acceso también va envuelto, no sólo el `getItem`.
 */
export function almacenLocal(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
