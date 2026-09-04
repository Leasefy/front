/**
 * Leer un extracto bancario tal como lo exporta el banco.
 *
 * Cada banco manda columnas con otro nombre («Fecha de transacción», «Detalle»,
 * «Crédito»/«Débito» separados o un solo «Valor» con signo) y los valores como
 * texto («$ 1.230.000», «1,230,000.00», «-45.000»). Esto los convierte a lo que
 * el back entiende: `{ fecha: 'YYYY-MM-DD', valorCop: entero, descripcion,
 * referencia? }`. Todo es puro y está probado con los formatos reales.
 *
 * 🔴 Nunca `parseFloat` sobre el texto crudo: «1.230.000» daría 1.23.
 */

import { normalizarEncabezado } from '@/lib/migracion/columnas-de-tercero';
import type { FilaDeExtracto } from '@/lib/api/conciliacion-bancaria.types';

export type CampoDeExtracto =
  | 'fecha'
  | 'valor'
  | 'credito'
  | 'debito'
  | 'descripcion'
  | 'referencia'
  | 'documento'
  | 'referencia2'
  | 'canal';

export interface ColumnaDeExtracto {
  campo: CampoDeExtracto;
  titulo: string;
  ayuda: string;
  sinonimos: readonly string[];
}

export const COLUMNAS_DE_EXTRACTO: readonly ColumnaDeExtracto[] = [
  {
    campo: 'fecha',
    titulo: 'Fecha',
    ayuda: 'El día del movimiento.',
    sinonimos: [
      'fecha',
      'fecha de transaccion',
      'fecha transaccion',
      'fecha movimiento',
      'fecha de movimiento',
      'fecha valor',
      'fecha operacion',
      'fecha de operacion',
      'date',
      'dia',
    ],
  },
  {
    campo: 'valor',
    titulo: 'Valor',
    ayuda: 'Un solo valor con signo: positivo entra, negativo sale.',
    sinonimos: [
      'valor',
      'valor total',
      'monto',
      'importe',
      'valor cop',
      'amount',
      'valor transaccion',
      'valor movimiento',
      'total',
    ],
  },
  {
    campo: 'credito',
    titulo: 'Crédito',
    ayuda: 'Si el banco separa entradas y salidas: lo que entró.',
    sinonimos: ['credito', 'creditos', 'abono', 'abonos', 'entrada', 'entradas', 'ingreso', 'ingresos', 'haber', 'valor credito'],
  },
  {
    campo: 'debito',
    titulo: 'Débito',
    ayuda: 'Si el banco separa entradas y salidas: lo que salió.',
    sinonimos: ['debito', 'debitos', 'cargo', 'cargos', 'salida', 'salidas', 'egreso', 'egresos', 'debe', 'valor debito'],
  },
  {
    campo: 'descripcion',
    titulo: 'Descripción',
    ayuda: 'El texto del banco: ahí aparece el nombre de quien pagó.',
    sinonimos: [
      'descripcion',
      'detalle',
      'concepto',
      'transaccion',
      'descripcion transaccion',
      'descripcion de la transaccion',
      'observacion',
      'observaciones',
      'detalle transaccion',
      'tipo de transaccion',
    ],
  },
  {
    campo: 'referencia',
    titulo: 'Referencia',
    ayuda: 'Lo que escribió quien pagó (Bancolombia: «Referencia 1»). Ahí suele venir el apartamento, el nombre o la cédula.',
    sinonimos: [
      'referencia 1',
      'referencia',
      'ref 1',
      'ref',
      'numero de referencia',
      'referencia de pago',
      'concepto de pago',
      'codigo',
    ],
  },
  {
    campo: 'documento',
    titulo: 'Documento',
    ayuda: 'El documento del pagador o del comprobante, si viene aparte. Se suma a la descripción para el cruce.',
    sinonimos: [
      'documento',
      'numero de documento',
      'no documento',
      'no de documento',
      'nro documento',
      'num documento',
      'comprobante',
      'numero',
    ],
  },
  {
    campo: 'referencia2',
    titulo: 'Referencia 2',
    ayuda: 'Si el banco manda una segunda referencia. Se suma a la descripción para el cruce.',
    sinonimos: ['referencia 2', 'ref 2'],
  },
  {
    campo: 'canal',
    titulo: 'Sucursal / canal',
    ayuda: 'Por dónde entró (PSE, app, oficina). Sólo informativo.',
    sinonimos: ['sucursal canal', 'sucursal / canal', 'canal', 'sucursal', 'oficina'],
  },
];

/**
 * ¿En qué fila están los encabezados? Los extractos traen arriba el número de
 * cuenta y el rango («Movimientos del 01/09 al 30/09»); la tabla de verdad
 * empieza más abajo. Es la primera fila (entre las primeras 40) que nombra
 * una fecha y alguna forma de valor. `null` si ninguna sirve.
 */
export function detectarFilaDeEncabezado(filas: readonly (readonly string[])[]): number | null {
  for (let i = 0; i < Math.min(filas.length, 40); i++) {
    const celdas = filas[i].map((c) => String(c ?? ''));
    if (celdas.filter((c) => c.trim() !== '').length < 2) continue;
    const mapeo = mapearColumnasDeExtracto(celdas);
    if (mapeo.fecha && (mapeo.valor || mapeo.credito || mapeo.debito)) return i;
  }
  return null;
}

/** Campo → encabezado del archivo. */
export type MapeoDeExtracto = Partial<Record<CampoDeExtracto, string>>;

/**
 * Dos pasadas, como el resto de las importaciones: primero igualdad exacta
 * (no se equivoca), después contención ganando el alias más largo. Cada
 * encabezado y cada campo se usan UNA vez.
 */
export function mapearColumnasDeExtracto(encabezados: string[]): MapeoDeExtracto {
  const mapeo: MapeoDeExtracto = {};
  const usados = new Set<string>();
  const normalizados = encabezados.map((e) => normalizarEncabezado(e));

  for (const columna of COLUMNAS_DE_EXTRACTO) {
    const i = normalizados.findIndex((n, idx) => !usados.has(encabezados[idx]) && columna.sinonimos.includes(n));
    if (i !== -1) {
      mapeo[columna.campo] = encabezados[i];
      usados.add(encabezados[i]);
    }
  }

  for (const columna of COLUMNAS_DE_EXTRACTO) {
    if (mapeo[columna.campo]) continue;
    let mejor: { encabezado: string; largo: number } | null = null;
    normalizados.forEach((n, idx) => {
      if (!n || usados.has(encabezados[idx])) return;
      for (const alias of columna.sinonimos) {
        if (alias.length >= 4 && n.includes(alias) && (!mejor || alias.length > mejor.largo)) {
          mejor = { encabezado: encabezados[idx], largo: alias.length };
        }
      }
    });
    if (mejor) {
      const elegido = mejor as { encabezado: string; largo: number };
      mapeo[columna.campo] = elegido.encabezado;
      usados.add(elegido.encabezado);
    }
  }

  // Sin columna de referencia, el documento del comprobante hace de referencia:
  // es lo que la pantalla muestra en esa columna y lo que el back guarda aparte.
  if (!mapeo.referencia && mapeo.documento) {
    mapeo.referencia = mapeo.documento;
    delete mapeo.documento;
  }

  return mapeo;
}

/** Lo que falta para poder cargar: fecha, descripción y alguna forma de valor. */
export function faltantesDelMapeo(mapeo: MapeoDeExtracto): string[] {
  const faltan: string[] = [];
  if (!mapeo.fecha) faltan.push('Fecha');
  if (!mapeo.descripcion && !mapeo.referencia) faltan.push('Descripción');
  if (!mapeo.valor && !mapeo.credito && !mapeo.debito) faltan.push('Valor (o Crédito/Débito)');
  return faltan;
}

/**
 * «$ 1.230.000» → 1230000 · «1,230,000.00» → 1230000 · «-45.000» → -45000 ·
 * «(45.000)» → -45000 · «1.230.000,50» → 1230001 (se redondea al peso).
 * Devuelve `null` si no hay número.
 */
export function parsearValorCop(texto: unknown): number | null {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === 'number') return Number.isFinite(texto) ? Math.round(texto) : null;
  let s = String(texto).trim();
  if (!s) return null;

  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (/^-/.test(s) || /-\s*$/.test(s)) negativo = true;
  s = s.replace(/[^0-9.,]/g, '');
  if (!s || !/\d/.test(s)) return null;

  const tienePunto = s.includes('.');
  const tieneComa = s.includes(',');
  let entero: string;
  if (tienePunto && tieneComa) {
    const decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const miles = decimal === '.' ? ',' : '.';
    entero = s.split(miles).join('').replace(decimal, '.');
  } else if (tienePunto || tieneComa) {
    const sep = tienePunto ? '.' : ',';
    const partes = s.split(sep);
    if (partes.length > 2) {
      entero = partes.join('');
    } else {
      // Un solo separador: tres cifras detrás = miles (como escribe Colombia); si no, decimal.
      entero = partes[1].length === 3 ? partes.join('') : `${partes[0]}.${partes[1]}`;
    }
  } else {
    entero = s;
  }

  const n = Number.parseFloat(entero);
  if (!Number.isFinite(n)) return null;
  const redondeado = Math.round(n);
  return negativo ? -redondeado : redondeado;
}

const DIA_EXCEL_CERO = Date.UTC(1899, 11, 30);

function diaValido(a: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return fecha.toISOString().slice(0, 10);
}

/**
 * «2026-09-03», «03/09/2026», «3-9-26», «2026/09/03», una fecha de Excel
 * (número de días) o un `Date`. Devuelve `YYYY-MM-DD` o `null`.
 */
export function parsearFechaDeExtracto(texto: unknown): string | null {
  if (texto === null || texto === undefined) return null;
  if (texto instanceof Date) {
    return Number.isNaN(texto.getTime())
      ? null
      : diaValido(texto.getFullYear(), texto.getMonth() + 1, texto.getDate());
  }
  if (typeof texto === 'number') {
    if (!Number.isFinite(texto) || texto < 20000 || texto > 80000) return null;
    return new Date(DIA_EXCEL_CERO + Math.round(texto) * 86_400_000).toISOString().slice(0, 10);
  }
  const s = String(texto).trim();
  if (!s) return null;

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return diaValido(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return diaValido(anio, Number(m[2]), Number(m[1]));
  }
  return null;
}

export interface FilaDescartada {
  /** Número de fila como lo ve la persona en el archivo (1 = encabezado). */
  fila: number;
  motivo: string;
}

export interface FilasArmadas {
  filas: FilaDeExtracto[];
  descartadas: FilaDescartada[];
}

function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** Aplica el mapeo a las filas crudas. Lo que no se pueda leer se descarta CON motivo. */
export function armarFilasDeExtracto(
  crudas: readonly Record<string, unknown>[],
  mapeo: MapeoDeExtracto,
): FilasArmadas {
  const filas: FilaDeExtracto[] = [];
  const descartadas: FilaDescartada[] = [];

  crudas.forEach((cruda, i) => {
    const numero = i + 2;
    const fecha = mapeo.fecha ? parsearFechaDeExtracto(cruda[mapeo.fecha]) : null;
    if (!fecha) {
      descartadas.push({ fila: numero, motivo: `Fecha ilegible: «${texto(mapeo.fecha ? cruda[mapeo.fecha] : '')}».` });
      return;
    }

    let valor: number | null = null;
    if (mapeo.valor) {
      valor = parsearValorCop(cruda[mapeo.valor]);
    } else {
      const credito = mapeo.credito ? parsearValorCop(cruda[mapeo.credito]) : null;
      const debito = mapeo.debito ? parsearValorCop(cruda[mapeo.debito]) : null;
      if (credito !== null || debito !== null) {
        valor = Math.abs(credito ?? 0) - Math.abs(debito ?? 0);
      }
    }
    if (valor === null) {
      descartadas.push({ fila: numero, motivo: 'Valor ilegible.' });
      return;
    }
    if (valor === 0) {
      descartadas.push({ fila: numero, motivo: 'Valor en cero.' });
      return;
    }

    const referencia = mapeo.referencia ? texto(cruda[mapeo.referencia]).slice(0, 120) : '';
    // Lo que el banco manda en columnas aparte (documento del pagador,
    // segunda referencia, canal) se pega a la descripción: el cruce con los
    // cobros busca apellidos, cédulas y direcciones en ese texto, y una
    // cédula en la columna «Documento» vale tanto como en la descripción.
    const extras = (['documento', 'referencia2', 'canal'] as const)
      .map((k) => (mapeo[k] ? texto(cruda[mapeo[k]!]) : ''))
      .filter(Boolean);
    let descripcion = [mapeo.descripcion ? texto(cruda[mapeo.descripcion]) : '', ...extras]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 300);
    if (!descripcion) descripcion = referencia;
    if (!descripcion) {
      descartadas.push({ fila: numero, motivo: 'Sin descripción ni referencia.' });
      return;
    }

    filas.push({
      fecha,
      valorCop: valor,
      descripcion,
      ...(referencia ? { referencia } : {}),
    });
  });

  return { filas, descartadas };
}
