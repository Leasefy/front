/**
 * 🔴 EL RECAUDO DESDE UNA PLANILLA (Nico, 20-10-2026): «¿por qué sólo deja
 * archivo texto? Hagamos también aquí un parser que reciba de todo, ¡debemos ser
 * poderosos!». Un Excel o un CSV se lee con el MISMO lector de la cartera
 * (`lib/importar`): la hoja y la fila de títulos que más campos nombran, y cada
 * columna reconocida por su título y por sus valores. La persona ve lo que se
 * tomó y lo puede cambiar; al back viajan las filas (ver `leerFilasDeLaPlanilla`).
 */
import type { ParsedRow } from '@/components/inmobiliaria/import/lib/importTypes';
import type { CampoReconocible, Mapeo } from '@/lib/importar/reconocer-columnas';
import { textoDeLaCelda } from '@/lib/importar/reconocer-columnas';
import { parsearFechaDeExtracto, parsearValorCop } from '@/lib/cobros/extracto-bancario';
import type { FilaDePlanillaDelRecaudo } from '@/lib/api/tesoreria.types';

export type CampoDelRecaudo = 'referencia' | 'valor' | 'fecha' | 'secuencia' | 'oficina' | 'pagador';

export const CAMPOS_DEL_RECAUDO: readonly CampoReconocible<CampoDelRecaudo>[] = [
  {
    campo: 'referencia',
    etiqueta: 'Referencia o cédula',
    sinonimos: ['referencia', 'referencia de pago', 'referencia 1', 'cedula', 'documento', 'identificacion', 'nit', 'numero de identificacion', 'codigo de pago'],
    palabras: ['referencia', 'cedula', 'documento', 'identificacion', 'nit', 'ref'],
    evitar: ['nombre', 'fecha', 'valor'],
    tipo: 'documento',
    requerido: true,
  },
  {
    campo: 'valor',
    etiqueta: 'Valor pagado',
    sinonimos: ['valor', 'valor pagado', 'valor recaudado', 'monto', 'importe', 'total', 'valor neto', 'vlr'],
    palabras: ['valor', 'monto', 'importe', 'pagado', 'recaudado', 'vlr'],
    evitar: ['fecha', 'referencia'],
    tipo: 'plata',
    requerido: true,
  },
  {
    campo: 'fecha',
    etiqueta: 'Fecha del pago',
    sinonimos: ['fecha', 'fecha de pago', 'fecha pago', 'fecha recaudo', 'fecha de recaudo', 'fecha transaccion'],
    palabras: ['fecha'],
    tipo: 'fecha',
  },
  {
    campo: 'secuencia',
    etiqueta: 'Número de transacción',
    sinonimos: ['secuencia', 'consecutivo', 'numero de transaccion', 'transaccion', 'comprobante', 'numero de operacion', 'autorizacion'],
    palabras: ['secuencia', 'consecutivo', 'transaccion', 'comprobante', 'operacion', 'autorizacion'],
    evitar: ['fecha', 'valor'],
    tipo: 'codigo',
  },
  {
    campo: 'oficina',
    etiqueta: 'Oficina',
    sinonimos: ['oficina', 'sucursal', 'canal', 'punto de pago'],
    palabras: ['oficina', 'sucursal', 'canal'],
    tipo: 'texto',
  },
  {
    campo: 'pagador',
    etiqueta: 'Nombre del pagador',
    sinonimos: ['nombre', 'pagador', 'nombre del pagador', 'cliente', 'razon social'],
    palabras: ['nombre', 'pagador', 'cliente'],
    evitar: ['fecha', 'valor'],
    tipo: 'nombre',
  },
];

/** Las extensiones que se leen como planilla y no con el formato del convenio. */
export function esPlanilla(nombre: string, convenioDelimitado: boolean): boolean {
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) return true;
  return ext === 'csv' && !convenioDelimitado;
}

export interface FilasDeLaPlanilla {
  filas: FilaDePlanillaDelRecaudo[];
  /** Filas que no se pudieron armar (sin valor o sin referencia), con su número. */
  sinArmar: { linea: number; motivo: string }[];
}

export function armarFilasDelRecaudo(
  filas: readonly ParsedRow[],
  mapeo: Mapeo<CampoDelRecaudo>,
  filaDeEncabezado: number | null,
): FilasDeLaPlanilla {
  const salida: FilaDePlanillaDelRecaudo[] = [];
  const sinArmar: FilasDeLaPlanilla['sinArmar'] = [];
  const celda = (f: ParsedRow, c: CampoDelRecaudo) => (mapeo[c] ? f[mapeo[c] as string] : undefined);
  filas.forEach((f, i) => {
    // La fila como la ve la persona en Excel (1-based, contando el encabezado).
    const linea = typeof f._rowIndex === 'number' ? f._rowIndex + 1 : (filaDeEncabezado ?? 0) + i + 2;
    const referencia = textoDeLaCelda(celda(f, 'referencia')).trim();
    const valor = parsearValorCop(celda(f, 'valor'));
    if (!referencia && valor === null) return; // fila vacía
    if (!referencia) {
      sinArmar.push({ linea, motivo: 'No trae referencia ni cédula.' });
      return;
    }
    if (valor === null) {
      sinArmar.push({ linea, motivo: 'No trae un valor que se pueda leer.' });
      return;
    }
    const fecha = mapeo.fecha ? parsearFechaDeExtracto(celda(f, 'fecha')) : null;
    const texto = (c: CampoDelRecaudo) => textoDeLaCelda(celda(f, c)).trim().slice(0, c === 'pagador' ? 160 : 40) || null;
    salida.push({
      linea,
      referencia: referencia.slice(0, 120),
      valorCop: valor,
      fecha,
      secuencia: texto('secuencia'),
      oficina: texto('oficina'),
      pagador: texto('pagador'),
    });
  });
  return { filas: salida, sinArmar };
}
