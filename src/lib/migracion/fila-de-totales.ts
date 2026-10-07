/**
 * La fila de TOTALES al final de un archivo (QA de migración, 04-10).
 *
 * Los exports de SIIGO, de Excel a mano y de varios sistemas cierran la tabla
 * con «TOTAL»/«TOTALES» y la suma de los cánones. Esa fila no es un inmueble,
 * ni un contrato, ni una persona: antes entraba como una fila más, frenada
 * («le falta el código…») y contada entre las del archivo. Ahora se reconoce,
 * se aparta y se dice («La última fila, «TOTALES», es la de totales…»).
 *
 * Regla, estricta a propósito para no tragarse un dato: sólo las ÚLTIMAS filas
 * (hasta tres: «Subtotal», «IVA», «Total»), y sólo si su PRIMERA celda con algo
 * escrito empieza con «total», «totales», «subtotal», «gran total» o «suma».
 * Un inmueble cuyo barrio se llame «Total» no queda al final con todo lo
 * anterior vacío.
 */

const ES_TOTAL = /^(sub\s*-?\s*total(es)?|total(es)?|gran\s+total|suma(s)?)(\b|$)/;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** La primera celda con algo escrito (sin la marca interna `_rowIndex`). */
function primeraCelda(fila: Record<string, unknown>): string | null {
  for (const [clave, valor] of Object.entries(fila)) {
    if (clave.startsWith('_')) continue;
    const texto = String(valor ?? '').trim();
    if (texto) return texto;
  }
  return null;
}

export function esFilaDeTotales(fila: Record<string, unknown>): boolean {
  const primera = primeraCelda(fila);
  return primera !== null && ES_TOTAL.test(normalizar(primera));
}

export interface FilaDeTotales {
  /** La fila en la hoja, como la ve la persona en Excel (`null` si no se sabe). */
  fila: number | null;
  /** Lo que dice su primera celda («TOTALES»). */
  texto: string;
}

/** Aparta las filas de totales del final. Las demás quedan tal cual. */
export function separarFilasDeTotales<T extends Record<string, unknown>>(
  filas: T[],
): { filas: T[]; totales: FilaDeTotales[] } {
  let corte = filas.length;
  while (corte > 0 && filas.length - corte < 3 && esFilaDeTotales(filas[corte - 1])) {
    corte -= 1;
  }
  if (corte === filas.length) return { filas, totales: [] };
  const totales = filas.slice(corte).map((f) => {
    const indice = typeof f._rowIndex === 'number' ? f._rowIndex : null;
    return { fila: indice === null ? null : indice + 1, texto: primeraCelda(f) ?? '' };
  });
  return { filas: filas.slice(0, corte), totales };
}

/** «La fila 9, «TOTALES», es la de totales del archivo: no se cuenta como dato.» */
export function fraseDeFilasDeTotales(totales: FilaDeTotales[]): string | null {
  if (totales.length === 0) return null;
  if (totales.length === 1) {
    const t = totales[0];
    const donde = t.fila !== null ? `La fila ${t.fila}` : 'La última fila';
    return `${donde}, «${t.texto}», es la de totales del archivo: no se cuenta como dato.`;
  }
  const filas = totales.map((t) => (t.fila !== null ? String(t.fila) : `«${t.texto}»`));
  const lista = `${filas.slice(0, -1).join(', ')} y ${filas[filas.length - 1]}`;
  return `Las filas ${lista} son de totales del archivo: no se cuentan como datos.`;
}
