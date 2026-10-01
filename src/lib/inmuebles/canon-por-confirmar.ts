/**
 * T-0129 — «canon por confirmar».
 *
 * Un inmueble puede nacer de una migración sin canon. No es un cero ni un
 * dato inventado: es un inmueble al que le falta ese dato, y mientras falte no
 * se publica, no se consigna, no se le hacen contratos ni cobros.
 */
import { ApiError } from '@/lib/api/client';

export const CODIGO_INMUEBLE_SIN_CANON = 'INMUEBLE_SIN_CANON';

/** Lo que se le dice a la persona cuando una acción choca con un inmueble así. */
export const MENSAJE_INMUEBLE_SIN_CANON =
  'Este inmueble tiene el canon por confirmar. Ponle el canon para continuar.';

/** Sustituye a «$0» o «null» donde se mostraría el canon. */
export const TEXTO_CANON_POR_CONFIRMAR = 'Por confirmar';

/** Etiqueta de la insignia. */
export const ETIQUETA_CANON_POR_CONFIRMAR = 'Canon por confirmar';

/**
 * Lo que dice el aviso por fila antes de crear: la fila entra, pero queda
 * marcada.
 */
export const AVISO_FILA_SIN_CANON = 'Sin canon: se crea con el canon por confirmar';

/** Advertencia obligatoria al poner un canon por defecto en bloque. */
export const AVISO_CANON_POR_DEFECTO =
  'Queda como canon por confirmar: no se usa para contratos, cobros ni facturas hasta que lo pongas a mano en el inmueble.';

export function esErrorInmuebleSinCanon(e: unknown): e is ApiError {
  return e instanceof ApiError && e.code === CODIGO_INMUEBLE_SIN_CANON;
}

/** `details.inmuebleId` del 409, si vino. */
export function inmuebleIdDelError(e: unknown): string | null {
  if (!esErrorInmuebleSinCanon(e)) return null;
  const details = e.detalle?.details;
  if (details && typeof details === 'object') {
    const id = (details as Record<string, unknown>).inmuebleId;
    if (typeof id === 'string' && id) return id;
  }
  return null;
}

/** Ruta de la ficha del inmueble, donde se pone el canon. */
export function rutaParaPonerElCanon(inmuebleId: string): string {
  return `/panel/inmobiliaria/inmuebles/${inmuebleId}?editar=1`;
}

/** Un canon para mostrar: «Por confirmar» cuando no se sabe, nunca «$0» ni «null». */
export function canonParaMostrar(
  monthlyRent: number | null | undefined,
  canonPorConfirmar: boolean | null | undefined,
  formatear: (n: number) => string,
): string {
  if (canonPorConfirmar || monthlyRent == null) return TEXTO_CANON_POR_CONFIRMAR;
  return formatear(monthlyRent);
}

/**
 * El motivo de una fila `fallida` de la migración de contratos NO viaja como
 * 409: el back lo escribe en la fila con el mismo texto. Se reconoce por su
 * comienzo y se dice con la misma frase que en todas las demás pantallas.
 */
export function motivoDeFilaConCanonPorConfirmar(motivo: string | undefined): string {
  if (!motivo) return '';
  return motivo.startsWith('Este inmueble tiene el canon por confirmar')
    ? MENSAJE_INMUEBLE_SIN_CANON
    : motivo;
}
