/**
 * ruta-de-regreso — a dónde vuelve una ficha según de dónde se entró.
 *
 * Una ficha (propietario, cuenta de cobro, consignación nueva) se abre desde
 * varios lugares: la lista, el contrato, el inmueble, un cobro. «Volver» tiene
 * que llevar al lugar del que se vino, no siempre a la lista — si no, quien
 * entró desde un contrato pierde el hilo y tiene que buscarlo de nuevo.
 *
 * El origen viaja en `?volver=<ruta>`. Sólo se respeta si apunta adentro del
 * panel: un enlace de regreso que sale a otro dominio es un open redirect con
 * otro nombre.
 */

const PANEL = '/panel/';

/** La ruta de regreso válida, o `porDefecto` si no vino o no es del panel. */
export function rutaDeRegreso(volver: string | null | undefined, porDefecto: string): string {
  if (!volver) return porDefecto;
  if (!volver.startsWith(PANEL) || volver.startsWith('//')) return porDefecto;
  return volver;
}

/** Arma `destino?volver=<origen>` (o `&volver=` si `destino` ya lleva query). */
export function conRegreso(destino: string, origen: string): string {
  const separador = destino.includes('?') ? '&' : '?';
  return `${destino}${separador}volver=${encodeURIComponent(origen)}`;
}

/**
 * Qué se le dice a quien vuelve. Se lee el primer tramo después de
 * `/panel/inmobiliaria/` para nombrar el lugar («Volver al contrato») en vez de
 * un «Volver» mudo que no dice a dónde.
 */
export type LugarDeRegreso =
  | 'contrato'
  | 'inmueble'
  | 'cobro'
  | 'propietario'
  | 'dispersiones'
  | 'lista'
  | 'otro';

export function lugarDeRegreso(ruta: string): LugarDeRegreso {
  const sinQuery = ruta.split('?')[0] ?? ruta;
  const tramos = sinQuery.replace(/^\/panel\/inmobiliaria\/?/, '').split('/').filter(Boolean);
  const seccion = tramos[0];
  const tieneId = tramos.length >= 2;
  switch (seccion) {
    case 'contratos':
      return tieneId ? 'contrato' : 'lista';
    case 'inmuebles':
      return tieneId ? 'inmueble' : 'lista';
    case 'cobros':
      return tieneId ? 'cobro' : 'lista';
    case 'propietarios':
      return tieneId ? 'propietario' : 'lista';
    case 'dispersiones':
      return 'dispersiones';
    default:
      return 'otro';
  }
}
