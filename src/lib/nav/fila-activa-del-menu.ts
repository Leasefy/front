/**
 * fila-activa-del-menu — qué fila del menú está marcada, y SÓLO una.
 *
 * Cada fila se marcaba sola, por prefijo: `/pagos` quedaba activa en todo lo
 * que empezara por `/pagos/`. Mientras ninguna fila colgara de otra no se
 * notaba. Dejó de ser cierto el 2026-09-16, cuando los agentes pasaron a tener
 * su propia sección («Agentes IA») sin mover sus URLs: en
 * `/pagos/cobranza/deudores/1` calzan «Pagos» (`/pagos`) y «Cobranza»
 * (`/pagos/cobranza`), y el menú marcaba las DOS — una sala de agente que se
 * veía, a la vez, dentro de Agentes y dentro de Pagos.
 *
 * La regla es la misma que usa `moduloDeLaRuta` para el riel y el encabezado:
 * gana la fila MÁS ESPECÍFICA (el href más largo que calce). Así el sidebar, el
 * riel de secciones y el breadcrumb dicen lo mismo sobre dónde estás.
 *
 * Tipos estructurales a propósito: lo usan `PlanSidebar` y la navegación
 * móvil, que viven en `components/`, y no hace falta atarse a su `NavItem`.
 */

export interface FilaDelMenu {
  href: string;
  exact?: boolean;
  /** Las cabeceras de grupo no se marcan nunca. */
  kind?: 'section';
  /** Una fila deshabilitada no navega: no puede ser «dónde estás». */
  disabled?: boolean;
}

/** ¿La fila calza con la ruta? Exacta, o por prefijo con borde de segmento. */
export function calzaConLaRuta(fila: FilaDelMenu, pathname: string): boolean {
  if (fila.exact) return pathname === fila.href;
  return pathname === fila.href || pathname.startsWith(`${fila.href}/`);
}

/**
 * El href de la fila marcada: la más específica entre las que calzan, o null
 * si ninguna calza. Ignora la query (`?estado=vencidos` no cambia dónde estás).
 */
export function hrefDeLaFilaActiva(
  filas: readonly FilaDelMenu[],
  pathname: string | null | undefined,
): string | null {
  const ruta = (pathname ?? '').split('?')[0] ?? '';
  let activa: string | null = null;
  for (const fila of filas) {
    if (fila.kind === 'section' || fila.disabled) continue;
    if (!calzaConLaRuta(fila, ruta)) continue;
    if (activa === null || fila.href.length > activa.length) activa = fila.href;
  }
  return activa;
}
