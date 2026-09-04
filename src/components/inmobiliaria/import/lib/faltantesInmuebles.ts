/**
 * faltantesInmuebles — Spanish labels for the `faltantes` vocabulary the
 * durable import backend reports per row (wu-4-report.md §6).
 *
 * "An UNKNOWN string must render as a generic 'falta un dato', never be
 * dropped" — the exact rule `resolveListingType`/`resolveConversationKind`
 * apply elsewhere in this task for an unrecognised enum member (C19), here
 * applied to a string the row-review list must still show *something* for.
 */

export type FaltanteInmueble =
  | 'titulo'
  | 'direccion'
  | 'ciudad'
  | 'barrio'
  | 'tipo'
  | 'area'
  | 'canon'
  | 'precio_venta'
  | 'precio_inconsistente'
  | 'tipo_de_negocio'
  | 'departamento'
  | 'fecha_consignacion'
  | 'posible_duplicado';

const ETIQUETAS: Record<FaltanteInmueble, string> = {
  titulo: 'título',
  direccion: 'dirección',
  ciudad: 'ciudad',
  barrio: 'barrio',
  tipo: 'tipo de inmueble',
  area: 'área',
  canon: 'canon mensual',
  precio_venta: 'precio de venta',
  precio_inconsistente: 'canon y precio de venta juntos (elegí uno)',
  tipo_de_negocio: 'tipo de operación (arriendo/venta)',
  departamento: 'departamento',
  fecha_consignacion: 'fecha de consignación',
  posible_duplicado: 'posible duplicado — revisar antes de continuar',
};

const GENERICA = 'falta un dato';

/** Never throws — an unrecognised string degrades to a generic label
 * instead of being dropped from the list (wu-4-report.md §6). */
export function etiquetaDeFaltante(faltante: string): string {
  return ETIQUETAS[faltante as FaltanteInmueble] ?? GENERICA;
}

/** `posible_duplicado` is the one faltante whose only exit is a dedicated
 * action (`PATCH filas/:id { permitirDuplicado: true }`), not a form field. */
export function esPosibleDuplicado(faltantes: string[]): boolean {
  return faltantes.includes('posible_duplicado');
}

/**
 * Qué decía la celda del archivo para este faltante.
 *
 * «Falta el tipo de inmueble» sobre una celda que dice `APTO` manda a buscar
 * un dato que SÍ está escrito, sólo que con una palabra que el catálogo no
 * conoce. El valor sigue en `datos` —la validación del importador es holgada
 * a propósito y no descarta la celda— así que mostrarlo no cuesta una
 * consulta ni un campo nuevo.
 *
 * Sólo para los faltantes donde el valor original ES la explicación: un
 * `titulo` vacío no tiene nada que mostrar.
 */
export function celdaDelFaltanteInmueble(
  datos: Record<string, unknown> | null | undefined,
  faltante: string,
): string | null {
  const texto = (v: unknown) => {
    const t = String(v ?? '').trim();
    if (!t) return null;
    return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  };
  switch (faltante) {
    case 'tipo':
      return texto(datos?.type);
    case 'tipo_de_negocio':
      return texto(datos?.listingType);
    case 'departamento':
      return texto(datos?.department);
    case 'fecha_consignacion':
      return texto(datos?.consignedAt);
    case 'area':
      return texto(datos?.area);
    default:
      return null;
  }
}
