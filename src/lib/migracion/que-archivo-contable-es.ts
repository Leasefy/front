/**
 * ¿Este archivo es el libro diario o el export de comprobantes?
 *
 * 🔴 Nico, 2026-09-12, parado en «Subir el libro diario» con el archivo de
 * comprobantes: **«¿qué es código de cuenta? ¿y por qué no lo trae, o qué
 * pasa ahí con eso?»**.
 *
 * No lo trae porque ese archivo NO PUEDE traerlo: un comprobante es una fila
 * por documento, con sus totales de débitos y créditos; el código de cuenta
 * vive en cada LÍNEA del asiento, que ese export no tiene. Y el producto ya
 * tenía la puerta correcta al lado —«Subir los comprobantes»— pero nada le
 * dijo que estaba en la equivocada. Todo lo que vio fue el nombre de una
 * columna que le faltaba.
 *
 * Un archivo en la puerta equivocada no es un archivo con un error: es la
 * puerta equivocada, y eso hay que decirlo con el nombre de la otra puerta.
 *
 * ── Cómo se decide, y por qué así ──────────────────────────────────────────
 *
 * El alias-matching lo hace `mapearColumnas`, el MISMO del auto-mapeo de la
 * pantalla. Dos normalizaciones distintas harían que la pantalla mapee una
 * columna y esto diga que no existe, o al revés.
 *
 * La regla es conservadora a propósito: ante la duda **no se dice nada**.
 * Mandar a alguien a la otra puerta con un archivo que sí era de ésta cuesta
 * más que quedarse callado.
 */

import { mapearColumnas } from './columnas-de-tercero';
import { COLUMNAS_DE_ASIENTO } from './columnas-de-asiento';
import { COLUMNAS_DE_DOCUMENTO } from './columnas-de-documento';

export type FormaDeArchivoContable = 'libro-diario' | 'comprobantes';

/**
 * Columnas que SÓLO existen en el export de comprobantes.
 *
 * Un libro diario no tiene prefijo de documento, ni balance, ni el cuerpo de
 * anticipos: son propiedades del comprobante entero, no de un movimiento.
 */
const SOLO_DE_COMPROBANTES = [
  'prefijo',
  'balance',
  'descuadrado',
  'anulado',
  'esAnticipo',
  'terceroAnticipo',
  'anticipoAplicado',
  'valorRestanteAnticipo',
  'creadoPor',
  'fechaCreacionOrigen',
] as const;

/**
 * Cuántas señales propias de comprobantes hacen falta para afirmarlo.
 *
 * Tres, no una: «Anulado» sola podría estar en un libro diario exportado a
 * mano. Las tres juntas ya no son casualidad — el archivo real de Nico trae
 * las diez.
 */
export const SENALES_PARA_AFIRMAR = 3;

export interface QueArchivoEs {
  forma: FormaDeArchivoContable | null;
  /** Los encabezados que lo delatan, tal como venían en el archivo. */
  senales: string[];
}

/**
 * Qué archivo parece, mirando SÓLO los encabezados.
 *
 * `null` = no hay evidencia suficiente y no se afirma nada.
 */
export function queArchivoContableEs(encabezados: string[]): QueArchivoEs {
  if (encabezados.length === 0) return { forma: null, senales: [] };

  const comoAsiento = mapearColumnas(COLUMNAS_DE_ASIENTO, encabezados);
  /*
   * 🔴 El código de cuenta es lo que hace que un asiento SEA un asiento: es
   * la única columna que dice a dónde va la plata. Si está, es el libro
   * diario y no hay nada más que discutir, traiga las columnas que traiga.
   */
  if (comoAsiento.some((m) => m.campo === 'codigoCuenta')) {
    return { forma: 'libro-diario', senales: [] };
  }

  const comoDocumento = mapearColumnas(COLUMNAS_DE_DOCUMENTO, encabezados);
  const propias = new Set<string>(SOLO_DE_COMPROBANTES);
  const senales = comoDocumento
    .filter((m) => m.campo !== null && propias.has(m.campo))
    .map((m) => m.columna);

  return senales.length >= SENALES_PARA_AFIRMAR
    ? { forma: 'comprobantes', senales }
    : { forma: null, senales };
}

/**
 * ¿Hay que avisar que este archivo va en otra puerta?
 *
 * Junta las dos mitades de la decisión, que viven en lugares distintos: qué
 * archivo PARECE (por sus encabezados) y qué dijo la PERSONA (por el mapeo).
 *
 * 🔴 Deja de avisar en cuanto alguien señala a mano una columna como código
 * de cuenta. Ahí ya contestó la pregunta —el archivo SÍ lo trae, con un
 * encabezado que no reconocimos— y seguir insistiendo sería discutirle algo
 * que ella sabe mejor que nosotros.
 */
export function hayQueAvisarDeOtraPuerta(
  encabezados: string[],
  mapeo: readonly { campo: string | null }[],
): QueArchivoEs | null {
  if (mapeo.some((m) => m.campo === 'codigoCuenta')) return null;
  const r = queArchivoContableEs(encabezados);
  return r.forma === 'comprobantes' ? r : null;
}
