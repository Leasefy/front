/**
 * Las columnas del archivo de asientos históricos y cómo se convierten en el
 * lote que espera `POST /inmobiliaria/contabilidad/migracion/{revisar,aplicar}`.
 *
 * ── La forma del archivo ────────────────────────────────────────────────────
 *
 * Una fila por MOVIMIENTO (una pata del asiento), que es como exportan el
 * libro diario Siigo, World Office, Helisa y un Excel a mano. Las filas con
 * el mismo número de comprobante forman un asiento; si el archivo no trae
 * número, se agrupan las que comparten fecha y descripción.
 *
 * ── Qué se reusa de terceros ───────────────────────────────────────────────
 *
 * El auto-mapeo (`mapearColumnas`, `remapear`, `obligatoriasSinMapear`) es
 * genérico: recibe `ColumnaDePlantilla[]` y no sabe de terceros. Lo único
 * propio de acá es el catálogo de columnas —el back no tiene un
 * `GET /plantilla` para asientos— y `armarAsientos`, que agrupa.
 */

import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service';
import type { AsientoMigrado, MovimientoMigrado } from '@/lib/api/contabilidad.service';
import type { MapeoDeColumna } from './columnas-de-tercero';

export type CampoDeAsiento =
  | 'numero'
  | 'fecha'
  | 'descripcion'
  | 'codigoCuenta'
  | 'debito'
  | 'credito'
  | 'detalle';

/**
 * Los alias son los encabezados con que esos programas exportan; se comparan
 * normalizados (sin tildes, minúsculas) y los de menos de 4 letras sólo por
 * igualdad exacta.
 */
export const COLUMNAS_DE_ASIENTO: readonly (ColumnaDePlantilla & { campo: CampoDeAsiento })[] = [
  {
    campo: 'numero',
    titulo: 'Número del comprobante',
    obligatoria: false,
    ejemplo: 'CE-0001',
    alias: ['numero', 'comprobante', 'numero comprobante', 'consecutivo', 'asiento', 'documento', 'numero documento', 'nro', 'no'],
    ayuda: 'Las filas con el mismo número forman un asiento. Sin esta columna se agrupan por fecha y descripción.',
  },
  {
    campo: 'fecha',
    titulo: 'Fecha',
    obligatoria: true,
    ejemplo: '15/01/2025',
    alias: ['fecha', 'fecha comprobante', 'fecha asiento', 'date'],
    ayuda: 'AAAA-MM-DD o DD/MM/AAAA; con hora también sirve.',
  },
  {
    campo: 'descripcion',
    titulo: 'Descripción',
    obligatoria: true,
    ejemplo: 'Canon enero apto 301',
    alias: ['descripcion', 'concepto', 'glosa', 'observaciones', 'observacion'],
  },
  {
    campo: 'codigoCuenta',
    titulo: 'Código de cuenta',
    obligatoria: true,
    ejemplo: '110505',
    alias: ['codigo cuenta', 'cuenta', 'codigo', 'cuenta contable', 'codigo puc', 'puc', 'cta'],
    ayuda: 'Sólo el código; con puntos o guiones también se entiende (1105-05 → 110505).',
  },
  {
    campo: 'debito',
    titulo: 'Débito',
    obligatoria: false,
    ejemplo: '1.500.000',
    alias: ['debito', 'debe', 'debitos', 'valor debito'],
  },
  {
    campo: 'credito',
    titulo: 'Crédito',
    obligatoria: false,
    ejemplo: '',
    alias: ['credito', 'haber', 'creditos', 'valor credito'],
  },
  {
    campo: 'detalle',
    titulo: 'Detalle de la línea',
    obligatoria: false,
    ejemplo: 'Apto 301 — enero',
    alias: ['detalle', 'detalle movimiento', 'descripcion movimiento', 'nota'],
  },
];

function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** El valor crudo del monto: el back normaliza «1.500.000» y «1500000.00». */
function montoCrudo(v: unknown): string | number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return v === 0 ? undefined : v;
  const s = String(v).trim();
  return s === '' || s === '0' ? undefined : s;
}

/**
 * Filas del archivo → asientos del lote. Se conserva el orden de aparición y
 * las filas sin cuenta ni monto se saltan (son las que quedan al final).
 */
export function armarAsientos(
  filas: readonly Record<string, unknown>[],
  mapeo: readonly MapeoDeColumna[],
): AsientoMigrado[] {
  const columnaDe = new Map<string, string>();
  for (const m of mapeo) if (m.campo) columnaDe.set(m.campo, m.columna);
  const leer = (fila: Record<string, unknown>, campo: CampoDeAsiento): unknown => {
    const col = columnaDe.get(campo);
    return col === undefined ? undefined : fila[col];
  };

  const asientos = new Map<string, AsientoMigrado>();
  for (const fila of filas) {
    const codigoCuenta = texto(leer(fila, 'codigoCuenta'));
    const debito = montoCrudo(leer(fila, 'debito'));
    const credito = montoCrudo(leer(fila, 'credito'));
    if (!codigoCuenta && debito === undefined && credito === undefined) continue;

    const numero = texto(leer(fila, 'numero'));
    const fecha = texto(leer(fila, 'fecha'));
    const descripcion = texto(leer(fila, 'descripcion'));
    const clave = numero ? `n:${numero}` : `fd:${fecha}|${descripcion}`;

    let asiento = asientos.get(clave);
    if (!asiento) {
      asiento = { fecha, descripcion, movimientos: [] };
      if (numero) asiento.numeroOriginal = numero;
      asientos.set(clave, asiento);
    }

    const movimiento: MovimientoMigrado = { codigoCuenta };
    if (debito !== undefined) movimiento.debito = debito;
    if (credito !== undefined) movimiento.credito = credito;
    const detalle = texto(leer(fila, 'detalle'));
    if (detalle) movimiento.descripcion = detalle;
    asiento.movimientos.push(movimiento);
  }
  return [...asientos.values()];
}

export function nombreDeLoteDeAsientos(ahora = new Date()): string {
  const sello = ahora.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  return `asientos-${sello}`.slice(0, 60);
}
