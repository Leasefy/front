/**
 * Datos por completar (T-0128).
 *
 * Una ficha creada por la migración puede nacer SIN documento: la inmobiliaria
 * prefiere tener a la persona registrada e incompleta que perderla. El back lo
 * reporta en `datosPendientes`; acá se traduce a palabras y se decide cómo
 * mostrar un documento que no existe.
 */

/** Lo que se muestra donde iría el número de documento y no hay. */
export const SIN_REGISTRAR = 'Sin registrar';

const ETIQUETA_DEL_DATO: Record<string, string> = {
  documento: 'documento',
  tipoDocumento: 'tipo de documento',
};

/** El número de documento listo para pintar: «Sin registrar» si no hay. */
export function documentoParaMostrar(numero: string | null | undefined): string {
  const limpio = numero?.trim();
  return limpio ? limpio : SIN_REGISTRAR;
}

/**
 * «CC: 123», «Sin registrar» si falta el número, y sólo el número si falta el
 * tipo. Nunca imprime «null» ni deja un separador colgando.
 */
export function documentoConTipo(
  tipo: string | null | undefined,
  numero: string | null | undefined,
  separador = ': ',
): string {
  const n = numero?.trim();
  if (!n) return SIN_REGISTRAR;
  const t = tipo?.trim();
  return t ? `${t}${separador}${n}` : n;
}

/**
 * «Datos por completar: documento, tipo de documento», o `null` si no falta
 * nada. Un dato que el back agregue después se muestra tal cual en vez de
 * perderse.
 */
export function textoDeDatosPorCompletar(
  pendientes: readonly string[] | null | undefined,
): string | null {
  if (!pendientes || pendientes.length === 0) return null;
  const etiquetas = pendientes.map((p) => ETIQUETA_DEL_DATO[p] ?? p);
  return `Datos por completar: ${etiquetas.join(', ')}`;
}
