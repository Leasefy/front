/**
 * resumenDeLectura — qué alcanzó a leer la importación, con el número exacto.
 *
 * ── Por qué hace falta, teniendo ya el resumen de arriba ────────────────────
 *
 * El resumen que ya existe cuenta filas: cuántas entran, cuántas se excluyeron,
 * cuántos errores quedan. Eso no responde la pregunta con la que alguien
 * termina el paso: «¿y cuántos quedaron con propietario?». Un archivo puede
 * traer las 2.895 filas perfectas y no traer una sola cédula — y entonces el
 * back va a crear 2.895 inmuebles sin dueño, sin un solo error.
 *
 * Acá no se promete asociación: a qué ficha queda cada propietario lo decide el
 * back al activar. Lo que sí se puede afirmar es cuántas filas traen CON QUÉ
 * buscar, y cuántas no traen nada. Y el motivo, en una frase.
 */

import type { ImportProperty } from './importTypes';
import { resolveImportListingType } from './requisitosDelBack';

export interface RenglonDeLectura {
  /** «Código del sistema anterior», «Propietario con documento»… */
  que: string;
  /** Cuántas filas lo traen. */
  con: number;
  /** Por qué las otras no. Vacío cuando no falta ninguna. */
  porque: string;
}

export interface ResumenDeLecturaDeInmuebles {
  total: number;
  renglones: RenglonDeLectura[];
}

export function resumenDeLecturaDeInmuebles(
  inmuebles: readonly ImportProperty[],
): ResumenDeLecturaDeInmuebles {
  const total = inmuebles.length;
  const cuenta = (predicado: (p: ImportProperty) => boolean) =>
    inmuebles.filter(predicado).length;

  const conCodigo = cuenta((p) => Boolean(p.externalId?.trim()));
  const conDireccion = cuenta((p) => Boolean(p.propertyAddress?.trim()));
  const conCiudad = cuenta((p) => Boolean(p.propertyCity?.trim()));
  const conDocumento = cuenta((p) => Boolean(p.ownerDocument?.trim()));
  const conNombreSolo = cuenta(
    (p) => !p.ownerDocument?.trim() && Boolean(p.ownerName?.trim()),
  );
  const conPrecio = cuenta((p) =>
    resolveImportListingType(p.listingType) === 'sale'
      ? p.salePrice != null && p.salePrice > 0
      : p.monthlyRent != null && p.monthlyRent > 0,
  );
  const conEstrato = cuenta((p) => p.stratum != null);

  const faltan = (con: number) => total - con;

  return {
    total,
    renglones: [
      {
        que: 'Código del sistema anterior',
        con: conCodigo,
        porque:
          conCodigo === total
            ? ''
            : `${faltan(conCodigo)} filas no traen código. Es la llave con la que sus contratos nombran al inmueble: sin ella hay que cruzarlos por dirección.`,
      },
      {
        que: 'Dirección',
        con: conDireccion,
        porque:
          conDireccion === total
            ? ''
            : `${faltan(conDireccion)} filas no traen dirección y no se pueden activar así.`,
      },
      {
        que: 'Ciudad',
        con: conCiudad,
        porque:
          conCiudad === total ? '' : `${faltan(conCiudad)} filas no traen municipio ni ciudad.`,
      },
      {
        que: 'Propietario con documento',
        con: conDocumento,
        porque:
          conDocumento === total
            ? ''
            : `${faltan(conDocumento)} filas quedan sin cédula ni NIT del dueño` +
              (conNombreSolo > 0
                ? ` (${conNombreSolo} traen sólo el nombre: se puede buscar por nombre exacto, pero dos personas se llaman igual).`
                : '.'),
      },
      {
        que: 'Precio (canon o venta)',
        con: conPrecio,
        porque:
          conPrecio === total
            ? ''
            : `${faltan(conPrecio)} filas traen el precio en 0 o vacío. Se importan igual y se completan en la revisión.`,
      },
      {
        que: 'Estrato',
        con: conEstrato,
        porque:
          conEstrato === total
            ? ''
            : `${faltan(conEstrato)} filas traen un estrato que no es un número del 1 al 6 («No Estratificada», por ejemplo).`,
      },
    ],
  };
}
