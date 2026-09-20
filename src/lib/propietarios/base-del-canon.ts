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
 * Los rótulos en español, iguales a los del back (`ROTULO_DEL_CANON` y
 * `QUE_ES_EL_CANON_*` en `propietarios/base-del-canon.ts`). Son para lo que no
 * pasa por i18n: el Excel del propietario y las pantallas del asistente de
 * dispersión y la tarjeta, que están escritas en español. Una pantalla con
 * `t()` usa sus claves.
 */
export const ROTULO_DEL_CANON: Readonly<Record<BaseDelCanonDelExtracto, string>> = Object.freeze({
  CAUSADO: 'Canon causado',
  RECAUDADO: 'Canon recaudado',
  MIXTA: 'Canon causado y recaudado',
});

/** Lo que significa «causado», en palabras de quien lo lee. */
export const QUE_ES_EL_CANON_CAUSADO =
  'lo que el contrato cobra ese mes, aunque el inquilino no haya pagado';

/** Lo que significa «recaudado». */
export const QUE_ES_EL_CANON_RECAUDADO = 'lo que el inquilino efectivamente pagó de ese mes';

/** Lo que una dispersión trae para decidir su base. */
export interface DispersionConBase {
  /** La manda el back desde el 2026-09-16 (`GET /inmobiliaria/dispersiones`). */
  baseDelCanon?: BaseDelCanon | null;
  /** La columna `Dispersion.baseDeCalculo`, cuando existe y está escrita. */
  baseDeCalculo?: string | null;
  items?: readonly LineaConBase[];
}

/**
 * La base de UNA dispersión. Si el back la manda, ésa. Si no (un back anterior
 * al 2026-09-16, o la respuesta de aprobar/girar, que no la trae), la columna
 * `baseDeCalculo`; y sin ella se deduce igual que el back
 * (`dispersiones/base-de-la-dispersion.ts`): una dispersión vieja por cobros
 * —líneas con cobro y sin cuota— es RECAUDADO; la que sale de las cuotas del
 * propietario, CAUSADO, que es la base por defecto.
 */
export function baseDeLaDispersion(dispersion: DispersionConBase): BaseDelCanon {
  if (dispersion.baseDelCanon === 'CAUSADO' || dispersion.baseDelCanon === 'RECAUDADO') {
    return dispersion.baseDelCanon;
  }
  if (dispersion.baseDeCalculo === 'CAUSADO' || dispersion.baseDeCalculo === 'RECAUDADO') {
    return dispersion.baseDeCalculo;
  }
  const items = dispersion.items ?? [];
  return items.length > 0 && items.every((i) => baseDeLaLinea(i) === 'RECAUDADO')
    ? 'RECAUDADO'
    : 'CAUSADO';
}

/**
 * La base de varias dispersiones juntas (una tabla, un Excel): `MIXTA` cuando
 * conviven. Sin ninguna es CAUSADO, la base por defecto.
 */
export function baseDeLasDispersiones(
  dispersiones: readonly { baseDelCanon: BaseDelCanon }[],
): BaseDelCanonDelExtracto {
  let causado = false;
  let recaudado = false;
  for (const d of dispersiones) {
    if (d.baseDelCanon === 'RECAUDADO') recaudado = true;
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
