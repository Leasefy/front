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
  // QA-PROP P-28 (back 5731a4e2): sin cuenta no se le puede girar.
  cuentaBancaria: 'cuenta bancaria',
  // COLA-FRONT (04-10): algo arrendado y ningún giro programado.
  diaDeGiro: 'día de giro',
  // QA-PROP-95 B-08 (04-10): dice «CC» y el número tiene forma de NIT de empresa.
  tipoDocumentoPorRevisar: 'revisar el tipo de documento (el número parece un NIT)',
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
  const crudo = tipo?.trim();
  // QA-PROP-95 (P-08): el tipo se dice como lo dice la gente, no con la etiqueta
  // del enum («PASSPORT: AB998877» → «Pasaporte: AB998877»).
  const t = crudo ? (TIPO_EN_PALABRAS[crudo.toUpperCase()] ?? crudo) : '';
  return t ? `${t}${separador}${n}` : n;
}

const TIPO_EN_PALABRAS: Record<string, string> = { PASSPORT: 'Pasaporte', PASAPORTE: 'Pasaporte', PPT: 'PPT', TI: 'TI', CE: 'CE', CC: 'CC', NIT: 'NIT' };

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
