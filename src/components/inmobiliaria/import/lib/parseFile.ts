// src/components/inmobiliaria/import/lib/parseFile.ts
// Lectura de planillas en el cliente con SheetJS: xlsx, xls, csv, tsv, txt,
// ods y fods. Por acá entra TODO lo que sube una inmobiliaria en la migración.
//
// Garantías (fijadas en parseFile.test.ts y parseFile.robustez.test.ts):
//  1. Codificación detectada (UTF-8 con/sin BOM, Windows-1252) y separador
//     detectado (`,`, `;`, tab): los acentos llegan intactos sin configurar nada.
//  2. Una celda-FECHA real de Excel sale SIEMPRE como ISO `YYYY-MM-DD`, nunca
//     como el texto ambiguo del formato («6/1/26»); una fecha escrita como
//     texto se respeta tal cual. Un número sin formato de fecha no se toca.
//  3. Encabezados limpios (espacios y saltos de línea colapsados) y sin
//     repetidos (el duplicado queda como «X (2)»); un archivo de sólo
//     encabezados conserva sus columnas.
//  4. Un binario dañado o renombrado FALLA con un error claro (firma ZIP/CFB
//     verificada): nunca devuelve basura con cara de planilla.
//  5. Las filas vacías se descartan; fórmulas entregan su resultado; celdas
//     combinadas no duplican el valor; se lee la primera hoja (o la pedida).

import type { ParsedRow } from './importTypes';

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  sheetNames: string[];
}

/**
 * Formatos que llegan como TEXTO plano. SheetJS adivina el separador solo, así
 * que `;` —lo que exporta Excel en español—, tab y coma funcionan sin
 * configurar nada. Verificado con los tres.
 */
const EXTENSIONES_DE_TEXTO = ['csv', 'txt', 'tsv'];

/**
 * Decodifica un archivo de texto AVERIGUANDO su codificación, en vez de
 * asumirla.
 *
 * Antes era `await file.text()` —UTF-8 a ciegas— con el comentario «para
 * preservar los acentos». Hace justo lo contrario con el archivo más común
 * acá: Excel en español exporta CSV en **Windows-1252**, y leído como UTF-8
 * «Bogotá» queda `Bogot?`. Eso entraba tal cual al inmueble, sin un error.
 *
 * UTF-8 es autoverificable: una secuencia inválida no es UTF-8. Probamos en
 * estricto y, si el archivo no lo es, cae a Windows-1252 — que acepta
 * cualquier byte, por eso va último y nunca al revés.
 */
function decodificarTexto(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // BOM UTF-8: el archivo declara su codificación, no hay nada que adivinar.
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * Lee la planilla que sea. Import dinámico para que xlsx no entre al chunk
 * principal.
 */
/**
 * Una celda-fecha REAL de Excel (número con formato de fecha) se convierte a
 * ISO `YYYY-MM-DD` ANTES de leer la hoja.
 *
 * Sin esto, `sheet_to_json({ raw: false })` devuelve el texto formateado de la
 * celda: con el formato por defecto de Excel, «6/1/26» — ¿1 de junio o 6 de
 * enero? Esa ambigüedad viajaba hasta el contrato o el asiento sin un error.
 * La conversión sale de `SSF.parse_date_code` (el serial → {y,m,d}), que no
 * pasa por `Date` ni por la zona horaria. Una fecha escrita como TEXTO no se
 * toca: el parser respeta lo que la persona escribió.
 */
function normalizarCeldasDeFecha(
  XLSX: typeof import('xlsx'),
  worksheet: import('xlsx').WorkSheet,
): void {
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  for (const direccion of Object.keys(worksheet)) {
    if (direccion.startsWith('!')) continue;
    const celda = worksheet[direccion] as import('xlsx').CellObject & { z?: string };
    if (!celda || typeof celda !== 'object') continue;

    if (celda.t === 'n' && typeof celda.z === 'string' && XLSX.SSF.is_date(celda.z)) {
      const f = XLSX.SSF.parse_date_code(celda.v as number);
      if (!f) continue;
      const iso = `${f.y}-${dosDigitos(f.m)}-${dosDigitos(f.d)}`;
      worksheet[direccion] = { t: 's', v: iso, w: iso };
    } else if (celda.t === 'd' && celda.v instanceof Date) {
      // Celda ya materializada como Date. Hay dos orígenes y cada uno pone la
      // medianoche en un reloj distinto: SheetJS materializa serials en UTC
      // (medianoche UTC) y una app local crea la fecha a medianoche LOCAL.
      // Se lee con el reloj donde la hora sea 00:00 — la fecha del calendario
      // es la que la persona vio, no la que da correr el huso.
      const v = celda.v;
      const esMedianocheUtc =
        v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0;
      const iso = esMedianocheUtc
        ? `${v.getUTCFullYear()}-${dosDigitos(v.getUTCMonth() + 1)}-${dosDigitos(v.getUTCDate())}`
        : `${v.getFullYear()}-${dosDigitos(v.getMonth() + 1)}-${dosDigitos(v.getDate())}`;
      worksheet[direccion] = { t: 's', v: iso, w: iso };
    }
  }
}

/**
 * Limpia un encabezado como lo escribió Excel: espacios alrededor, dobles
 * espacios y saltos de línea adentro de la celda. «  Nombre  » y
 * «Nombre del\npropietario» tienen que mapear igual que sus versiones limpias
 * — si no, el mapeo automático de columnas no las reconoce y la persona no ve
 * por qué.
 */
function limpiarEncabezado(bruto: unknown): string {
  return String(bruto ?? '').replace(/\s+/g, ' ').trim();
}

export async function parseSpreadsheetFile(
  file: File,
  sheetName?: string
): Promise<ParseResult> {
  const XLSX = await import('xlsx');

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const esTexto = EXTENSIONES_DE_TEXTO.includes(ext);
  const buffer = await file.arrayBuffer();

  // Los binarios (xlsx/xls/ods) traen su codificación adentro; los de texto
  // no, y por eso hay que deducirla. El `codepage` sólo aplica a los .xls
  // viejos (BIFF): Excel en español los escribe en Windows-1252.
  // Un binario tiene firma: xlsx y ods son ZIP (PK\x03\x04), xls es CFB
  // (D0 CF 11 E0). Un archivo dañado o renombrado no la tiene, y SheetJS, en
  // vez de fallar, lo lee «como pueda» y devuelve basura con cara de planilla.
  if (!esTexto && ext !== 'fods') {
    const b = new Uint8Array(buffer.slice(0, 4));
    const esZip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
    const esCfb = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
    if (!esZip && !esCfb) {
      throw new Error(
        `No se pudo leer «${file.name}»: el archivo está dañado o no es una planilla de Excel. ` +
          `Exportalo de nuevo desde tu sistema (Excel o CSV) y volvé a subirlo.`,
      );
    }
  }

  let workbook: import('xlsx').WorkBook;
  try {
    workbook = esTexto
      ? XLSX.read(decodificarTexto(buffer), { type: 'string' })
      : XLSX.read(
          buffer,
          // `cellNF` trae el formato de cada celda (`cell.z`): sin él no se
          // puede saber si un número ES una fecha, y la conversión a ISO de
          // abajo no tendría con qué decidir.
          ext === 'xls'
            ? { type: 'array', codepage: 1252, cellNF: true }
            : { type: 'array', cellNF: true },
        );
  } catch (e) {
    throw new Error(
      `No se pudo leer «${file.name}»: el archivo está dañado o no es una planilla. ` +
        `Exportalo de nuevo desde tu sistema (Excel o CSV) y volvé a subirlo.`,
      { cause: e },
    );
  }

  const sheetNames = workbook.SheetNames;
  const targetSheet = sheetName && sheetNames.includes(sheetName)
    ? sheetName
    : sheetNames[0];

  const worksheet = workbook.Sheets[targetSheet];

  if (!esTexto && worksheet) normalizarCeldasDeFecha(XLSX, worksheet);

  // La fila de encabezados se lee APARTE de las filas de datos: un archivo de
  // sólo encabezados también tiene columnas que mostrar.
  const filaDeEncabezados = worksheet
    ? (XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: false,
        range: 0,
      })[0] ?? [])
    : [];

  // Convert sheet to JSON — defval ensures empty cells produce '' instead of undefined
  const rawData = worksheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: false,
      })
    : [];

  // Un binario que no produjo ni una columna no es una planilla vacía: es un
  // archivo que no se pudo leer. Decirlo es mejor que devolver 0 filas y que
  // la persona crea que su archivo «no tenía nada».
  if (!esTexto && filaDeEncabezados.length === 0 && rawData.length === 0) {
    throw new Error(
      `No se pudo leer «${file.name}»: el archivo está dañado, protegido o vacío. ` +
        `Exportalo de nuevo desde tu sistema y volvé a subirlo.`,
    );
  }

  // Encabezados limpios y sin repetidos: a un duplicado se le agrega (2), (3)…
  const vistos = new Map<string, number>();
  const encabezadosLimpios = new Map<string, string>();
  const claves = rawData.length > 0 ? Object.keys(rawData[0]) : filaDeEncabezados.map(String);
  for (const clave of claves) {
    // `sheet_to_json` renombra el duplicado exacto a `X_1`; acá se limpia el
    // texto y se resuelve el duplicado que aparece DESPUÉS de limpiar.
    let limpio = limpiarEncabezado(clave.replace(/_(\d+)$/, ' ($1)'));
    if (limpio === '') limpio = clave === '' ? '(sin nombre)' : String(clave);
    const repetidas = vistos.get(limpio) ?? 0;
    vistos.set(limpio, repetidas + 1);
    encabezadosLimpios.set(clave, repetidas === 0 ? limpio : `${limpio} (${repetidas + 1})`);
  }
  const headers = claves.map((c) => encabezadosLimpios.get(c) ?? c);

  // Filter out empty rows and add _rowIndex (1-based)
  const rows: ParsedRow[] = rawData
    .filter((row) => Object.values(row).some((v) => v !== '' && v !== null && v !== undefined))
    .map((row, index) => {
      const limpia: ParsedRow = { _rowIndex: index + 1 };
      for (const [clave, valor] of Object.entries(row)) {
        limpia[encabezadosLimpios.get(clave) ?? clave] = valor;
      }
      return limpia;
    });

  return { rows, headers, sheetNames };
}

/**
 * Baja la plantilla .xlsx con los encabezados que esperamos.
 *
 * ⚠️ NO usar `XLSX.writeFile()` acá. Esa función es de Node: escribe con `fs`.
 * Importada como módulo en el navegador **no tira ningún error y tampoco baja
 * nada** — el clic se sentía muerto, sin consola, sin toast, sin archivo. Fue
 * exactamente así como llegó reportada.
 *
 * En el navegador hay que armar los bytes con `XLSX.write({type:'array'})` y
 * disparar la descarga a mano con un Blob y un <a download>.
 */
export async function downloadTemplate(): Promise<void> {
  const XLSX = await import('xlsx');

  // T-0038 §3.8 — Departamento/Tipo de Negocio/Precio de Venta/Fecha de
  // Consignación added. Headers are positionally aligned with exampleRow —
  // '!cols' below derives its width array from `headers.length`.
  const headers = [
    'Título',
    'Dirección',
    'Ciudad',
    'Barrio',
    'Departamento',
    'Tipo Inmueble',
    'Tipo de Negocio',
    'Canon Mensual',
    'Precio de Venta',
    'Administración',
    'Comisión %',
    'Área m2',
    'Habitaciones',
    'Baños',
    'Propietario',
    'Tel Propietario',
    'Estado',
    'Observaciones',
    'Fecha de Consignación',
  ];

  // Create a worksheet with a header row and two example rows
  const exampleRow = [
    'Apartamento El Prado',
    'Calle 123 # 45-67',
    'Bogotá',
    'El Prado',
    'Cundinamarca',
    'Apartamento',
    'Arriendo',
    '2500000',
    '',
    '350000',
    '10',
    '85',
    '3',
    '2',
    'Juan Pérez',
    '3101234567',
    'Disponible',
    'Parqueadero incluido',
    '',
  ];

  const worksheetData = [headers, exampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Style the header row width
  worksheet['!cols'] = headers.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Propiedades');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  descargar(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'plantilla-leasefy.xlsx',
  );
}

/** Dispara la descarga de un Blob con el nombre pedido. */
function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revocar en el siguiente tick: hacerlo de inmediato cancela la descarga en
  // algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
