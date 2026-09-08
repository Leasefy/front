/**
 * csv-en-trozos — leer un CSV grande sin congelar la pestaña.
 *
 * ── Por qué no alcanza con `parseSpreadsheetFile` ───────────────────────────
 *
 * El lector de planillas de la casa (SheetJS) es sincrónico y materializa el
 * libro entero en memoria. Con el archivo de comprobantes de la inmobiliaria
 * —116.469 filas, 23 MB— eso es la pestaña congelada varios segundos, sin
 * spinner ni forma de cancelar, y un pico de memoria que en un portátil
 * termina en «Aw, snap». Para los otros tres archivos de la migración (2.900,
 * 1.850 y 2.794 filas) sigue siendo la herramienta correcta y no se toca.
 *
 * Acá se lee el archivo por pedazos, se arman lotes de filas y entre lote y
 * lote se le devuelve el turno al navegador: la barra avanza, el botón de
 * cancelar responde y la memoria no guarda más que el lote en curso.
 *
 * ── Lo que un CSV de verdad trae ────────────────────────────────────────────
 *
 * 1. **BOM.** Excel en español lo pone. Sin sacarlo, la primera columna se
 *    llama «﻿Prefijo» y no mapea con nada.
 * 2. **Separador `;`.** Es lo que exporta Excel en español; el archivo real lo
 *    usa. Se detecta contando fuera de comillas, no se asume.
 * 3. **Comillas con saltos de línea adentro.** 852 de las 1.850 filas de
 *    contratos traen observaciones de dos y tres líneas. Partir por `\n` a
 *    secas corta esas filas por la mitad y corre TODAS las columnas de ahí en
 *    adelante — sin un solo error.
 * 4. **Comillas escapadas** (`""`) adentro de un campo entrecomillado.
 * 5. **Windows-1252.** Un CSV exportado de Excel viejo no es UTF-8, y leerlo
 *    como si lo fuera deja «Bogotá» en «Bogot?».
 */

/** Cuánto se lee del archivo por vuelta. */
const BYTES_POR_PEDAZO = 1 << 20; // 1 MB

/** Cuánto se prueba para adivinar la codificación. */
const BYTES_DE_SONDEO = 1 << 18; // 256 KB

export interface OpcionesDeLectura {
  /** Cuántas filas se juntan antes de entregar un lote. */
  tamanoDeLote?: number;
  /** Los encabezados, una sola vez, apenas se leen. */
  onEncabezados?: (encabezados: string[]) => void;
  /**
   * Cada lote de filas ya armadas. Si devuelve una promesa, se espera: así
   * el que consume puede mandar el lote al servidor antes de seguir leyendo.
   */
  onLote: (filas: Array<Record<string, string>>, leidasHastaAhora: number) => void | Promise<void>;
  /** Se consulta entre lotes. `true` corta la lectura y devuelve lo hecho. */
  cancelado?: () => boolean;
}

export interface ResultadoDeLectura {
  encabezados: string[];
  /** Filas de datos leídas (sin contar el encabezado). */
  filas: number;
  /** Con qué separador se leyó. Se muestra: es la causa más común de un mapeo raro. */
  separador: string;
  /** `true` si `cancelado()` cortó la lectura antes del final. */
  cancelado: boolean;
}

/**
 * ¿El archivo es UTF-8?
 *
 * UTF-8 es autoverificable: una secuencia inválida no es UTF-8. Se prueba en
 * estricto y, si falla, se cae a Windows-1252 —que acepta cualquier byte, por
 * eso va último y nunca al revés—. El `{ stream: true }` es lo que hace que un
 * carácter partido al final del sondeo no cuente como error.
 */
async function esUtf8(archivo: Blob): Promise<boolean> {
  const sonda = await archivo.slice(0, BYTES_DE_SONDEO).arrayBuffer();
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(sonda), { stream: true });
    return true;
  } catch {
    return false;
  }
}

/** Los separadores que se consideran, en orden de preferencia ante un empate. */
const SEPARADORES = [';', ',', '\t', '|'];

/**
 * Con qué separador está escrita esta línea: el que más veces aparece FUERA de
 * comillas. Contarlos adentro también es cómo «PORTOFINO S.A.S, BIC» convierte
 * un archivo de `;` en un archivo de comas.
 */
export function separadorDeLinea(linea: string): string {
  let dentro = false;
  const cuenta = new Map<string, number>(SEPARADORES.map((s) => [s, 0]));
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (dentro && linea[i + 1] === '"') i++;
      else dentro = !dentro;
      continue;
    }
    if (!dentro && cuenta.has(c)) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  let mejor = SEPARADORES[0];
  let mejorCuenta = 0;
  for (const s of SEPARADORES) {
    const n = cuenta.get(s) ?? 0;
    if (n > mejorCuenta) {
      mejorCuenta = n;
      mejor = s;
    }
  }
  return mejorCuenta > 0 ? mejor : ',';
}

/**
 * El estado del parser entre pedazo y pedazo. Vive afuera de la función que
 * consume caracteres porque un campo —o hasta una fila— puede quedar partido
 * entre dos lecturas de 1 MB.
 */
export interface EstadoDelParser {
  campo: string;
  fila: string[];
  dentroDeComillas: boolean;
  /** El carácter anterior fue una comilla de cierre dentro de un campo citado. */
  posibleEscape: boolean;
  /** El anterior fue `\r`: si sigue `\n`, es un solo fin de línea. */
  cierreCr: boolean;
}

export function estadoInicial(): EstadoDelParser {
  return { campo: '', fila: [], dentroDeComillas: false, posibleEscape: false, cierreCr: false };
}

/**
 * Consume un texto y devuelve las filas COMPLETAS que quedaron. Lo que está a
 * medias se queda en `estado` para el pedazo siguiente.
 */
export function consumir(texto: string, separador: string, estado: EstadoDelParser): string[][] {
  const filas: string[][] = [];

  const cerrarCampo = () => {
    estado.fila.push(estado.campo);
    estado.campo = '';
  };
  const cerrarFila = () => {
    cerrarCampo();
    filas.push(estado.fila);
    estado.fila = [];
  };

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (estado.posibleEscape) {
      estado.posibleEscape = false;
      if (c === '"') {
        // `""` adentro de un campo citado: una comilla literal.
        estado.campo += '"';
        continue;
      }
      estado.dentroDeComillas = false;
      // Cae abajo: este carácter se procesa como si estuviera fuera.
    }

    if (estado.dentroDeComillas) {
      if (c === '"') estado.posibleEscape = true;
      else estado.campo += c;
      continue;
    }

    if (estado.cierreCr) {
      estado.cierreCr = false;
      // `\r\n` es UN fin de línea: el `\r` ya cerró la fila.
      if (c === '\n') continue;
    }

    if (c === '"' && estado.campo === '') {
      estado.dentroDeComillas = true;
      continue;
    }
    if (c === separador) {
      cerrarCampo();
      continue;
    }
    if (c === '\n') {
      cerrarFila();
      continue;
    }
    if (c === '\r') {
      cerrarFila();
      estado.cierreCr = true;
      continue;
    }
    estado.campo += c;
  }

  return filas;
}

/**
 * Lo que quedó a medias al terminar el archivo, si es una fila de verdad.
 *
 * El último campo se cierra siempre que haya ALGO empezado —aunque esté
 * vacío—: un archivo que termina en «a;b;» tiene tres columnas, y perder la
 * tercera corre los datos de esa fila una casilla.
 */
export function ultimaFila(estado: EstadoDelParser): string[] | null {
  const hayAlgo =
    estado.fila.length > 0 || estado.campo !== '' || estado.dentroDeComillas || estado.posibleEscape;
  if (!hayAlgo) return null;
  estado.fila.push(estado.campo);
  estado.campo = '';
  estado.dentroDeComillas = false;
  estado.posibleEscape = false;
  const fila = estado.fila;
  estado.fila = [];
  return fila;
}

/** Un encabezado repetido queda como «X (2)»: el mismo criterio que `parseFile`. */
export function limpiarEncabezados(brutos: string[]): string[] {
  const vistos = new Map<string, number>();
  return brutos.map((bruto, i) => {
    let limpio = String(bruto ?? '').replace(/﻿/g, '').replace(/\s+/g, ' ').trim();
    if (limpio === '') limpio = `(columna ${i + 1})`;
    const repetidas = vistos.get(limpio) ?? 0;
    vistos.set(limpio, repetidas + 1);
    return repetidas === 0 ? limpio : `${limpio} (${repetidas + 1})`;
  });
}

/** Devuelve el turno al navegador: sin esto la barra de progreso no se pinta. */
function cederElTurno(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, 0));
}

/**
 * Lee el CSV entero, en lotes, sin bloquear la pestaña.
 *
 * Las filas llegan como `{ encabezado: valor }`, igual que las de
 * `parseSpreadsheetFile`, para que el mapeo de columnas sea el mismo.
 */
export async function leerCsvEnTrozos(
  archivo: Blob,
  opciones: OpcionesDeLectura,
): Promise<ResultadoDeLectura> {
  const tamanoDeLote = opciones.tamanoDeLote ?? 5_000;
  const codificacion = (await esUtf8(archivo)) ? 'utf-8' : 'windows-1252';
  const decodificador = new TextDecoder(codificacion);

  const estado = estadoInicial();
  let encabezados: string[] | null = null;
  let separador = ';';
  let lote: Array<Record<string, string>> = [];
  let leidas = 0;
  let cancelado = false;
  let primerPedazo = true;

  const entregarLote = async () => {
    if (lote.length === 0) return;
    const aEntregar = lote;
    lote = [];
    await opciones.onLote(aEntregar, leidas);
  };

  const agregar = (celdas: string[]) => {
    if (!encabezados) {
      encabezados = limpiarEncabezados(celdas);
      opciones.onEncabezados?.(encabezados);
      return;
    }
    // Una fila totalmente vacía es la que Excel deja al final del archivo.
    if (celdas.every((c) => c.trim() === '')) return;
    const fila: Record<string, string> = {};
    for (let i = 0; i < encabezados.length; i++) fila[encabezados[i]] = celdas[i] ?? '';
    lote.push(fila);
    leidas++;
  };

  for (let inicio = 0; inicio < archivo.size; inicio += BYTES_POR_PEDAZO) {
    if (opciones.cancelado?.()) {
      cancelado = true;
      break;
    }
    const bytes = await archivo.slice(inicio, inicio + BYTES_POR_PEDAZO).arrayBuffer();
    const esElUltimo = inicio + BYTES_POR_PEDAZO >= archivo.size;
    let texto = decodificador.decode(new Uint8Array(bytes), { stream: !esElUltimo });

    if (primerPedazo) {
      primerPedazo = false;
      // El BOM se saca del TEXTO, no de los bytes: `TextDecoder('utf-8')` ya
      // lo convirtió en U+FEFF y ahí es donde se pega al primer encabezado.
      if (texto.startsWith('﻿')) texto = texto.slice(1);
      // El separador sale de la primera línea, contando fuera de comillas.
      const finDeLinea = texto.search(/\r|\n/);
      separador = separadorDeLinea(finDeLinea === -1 ? texto : texto.slice(0, finDeLinea));
    }

    /*
     * 🔴 El corte por tamaño va fila por fila, no al final del pedazo. Un
     * pedazo de 1 MB del archivo real trae ~6.500 filas: cortando recién al
     * terminarlo, el lote salía de 6.559 y el back —que topa en 5.000—
     * devolvía 400 para todo el lote. El tope es un tope, no un promedio.
     */
    for (const celdas of consumir(texto, separador, estado)) {
      agregar(celdas);
      if (lote.length >= tamanoDeLote) {
        await entregarLote();
        await cederElTurno();
      }
    }

    if (!esElUltimo) await cederElTurno();
  }

  if (!cancelado) {
    const ultima = ultimaFila(estado);
    if (ultima) agregar(ultima);
    await entregarLote();
  }

  return {
    encabezados: encabezados ?? [],
    filas: leidas,
    separador,
    cancelado,
  };
}
