const BASE = '/panel/inmobiliaria/postulaciones/asegurabilidad';

/**
 * Las rutas retiradas (maquetas sin datos detrás) vuelven al Resumen ANTES de
 * la puerta: con el micro caído se quedaban en la URL vieja, con la miga
 * «Detalle» y el cartel (revisora r25). Sus páginas siguen redirigiendo igual.
 */
export const RUTAS_RETIRADAS = ['comparar', 'ejecucion', 'integraciones'].map((r) => `${BASE}/${r}`);

export function esRutaRetirada(pathname: string | null): boolean {
  if (!pathname) return false;
  const limpia = pathname.replace(/\/+$/, '');
  return RUTAS_RETIRADAS.some((r) => limpia === r || limpia.startsWith(`${r}/`));
}
