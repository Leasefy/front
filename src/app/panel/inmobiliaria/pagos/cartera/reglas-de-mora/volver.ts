/**
 * A dónde vuelve el «Volver» de Reglas de mora.
 *
 * Se llega desde la lista de cobros emitidos (el botón «Reglas de mora» de su
 * encabezado) o desde la ficha de un contrato, que manda `?volver=` con su
 * propia ruta. Sólo vale un destino dentro del panel de la inmobiliaria:
 * aceptar cualquier cosa sería un redirect abierto. Un destino del panel que no
 * sea un contrato sigue yendo a la lista de cobros, que es de donde se entra
 * normalmente — desde el 2026-09-15 esa lista vive dentro de Cartera
 * (`/pagos/cartera/cobros`), pero el botón y el regreso son los mismos.
 */

const COBROS = '/panel/inmobiliaria/pagos/cartera/cobros';
const CONTRATOS = '/panel/inmobiliaria/contratos/';

export interface DestinoDeVolver {
  href: string;
  label: string;
}

export function destinoDeVolver(volver: string | null): DestinoDeVolver {
  // El prefijo del contrato ya está dentro del panel: nada de fuera pasa.
  if (volver && volver.startsWith(CONTRATOS)) {
    return { href: volver, label: 'Volver al contrato' };
  }
  return { href: COBROS, label: 'Volver a cobros' };
}
