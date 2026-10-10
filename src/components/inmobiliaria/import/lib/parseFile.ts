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

import { separarFilasDeTotales, type FilaDeTotales } from '@/lib/migracion/fila-de-totales';

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  sheetNames: string[];
  /**
   * Las filas de TOTALES del final del archivo (MIG-C, 04-10): ya NO están en
   * `rows` — no son datos — y quien muestra el archivo lo dice con
   * `fraseDeFilasDeTotales`.
   */
  filasDeTotales?: FilaDeTotales[];
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
    } else if (celda.t === 'n' && typeof celda.v === 'number' && Number.isFinite(celda.v)) {
      // El VALOR, no el texto formateado (QA-MIG-B, 04-10): con «#,##0» una
      // celda 48350750,50 se leía «48,350,751» — redondeada en silencio.
      celda.w = textoDelNumero(celda.v, celda.z);
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
 * El texto con el que viaja una celda NUMÉRICA (no fecha) de un Excel.
 *
 * `sheet_to_json({ raw: false })` entrega el texto FORMATEADO de la celda, y
 * el formato miente: «#,##0» redondea los centavos (48350750,50 →
 * «48,350,751») y «0.0» corta decimales. Acá sale el valor guardado, sin
 * separador de miles y con el punto decimal:
 *
 *  - los decimales se recortan a 10 para quitar el ruido binario de una
 *    fórmula (1575000.0000000002 → «1575000»);
 *  - exactamente 3 decimales se escriben con 4 («1234.567» → «1234.5670»):
 *    con 3, los lectores de plata leen el punto como de MILES y fabrican
 *    1.234.567 — con 4 la celda queda ilegible para ellos, nunca inventada;
 *  - un formato de porcentaje conserva el % sobre el valor ×100 (0,105 →
 *    «10.5%»): el valor guardado es 0,105 y nadie escribió una comisión de 0,1;
 *  - un formato de puros ceros («00000», el de los códigos con ceros a la
 *    izquierda) conserva el texto formateado: «007» es el código, no 7.
 */
function textoDelNumero(v: number, formato?: string): string {
  const z = typeof formato === 'string' ? formato : '';
  if (/^0+$/.test(z)) return String(v).padStart(z.length, '0');
  const limpio = (n: number): string => {
    if (Number.isInteger(n)) return String(n);
    /*
     * T-0158: `toFixed(10)` imprime la expansión binaria EXACTA: un canon de 7
     * cifras (1227294.12) salía «1227294.1200000001» y el lector de plata lo
     * rechazaba (más de dos decimales) — el contrato llegaba sin canon y sin
     * aviso. Un double sólo garantiza ~15 cifras significativas: se recorta
     * ahí y se usa la representación más corta. `toFixed(10)` queda para lo
     * que `toString` escribe en notación científica (números diminutos).
     */
    const corto = Number(n.toPrecision(15)).toString();
    let t = /e/i.test(corto) ? n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '') : corto;
    const decimales = t.includes('.') ? t.split('.')[1].length : 0;
    if (decimales === 3) t += '0';
    return t;
  };
  if (z.includes('%')) return `${limpio(Number((v * 100).toFixed(10)))}%`;
  if (Math.abs(v) >= 1e21) return String(v);
  return limpio(v);
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

/** El número de la fila en la hoja (base 0) que SheetJS deja en `__rowNum__`. */
function numeroDeFilaEnLaHoja(row: Record<string, unknown>, porDefecto: number): number {
  const n = (row as { __rowNum__?: unknown }).__rowNum__;
  return typeof n === 'number' && Number.isFinite(n) ? n : porDefecto;
}

export interface ParseOptions {
  /**
   * Fila (0-based) donde están los encabezados. Por defecto la primera. Los
   * extractos bancarios traen arriba el número de cuenta y el rango de fechas:
   * el encabezado real puede estar en la fila 3 o 4. Ver
   * `detectarFilaDeEncabezado` en `@/lib/cobros/extracto-bancario`.
   */
  filaDeEncabezado?: number;
}

/**
 * Las primeras `n` filas de la planilla, como matrices de celdas (texto), sin
 * asumir cuál es el encabezado. Para buscar dónde empieza la tabla de verdad.
 */
export async function leerPrimerasFilas(file: File, n = 40): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const libro = await leerLibro(XLSX, file);
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) return [];
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: false, defval: '' });
  return filas.slice(0, n).map((f) => f.map((c) => (c === null || c === undefined ? '' : String(c))));
}

/**
 * Las primeras `n` filas de CADA hoja, como matrices de texto. Para elegir
 * dónde está la tabla de verdad cuando el libro trae portada, instrucciones o
 * resumen antes (QA-MIG-A, MG-02: el paso de propietarios leía la hoja
 * «Instrucciones» y creaba a un propietario llamado «No modificar.»).
 */
export async function leerPrimerasFilasDeCadaHoja(
  file: File,
  n = 15,
): Promise<Array<{ hoja: string; filas: string[][] }>> {
  const XLSX = await import('xlsx');
  const libro = await leerLibro(XLSX, file);
  return libro.SheetNames.map((hoja) => {
    const ws = libro.Sheets[hoja];
    if (!ws) return { hoja, filas: [] };
    const filas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
    return {
      hoja,
      filas: filas.slice(0, n).map((f) => f.map((c) => (c === null || c === undefined ? '' : String(c)))),
    };
  });
}

async function leerLibro(XLSX: typeof import('xlsx'), file: File): Promise<import('xlsx').WorkBook> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const esTexto = EXTENSIONES_DE_TEXTO.includes(ext);
  const buffer = await file.arrayBuffer();
  if (!esTexto && ext !== 'fods') {
    const b = new Uint8Array(buffer.slice(0, 4));
    const esZip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
    const esCfb = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
    if (!esZip && !esCfb) {
      throw new Error(
        `No se pudo leer «${file.name}»: el archivo está dañado o no es una planilla de Excel. ` +
          `Expórtalo de nuevo desde tu sistema (Excel o CSV) y vuelve a subirlo.`,
      );
    }
  }
  try {
    return esTexto
      ? XLSX.read(decodificarTexto(buffer), { type: 'string' })
      : XLSX.read(
          buffer,
          ext === 'xls'
            ? { type: 'array', codepage: 1252, cellNF: true }
            : { type: 'array', cellNF: true },
        );
  } catch (e) {
    throw new Error(
      `No se pudo leer «${file.name}»: el archivo está dañado o no es una planilla. ` +
        `Expórtalo de nuevo desde tu sistema (Excel o CSV) y vuelve a subirlo.`,
      { cause: e },
    );
  }
}

export async function parseSpreadsheetFile(
  file: File,
  sheetName?: string,
  opciones: ParseOptions = {},
): Promise<ParseResult> {
  const XLSX = await import('xlsx');
  const filaDeEncabezado = opciones.filaDeEncabezado ?? 0;

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const esTexto = EXTENSIONES_DE_TEXTO.includes(ext);
  const workbook = await leerLibro(XLSX, file);

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
        range: filaDeEncabezado,
      })[0] ?? [])
    : [];

  // Convert sheet to JSON — defval ensures empty cells produce '' instead of undefined
  const rawData = worksheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: false,
        range: filaDeEncabezado,
      })
    : [];

  // Un binario que no produjo ni una columna no es una planilla vacía: es un
  // archivo que no se pudo leer. Decirlo es mejor que devolver 0 filas y que
  // la persona crea que su archivo «no tenía nada».
  if (!esTexto && filaDeEncabezados.length === 0 && rawData.length === 0) {
    throw new Error(
      `No se pudo leer «${file.name}»: el archivo está dañado, protegido o vacío. ` +
        `Expórtalo de nuevo desde tu sistema y vuelve a subirlo.`,
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

  // Se botan las filas vacías y cada fila lleva su número EN LA HOJA
  // (`__rowNum__` de SheetJS, base 0: el encabezado en A1 deja la primera fila
  // de datos en 1, y quien muestra «fila N» suma 1 — la que ve en Excel).
  // Renumerar DESPUÉS de botar las vacías corría todos los números que la
  // persona ve a partir de la primera fila en blanco (QA-MIG-B, 04-10).
  const rows: ParsedRow[] = rawData
    .map((row, index) => ({ row, numero: numeroDeFilaEnLaHoja(row, index + 1 + filaDeEncabezado) }))
    .filter(({ row }) => Object.values(row).some((v) => v !== '' && v !== null && v !== undefined))
    .map(({ row, numero }) => {
      const limpia: ParsedRow = { _rowIndex: numero };
      for (const [clave, valor] of Object.entries(row)) {
        limpia[encabezadosLimpios.get(clave) ?? clave] = valor;
      }
      return limpia;
    });

  const { filas: datos, totales } = separarFilasDeTotales(rows);
  return { rows: datos, headers, sheetNames, filasDeTotales: totales };
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
    'Video',
    'Fotos',
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
    'https://www.instagram.com/reel/…',
    'https://drive.google.com/file/d/…/view, https://drive.google.com/file/d/…/view',
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
