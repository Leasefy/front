/**
 * columnas-de-documento — leer el export de comprobantes contables.
 *
 * ── Qué es este archivo y qué NO es ─────────────────────────────────────────
 *
 * «Accounting Documents.csv» trae 116.469 filas con este encabezado:
 *
 *   Prefijo;Consecutivo;Tipo Doc.;Fecha;Concepto;Débitos;Créditos;Balance;
 *   Descuadrado;Anulado;¿Es anticipo?;Nombre Tercero Anticipo;
 *   ¿anticipo aplicado?;Valor Restante del Anticipo;Creado por;Fecha creación
 *
 * 🔴 Son ENCABEZADOS de comprobante: prefijo, consecutivo, fecha, concepto y
 * los TOTALES de débitos y créditos. **No traen las líneas por cuenta.** Un
 * asiento sin líneas no se puede imputar ni cuadrar, así que esto NO entra al
 * libro diario: entra como documento contable migrado y se le cuelga al
 * contrato del tercero que nombra el concepto. Decírselo a la persona antes de
 * que suba el archivo es la mitad del trabajo — el otro camino, «Subir el
 * libro diario», sí espera cuenta y débito/crédito por línea, y confundirlos
 * es cargar 116 mil asientos descuadrados.
 *
 * ── Qué se interpreta acá y qué no ──────────────────────────────────────────
 *
 * Casi nada. `DocumentoMigradoDto` recibe los montos y las banderas como
 * `unknown` a propósito: la transformación tolerante vive en el back
 * (`documentos-migrados.normalizadores.ts`) porque ahí queda junto al texto
 * original, y con él puede decir «el monto "1.2.3" no se pudo leer» en vez de
 * poner un cero — que en plata es mentir. Acá sólo se recortan las celdas que
 * romperían un `@MaxLength` (un 400 al lote entero) y se saltan las filas
 * completamente vacías.
 */

import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service';
import type { DocumentoMigrado } from '@/lib/api/contabilidad.service';
import type { MapeoDeColumna } from './columnas-de-tercero';

export type CampoDeDocumento =
  | 'prefijo'
  | 'consecutivo'
  | 'tipo'
  | 'fecha'
  | 'concepto'
  | 'debitos'
  | 'creditos'
  | 'balance'
  | 'descuadrado'
  | 'anulado'
  | 'esAnticipo'
  | 'terceroAnticipo'
  | 'anticipoAplicado'
  | 'valorRestanteAnticipo'
  | 'creadoPor'
  | 'fechaCreacionOrigen';

export const COLUMNAS_DE_DOCUMENTO: readonly (ColumnaDePlantilla & {
  campo: CampoDeDocumento;
})[] = [
  {
    campo: 'prefijo',
    titulo: 'Prefijo',
    obligatoria: true,
    ejemplo: 'CE',
    alias: ['prefijo', 'serie', 'prefijo documento', 'prefix'],
    ayuda: 'CE, CI, FAC… Junto con el consecutivo identifica el comprobante.',
  },
  {
    campo: 'consecutivo',
    titulo: 'Consecutivo',
    obligatoria: true,
    ejemplo: '26,766',
    alias: ['consecutivo', 'numero', 'numero documento', 'nro', 'no documento', 'numero comprobante'],
    ayuda: 'El número del comprobante. Con separador de miles también se entiende.',
  },
  {
    campo: 'tipo',
    titulo: 'Tipo de documento',
    obligatoria: false,
    ejemplo: 'Comprobante de Egreso',
    alias: ['tipo doc', 'tipo documento', 'tipo de documento', 'tipo', 'clase de documento'],
  },
  {
    campo: 'fecha',
    titulo: 'Fecha',
    obligatoria: true,
    ejemplo: '2026-09-08',
    alias: ['fecha', 'fecha documento', 'fecha del documento', 'fecha contable'],
  },
  {
    campo: 'concepto',
    titulo: 'Concepto',
    obligatoria: false,
    ejemplo: 'INGRESO - NOMBRE CANON SEPTIEMBRE REF 901780503',
    alias: ['concepto', 'detalle', 'descripcion', 'observaciones', 'nota'],
    ayuda: 'De acá sale a qué contrato se cuelga el comprobante: el REF o el nombre del tercero.',
  },
  {
    campo: 'debitos',
    titulo: 'Débitos',
    obligatoria: false,
    ejemplo: '$5,561,832.00',
    alias: ['debitos', 'debito', 'debe', 'total debitos', 'valor debito'],
  },
  {
    campo: 'creditos',
    titulo: 'Créditos',
    obligatoria: false,
    ejemplo: '$5,561,832.00',
    alias: ['creditos', 'credito', 'haber', 'total creditos', 'valor credito'],
  },
  {
    campo: 'balance',
    titulo: 'Balance',
    obligatoria: false,
    ejemplo: '$0.00',
    alias: ['balance', 'saldo', 'diferencia'],
  },
  {
    campo: 'descuadrado',
    titulo: 'Descuadrado',
    obligatoria: false,
    ejemplo: 'NO',
    alias: ['descuadrado', 'descuadre', 'esta descuadrado'],
  },
  {
    campo: 'anulado',
    titulo: 'Anulado',
    obligatoria: false,
    ejemplo: 'NO',
    alias: ['anulado', 'anulada', 'esta anulado', 'estado anulado'],
  },
  {
    campo: 'esAnticipo',
    titulo: '¿Es anticipo?',
    obligatoria: false,
    ejemplo: 'NO',
    alias: ['es anticipo', 'anticipo', 'es un anticipo'],
  },
  {
    campo: 'terceroAnticipo',
    titulo: 'Tercero del anticipo',
    obligatoria: false,
    ejemplo: '',
    alias: ['nombre tercero anticipo', 'tercero anticipo', 'tercero del anticipo'],
  },
  {
    campo: 'anticipoAplicado',
    titulo: '¿Anticipo aplicado?',
    obligatoria: false,
    ejemplo: 'NO',
    alias: ['anticipo aplicado', 'aplicado'],
  },
  {
    campo: 'valorRestanteAnticipo',
    titulo: 'Valor restante del anticipo',
    obligatoria: false,
    ejemplo: '$0.00',
    alias: ['valor restante del anticipo', 'valor restante anticipo', 'restante anticipo', 'saldo anticipo'],
  },
  {
    campo: 'creadoPor',
    titulo: 'Creado por',
    obligatoria: false,
    ejemplo: '',
    alias: ['creado por', 'creada por', 'usuario', 'registrado por'],
  },
  {
    campo: 'fechaCreacionOrigen',
    titulo: 'Fecha de creación',
    obligatoria: false,
    ejemplo: '2026-09-08 10:39:01',
    alias: ['fecha creacion', 'fecha de creacion', 'creado el', 'fecha registro'],
  },
];

/**
 * Los `@MaxLength` de `DocumentoMigradoDto`. Una celda más larga tumba el LOTE
 * entero con 400; se recorta acá para que llegue y sea el back el que la marque
 * fila por fila.
 */
const LIMITES_DTO: Partial<Record<CampoDeDocumento, number>> = {
  prefijo: 60,
  tipo: 200,
  fecha: 40,
  concepto: 4000,
  terceroAnticipo: 500,
  creadoPor: 400,
  fechaCreacionOrigen: 40,
};

function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return '';
  return String(v).trim();
}

/** Las claves que el DTO del back declara. Nada más puede viajar. */
const CLAVES_CRUDAS: CampoDeDocumento[] = [
  'consecutivo',
  'debitos',
  'creditos',
  'balance',
  'descuadrado',
  'anulado',
  'esAnticipo',
  'anticipoAplicado',
  'valorRestanteAnticipo',
];

/**
 * Filas del archivo → comprobantes para revisar o migrar.
 *
 * Los campos de texto se recortan al `@MaxLength` del DTO; los montos y las
 * banderas viajan tal cual (`unknown` en el DTO): el back los normaliza y
 * puede decir qué no entendió. Las filas totalmente vacías se saltan.
 */
export function armarDocumentos(
  filas: readonly Record<string, unknown>[],
  mapeo: readonly MapeoDeColumna[],
): DocumentoMigrado[] {
  const columnaDe = new Map<string, string>();
  for (const m of mapeo) if (m.campo) columnaDe.set(m.campo, m.columna);
  const leer = (fila: Record<string, unknown>, campo: CampoDeDocumento): unknown => {
    const col = columnaDe.get(campo);
    return col === undefined ? undefined : fila[col];
  };

  const documentos: DocumentoMigrado[] = [];
  for (const fila of filas) {
    const prefijo = texto(leer(fila, 'prefijo')).slice(0, LIMITES_DTO.prefijo);
    const fecha = texto(leer(fila, 'fecha')).slice(0, LIMITES_DTO.fecha);
    const consecutivoCrudo = leer(fila, 'consecutivo');

    // Una fila sin nada de lo que identifica el comprobante es la fila vacía
    // que Excel deja al final. No se manda: sería una fila rechazada en el
    // informe por un motivo que no le importa a nadie.
    if (!prefijo && !fecha && texto(consecutivoCrudo) === '') continue;

    const documento: DocumentoMigrado = { prefijo, fecha };

    for (const campo of CLAVES_CRUDAS) {
      const valor = leer(fila, campo);
      if (valor !== undefined && texto(valor) !== '') {
        (documento as unknown as Record<string, unknown>)[campo] = valor;
      }
    }
    for (const campo of ['tipo', 'concepto', 'terceroAnticipo', 'creadoPor', 'fechaCreacionOrigen'] as const) {
      const valor = texto(leer(fila, campo));
      if (valor) {
        (documento as unknown as Record<string, unknown>)[campo] = valor.slice(
          0,
          LIMITES_DTO[campo],
        );
      }
    }

    documentos.push(documento);
  }
  return documentos;
}
