/**
 * ¿El canon que se le muestra al propietario es CAUSADO o RECAUDADO?
 *
 * 🔴 El rótulo mentía: el extracto del propietario decía «Canon recaudado» y
 * Liquidaciones «Canon recibido» sobre el canon de las cuotas del mes, que es lo
 * que el contrato CAUSA ese mes, haya pagado el inquilino o no. La liquidación
 * gira por defecto con base CAUSADO (back: `dispersiones.service.ts`,
 * `BaseDeCalculo`) y se puede girar más de lo recaudado. Qué base debe ser la de
 * por defecto lo decide Nico; acá sólo se rotula con la verdad y no se toca un
 * número.
 *
 * La convención (la misma del back, `propietarios/base-del-canon.ts`, y de la
 * cartera por propietario):
 *  · «Canon causado» cuando la base es CAUSADO;
 *  · «Canon recaudado» sólo cuando es RECAUDADO.
 *
 * Las claves de i18n viven en cada pantalla; esto decide cuál base es.
 */

/** La regla de una línea: la de una cuota es CAUSADO; la de un cobro viejo, RECAUDADO. */
export type BaseDelCanon = 'CAUSADO' | 'RECAUDADO';

/** La de un extracto entero: `MIXTA` cuando conviven líneas de las dos. */
export type BaseDelCanonDelExtracto = BaseDelCanon | 'MIXTA';

/** Lo que una línea del extracto trae para decidir su base. */
export interface LineaConBase {
  /** La manda el back desde el 2026-09-16. */
  baseDelCanon?: BaseDelCanon | null;
  cuotaId?: string | null;
  cobroId?: string | null;
}

/**
 * La base de una línea. Si el back la manda, ésa. Si no (un back anterior al
 * 2026-09-16), se deduce igual que el back la asigna: una línea armada sobre un
 * cobro viejo —sin cuota— sale de `liquidarAlPropietario`, que escala el canon
 * por lo pagado (RECAUDADO); todo lo demás sale de la cuota del mes (CAUSADO).
 */
export function baseDeLaLinea(linea: LineaConBase): BaseDelCanon {
  if (linea.baseDelCanon) return linea.baseDelCanon;
  return !linea.cuotaId && linea.cobroId ? 'RECAUDADO' : 'CAUSADO';
}

/**
 * La base de un extracto. La que manda el back, o la de sus líneas. Sin líneas
 * es CAUSADO: lo que aparezca ese mes saldrá de las cuotas.
 */
export function baseDelExtracto(extracto: {
  baseDelCanon?: BaseDelCanonDelExtracto | null;
  lineItems: readonly LineaConBase[];
}): BaseDelCanonDelExtracto {
  if (extracto.baseDelCanon) return extracto.baseDelCanon;
  let causado = false;
  let recaudado = false;
  for (const linea of extracto.lineItems) {
    if (baseDeLaLinea(linea) === 'RECAUDADO') recaudado = true;
    else causado = true;
  }
  if (causado && recaudado) return 'MIXTA';
  return recaudado ? 'RECAUDADO' : 'CAUSADO';
}

/**
 * La base de la vista previa de la liquidación del mes
 * (`GET /inmobiliaria/dispersiones/preview`). El back la devuelve en `base`; el
 * front no manda `?base=`, así que si faltara es el default del endpoint:
 * CAUSADO.
 */
export function baseDeLaLiquidacion(vista: { base?: BaseDelCanon | null } | null | undefined): BaseDelCanon {
  return vista?.base === 'RECAUDADO' ? 'RECAUDADO' : 'CAUSADO';
}
