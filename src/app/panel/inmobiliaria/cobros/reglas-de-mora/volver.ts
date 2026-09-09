/**
 * A dónde vuelve el «Volver» de Reglas de mora.
 *
 * Se llega desde Cobros o desde la ficha de un contrato, que manda
 * `?volver=` con su propia ruta. Sólo vale un destino dentro del panel de la
 * inmobiliaria: aceptar cualquier cosa sería un redirect abierto. Un destino
 * del panel que no sea un contrato sigue yendo a Cobros, que es de donde se
 * entra normalmente.
 */

const COBROS = '/panel/inmobiliaria/cobros';
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
