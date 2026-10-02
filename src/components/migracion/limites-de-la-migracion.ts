/**
 * Los topes de la migración de terceros y de contratos, del lado del cliente
 * (02-10-2026).
 *
 * Espejo de los del back —mismos números, mismas frases—:
 *  · `back/src/contracts/dto/limites-de-la-migracion-de-contratos.ts`;
 *  · `back/src/inmobiliaria/migracion-terceros/dto/limites-de-la-migracion-de-terceros.ts`
 *    (el tope de filas de terceros ya tenía espejo: `MAX_FILAS_POR_LOTE`).
 *
 * Lo que el back rechaza se ataja ANTES de mandar nada: un archivo que pasa
 * del tope no se sube para volver con un 400, y un canon con ceros de más se
 * dice debajo del campo sin viajar.
 *
 * 🔴 Ojo con el camino del ARCHIVO de contratos: sus celdas las lee
 * `plataDeContrato` (`src/lib/contratos/armar-fila.ts`), que deja ausente lo
 * que pasa del INT4 — la fila sale con su faltante y se corrige acá, con el
 * tope de la corrección a mano. Una celda nunca tira el archivo.
 */

/** El canon más alto al corregir una fila a mano: $2.000.000.000 al mes. */
export const CANON_MAXIMO_AL_CORREGIR = 2_000_000_000;

/**
 * Cuántos contratos puede traer un archivo: 5.000, el tope del back
 * (`MigrarContratosDto.contratos` y `MAX_FILAS_POR_LOTE` del servicio). El de
 * terceros es el mismo número y ya vive en `MAX_FILAS_POR_LOTE`
 * (`src/lib/api/migracion-terceros.service.ts`).
 */
export const MAX_CONTRATOS_POR_ARCHIVO = 5_000;

/** Las fechas que se escriben a mano al corregir una fila. */
export const FECHA_DEL_CONTRATO_DESDE = '1900-01-01';
export const FECHA_DEL_CONTRATO_HASTA = '2100-12-31';

export const MENSAJES_DE_LA_MIGRACION = {
  // Sólo pesos enteros, con la frase del inmueble (Nico, 02-10-2026).
  canonEntero: 'Escribe el canon en pesos enteros, sin centavos.',
  canonMinimo: 'El canon tiene que ser mayor que cero.',
  canonMaximoAlCorregir:
    'El canon no puede pasar de $2.000.000.000 al mes. Revisa que no sobren ceros.',
  demasiadosContratos:
    'Un archivo puede traer hasta 5.000 contratos. Pártelo en dos archivos y súbelos por separado.',
  fechaFueraDeRango: 'La fecha debe estar entre el año 1900 y el 2100.',
  finAntesDelInicio: 'La fecha de fin tiene que ser posterior a la de inicio.',
  diaDePago: 'El día de pago va del 1 al 28.',
  comision: 'La comisión va de 0 a 100 %.',
  // Las dos de la fecha de corte son las de `fecha-de-corte.service.ts`.
  fechaDeCorteInvalida: 'La fecha de corte tiene que ser un día del calendario (AAAA-MM-DD).',
  fechaDeCorteFueraDeRango:
    'La fecha de corte tiene que estar entre el año 2000 y un año hacia adelante.',
} as const;

/** El rango de la fecha de corte del back: desde el 2000 hasta 366 días adelante. */
export const FECHA_DE_CORTE_DESDE = '2000-01-01';
export const DIAS_HACIA_ADELANTE_DE_LA_FECHA_DE_CORTE = 366;

const M = MENSAJES_DE_LA_MIGRACION;

/** El error del canon escrito a mano, o `null` si sirve. */
export function errorDelCanon(texto: string): string | null {
  const n = Number(texto);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return M.canonEntero;
  if (n <= 0) return M.canonMinimo;
  if (n > CANON_MAXIMO_AL_CORREGIR) return M.canonMaximoAlCorregir;
  return null;
}

/** El error del día de pago escrito a mano, o `null` si sirve. */
export function errorDelDiaDePago(texto: string): string | null {
  const n = Number(texto);
  return Number.isInteger(n) && n >= 1 && n <= 28 ? null : M.diaDePago;
}

/** El error de una comisión escrita a mano (vacía = no se manda). */
export function errorDeLaComision(texto: string): string | null {
  if (!texto.trim()) return null;
  const n = Number(texto);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? null : M.comision;
}

/** Un `AAAA-MM-DD` de un `<input type="date">` dentro del rango del back. */
function fechaEnRango(dia: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(dia) &&
    dia >= FECHA_DEL_CONTRATO_DESDE &&
    dia <= FECHA_DEL_CONTRATO_HASTA
  );
}

/**
 * Los errores de las dos fechas de un contrato, por campo (los nombres son los
 * del back: `startDate`, `endDate`). Vacío = se pueden mandar.
 */
export function erroresDeLasFechas(
  inicio: string,
  fin: string,
): Partial<Record<'startDate' | 'endDate', string>> {
  const errores: Partial<Record<'startDate' | 'endDate', string>> = {};
  if (!fechaEnRango(inicio)) errores.startDate = M.fechaFueraDeRango;
  if (!fechaEnRango(fin)) errores.endDate = M.fechaFueraDeRango;
  if (!errores.startDate && !errores.endDate && fin <= inicio) {
    errores.endDate = M.finAntesDelInicio;
  }
  return errores;
}

/**
 * El error de la fecha de corte antes de mandarla, con las frases del back
 * (`fecha-de-corte.service.ts`), o `null` si sirve.
 */
export function errorDeLaFechaDeCorte(dia: string, hoy: Date = new Date()): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  const fecha = m ? new Date(`${dia}T00:00:00.000Z`) : null;
  if (!fecha || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== dia) {
    return M.fechaDeCorteInvalida;
  }
  const tope = new Date(hoy.getTime() + DIAS_HACIA_ADELANTE_DE_LA_FECHA_DE_CORTE * 24 * 3600 * 1000);
  if (dia < FECHA_DE_CORTE_DESDE || fecha.getTime() > tope.getTime()) {
    return M.fechaDeCorteFueraDeRango;
  }
  return null;
}
