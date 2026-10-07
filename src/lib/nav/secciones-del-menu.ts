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

// ─── Qué secciones están abiertas ────────────────────────────────────────────

/**
 * La regla de Nico (02-10-2026): al ENTRAR al panel, todo el mundo ve UNA
 * sola sección abierta, «Operación», y las demás plegadas; si la página
 * actual vive en otra sección, ésa también se abre (la fila activa siempre se
 * ve). Lo que la persona abra o cierre después se respeta mientras navega —el
 * menú vive en el layout y no se vuelve a montar—, pero NO se guarda: la
 * próxima vez que entre (otra pestaña, recargar, otro día) vuelve la regla.
 *
 * Antes era al revés: todo abierto por defecto y lo plegado se recordaba por
 * persona en `localStorage` (`leasefy-sidebar-secciones:<usuario>`). Esa llave
 * se borra al entrar (`olvidarSeccionesGuardadas`) para no dejar basura.
 *
 * En el panel de la inmobiliaria la sección es `#sec-operacion` («Operación»,
 * `arquitectura-del-panel.ts`). Un panel que no la tiene —el del propietario,
 * con su única sección «Mi arriendo»— abre su PRIMERA sección.
 */
export const SECCION_ABIERTA_AL_ENTRAR = 'sec-operacion';

/** La sección que arranca abierta entre las que hay, o `null` si no hay ninguna. */
export function seccionAbiertaAlEntrar(claves: readonly string[]): string | null {
  if (claves.includes(SECCION_ABIERTA_AL_ENTRAR)) return SECCION_ABIERTA_AL_ENTRAR;
  return claves[0] ?? null;
}

/**
 * `true` = abierta, `false` = cerrada, por decisión de la persona en esta
 * visita. Una sección que no figura usa la regla de entrada.
 */
export type EstadoDeSecciones = Record<string, boolean>;

/**
 * ¿Está abierta? Lo que la persona decidió manda; si no decidió nada, sólo
 * están abiertas la de entrada y la que contiene la página actual.
 */
export function estaAbierta(
  estado: EstadoDeSecciones,
  clave: string,
  { deEntrada, activa }: { deEntrada: string | null; activa: string | null },
): boolean {
  return estado[clave] ?? (clave === deEntrada || clave === activa);
}

const PREFIJO_VIEJO = 'leasefy-sidebar-secciones';

/** La llave con la que se guardaba lo plegado hasta el 02-10-2026 (por usuario). */
export function llaveDeAlmacenamiento(usuarioId: string | null | undefined): string {
  return usuarioId ? `${PREFIJO_VIEJO}:${usuarioId}` : PREFIJO_VIEJO;
}

/**
 * Borra lo que quedó guardado de antes. Sin quejarse: un almacenamiento
 * bloqueado (ventana privada, iframe con sandbox) no puede tumbar el menú.
 */
export function olvidarSeccionesGuardadas(
  usuarioId: string | null | undefined,
  almacen: Pick<Storage, 'removeItem'> | null | undefined,
): void {
  try {
    almacen?.removeItem(llaveDeAlmacenamiento(usuarioId));
  } catch {
    // No es crítico.
  }
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
