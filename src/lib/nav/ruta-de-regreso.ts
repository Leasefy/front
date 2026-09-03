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

/**
 * Segundos tramos que NO son una ficha sino una pantalla hermana del listado
 * (pestañas del módulo, flujos, ajustes). `/cobros/cartera` no es «un cobro»,
 * `/contratos/renovaciones` no es «un contrato», `/inmuebles/nuevo` no es «un
 * inmueble». Espeja `arquitectura-del-panel.ts` más los flujos de cada módulo.
 */
const NO_ES_FICHA: Record<string, ReadonlySet<string>> = {
  contratos: new Set(['renovaciones', 'retencion', 'riesgo', 'aprobar', 'nuevo', 'migrar', 'conceptos']),
  inmuebles: new Set(['avaluos', 'nuevo', 'importar', 'captura']),
  cobros: new Set(['recaudo', 'cartera', 'cobranza', 'reglas-de-mora']),
  propietarios: new Set([]),
};

export function lugarDeRegreso(ruta: string): LugarDeRegreso {
  const sinQuery = ruta.split('?')[0] ?? ruta;
  const tramos = sinQuery.replace(/^\/panel\/inmobiliaria\/?/, '').split('/').filter(Boolean);
  const seccion = tramos[0];
  const segundo = tramos[1];
  const esFicha = tramos.length >= 2 && !(seccion && NO_ES_FICHA[seccion]?.has(segundo ?? ''));
  switch (seccion) {
    case 'contratos':
      return esFicha ? 'contrato' : 'lista';
    case 'inmuebles':
      return esFicha ? 'inmueble' : 'lista';
    case 'cobros':
      return esFicha ? 'cobro' : 'lista';
    case 'propietarios':
      return esFicha ? 'propietario' : 'lista';
    case 'pagos':
      // Dispersiones vive dentro de Pagos (`/pagos/dispersiones/...`).
      return segundo === 'dispersiones' ? 'dispersiones' : 'otro';
    default:
      return 'otro';
  }
}
