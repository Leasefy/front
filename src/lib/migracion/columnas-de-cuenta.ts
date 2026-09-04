/**
 * Las columnas del archivo del plan de cuentas y cómo se vuelven el cuerpo
 * de `POST /inmobiliaria/contabilidad/puc/importar/{revisar,}`.
 *
 * ── La forma del archivo ────────────────────────────────────────────────────
 *
 * Una fila por cuenta: código y nombre, y a veces naturaleza e imputable.
 * Es como exportan el PUC Siigo, World Office, Helisa y un Excel a mano —
 * la mitad de los archivos traen sólo dos columnas, y con eso alcanza: la
 * naturaleza se deduce de la clase y el imputable del árbol.
 *
 * ── Qué se reusa ───────────────────────────────────────────────────────────
 *
 * El auto-mapeo (`mapearColumnas`, `remapear`, `obligatoriasSinMapear`) es
 * genérico. Lo propio de acá es el catálogo de columnas y `armarCuentas`, que
 * es casi un pasamanos: el back lee cada celda por su cuenta y dice fila por
 * fila qué entendió, así que acá no se interpreta nada — sólo se recorta lo
 * que rompería el `@MaxLength` del DTO (un 400 al archivo entero).
 */

import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service';
import type { CuentaImportada } from '@/lib/api/contabilidad.service';
import type { MapeoDeColumna } from './columnas-de-tercero';

export type CampoDeCuenta = 'codigo' | 'nombre' | 'naturaleza' | 'imputable';

export const COLUMNAS_DE_CUENTA: readonly (ColumnaDePlantilla & { campo: CampoDeCuenta })[] = [
  {
    campo: 'codigo',
    titulo: 'Código',
    obligatoria: true,
    ejemplo: '110505',
    alias: ['codigo', 'codigo cuenta', 'cuenta', 'codigo puc', 'puc', 'cta', 'cod', 'cod cuenta', 'codigo contable', 'nro cuenta', 'numero cuenta', 'account', 'code'],
    ayuda: 'Sólo el código; con puntos o guiones también se entiende (1105-05 → 110505).',
  },
  {
    campo: 'nombre',
    titulo: 'Nombre',
    obligatoria: true,
    ejemplo: 'Caja general',
    alias: ['nombre', 'nombre cuenta', 'descripcion', 'denominacion', 'cuenta contable', 'detalle', 'name', 'description'],
  },
  {
    campo: 'naturaleza',
    titulo: 'Naturaleza',
    obligatoria: false,
    ejemplo: 'Débito',
    alias: ['naturaleza', 'tipo', 'debito credito', 'db cr', 'nature'],
    ayuda: 'Débito o Crédito. Si falta, se deduce de la clase (el primer dígito).',
  },
  {
    campo: 'imputable',
    titulo: 'Recibe movimientos',
    obligatoria: false,
    ejemplo: 'Sí',
    alias: ['imputable', 'movimiento', 'recibe movimientos', 'auxiliar', 'detalle si no', 'es auxiliar', 'nivel detalle'],
    ayuda: 'Sí/No. Si falta, lo decide el árbol: las cuentas con subcuentas no reciben movimientos.',
  },
];

/**
 * Los `@MaxLength` de `CuentaImportadaDto`. Una celda más larga que esto
 * tumba el archivo entero con 400; se recorta acá para que llegue al back y
 * sea el back el que la marque fila por fila.
 */
const LIMITES_DTO = { codigo: 40, nombre: 300 } as const;

function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return '';
  return String(v).trim();
}

function cap(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n);
}

/**
 * Filas del archivo → cuentas para revisar. Se conserva el orden y el índice
 * de cada una es su fila en el archivo (el back lo devuelve tal cual, y en
 * pantalla se muestra +2). Las filas totalmente vacías se saltan: son las que
 * Excel deja al final.
 */
export function armarCuentas(
  filas: readonly Record<string, unknown>[],
  mapeo: readonly MapeoDeColumna[],
): CuentaImportada[] {
  const columnaDe = new Map<string, string>();
  for (const m of mapeo) if (m.campo) columnaDe.set(m.campo, m.columna);
  const leer = (fila: Record<string, unknown>, campo: CampoDeCuenta): unknown => {
    const col = columnaDe.get(campo);
    return col === undefined ? undefined : fila[col];
  };

  const cuentas: CuentaImportada[] = [];
  for (const fila of filas) {
    const codigo = cap(texto(leer(fila, 'codigo')), LIMITES_DTO.codigo);
    const nombre = cap(texto(leer(fila, 'nombre')), LIMITES_DTO.nombre);
    if (!codigo && !nombre) continue;

    const naturaleza = texto(leer(fila, 'naturaleza'));
    const imputableCrudo = leer(fila, 'imputable');
    const imputable =
      typeof imputableCrudo === 'boolean' ? imputableCrudo : texto(imputableCrudo);

    cuentas.push({
      codigo,
      nombre,
      ...(naturaleza ? { naturaleza } : {}),
      ...(imputable !== '' ? { imputable } : {}),
    });
  }
  return cuentas;
}
