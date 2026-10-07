/**
 * 🟡 BU-12 (QA del 04-10-2026, contador): las acciones rápidas del buscador
 * eran las mismas para todos («Ir a Cobranza», «Ir a Asegurabilidad», «Ver
 * reportes»): al contador no le ofrecían nada de su trabajo (Facturación,
 * Contabilidad, Conciliación). Cada rol ve las suyas; el administrador, las de
 * siempre. Después de esto cada acción pasa además por su permiso y por el
 * mismo gate del menú (`seVeEnElBuscador`): nunca se ofrece una puerta cerrada.
 */

export type IdDeAccionRapida =
  | 'qa-nueva-consignacion'
  | 'qa-cobranza'
  | 'qa-cotizador'
  | 'qa-reportes'
  | 'qa-portafolio'
  | 'qa-facturacion'
  | 'qa-contabilidad'
  | 'qa-conciliacion'
  | 'qa-postulaciones'
  | 'qa-cartera';

/** Lo de hoy: el administrador (y cualquier rol sin lista propia). */
export const ACCIONES_DEL_ADMINISTRADOR: readonly IdDeAccionRapida[] = [
  'qa-nueva-consignacion',
  'qa-cobranza',
  'qa-cotizador',
  'qa-reportes',
  'qa-portafolio',
];

export const ACCIONES_DEL_ROL: Readonly<Record<string, readonly IdDeAccionRapida[]>> = {
  CONTADOR: ['qa-facturacion', 'qa-contabilidad', 'qa-conciliacion'],
  // El asesor es comercial: captar, mostrar y postular.
  AGENTE: ['qa-nueva-consignacion', 'qa-portafolio', 'qa-postulaciones', 'qa-cotizador'],
  AUXILIAR_CARTERA: ['qa-cobranza', 'qa-cartera'],
};

/** Las acciones (en orden) que se le ofrecen a este rol, antes de los permisos. */
export function accionesDelRol(isAdmin: boolean, agencyRole: string | null | undefined): readonly IdDeAccionRapida[] {
  if (isAdmin) return ACCIONES_DEL_ADMINISTRADOR;
  return (agencyRole && ACCIONES_DEL_ROL[agencyRole]) || ACCIONES_DEL_ADMINISTRADOR;
}

/**
 * BU-12: el botón principal de la barra («Nuevo …») ofrecía al contador
 * «Nueva asegurabilidad», que no es su trabajo. Los roles sin flujos
 * comerciales tienen su propio botón principal; los demás (administrador,
 * asesor), el «Nuevo» de siempre.
 */
export interface BotonPrincipalDelRol {
  labelKey: string;
  href: string;
  permiso: { module: string; action: string };
  icono: 'factura' | 'cartera';
}

const BOTON_PRINCIPAL_DEL_ROL: Readonly<Record<string, BotonPrincipalDelRol>> = {
  CONTADOR: {
    labelKey: 'inmobiliaria.commandPalette.quickActions.facturacion',
    href: '/panel/inmobiliaria/facturacion',
    permiso: { module: 'cobros', action: 'view' },
    icono: 'factura',
  },
  AUXILIAR_CARTERA: {
    labelKey: 'inmobiliaria.commandPalette.quickActions.cartera',
    href: '/panel/inmobiliaria/pagos/cartera',
    permiso: { module: 'cobros', action: 'view' },
    icono: 'cartera',
  },
};

/** `null` = el botón «Nuevo» de siempre. */
export function botonPrincipalDelRol(isAdmin: boolean, agencyRole: string | null | undefined): BotonPrincipalDelRol | null {
  if (isAdmin || !agencyRole) return null;
  return BOTON_PRINCIPAL_DEL_ROL[agencyRole] ?? null;
}
