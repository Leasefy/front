/**
 * Reconocer las columnas de CUALQUIER planilla que suba una inmobiliaria.
 *
 * Nico, 20-10-2026, con «PRUEBA CARTERA_20 OCT.xlsx» en pantalla (26 filas
 * «Missing required field(s): documentNumber, fullName, phonePrimary»): «ellos
 * pueden subir como quieran y deberíamos tomarlo… ahí dice que le falta y en
 * realidad sí los tiene, sólo que tú no los leíste». El archivo decía
 * «Documento Inquilino», «Inquilino» y «Contacto»; la lista de alias exactos
 * esperaba «documento», «nombre» y «telefono».
 *
 * ── Cómo decide ────────────────────────────────────────────────────────────
 *
 * Cada campo que se busca (`CampoReconocible`) trae cómo se suele LLAMAR la
 * columna y qué TIPO de dato lleva. Cada columna del archivo se puntúa contra
 * cada campo con las dos pistas:
 *
 *   1. El encabezado, normalizado (sin tildes, mayúsculas ni signos):
 *      igual a un sinónimo (1), con el sinónimo adentro como palabras (≈0,85),
 *      con todas sus palabras en cualquier orden (0,7) o con una palabra clave
 *      (0,5). Una palabra de `evitar` lo anula: «Documento Inquilino» no es el
 *      NOMBRE del inquilino aunque diga «inquilino».
 *   2. Los VALORES de la columna: qué proporción parece teléfono, documento,
 *      nombre, correo, plata, fecha… «Contacto» con 3507876877 es el teléfono;
 *      con juan@x.co sería el correo.
 *
 * Después se reparte de mayor a menor puntaje: cada columna va a un solo campo
 * y cada campo toma una sola columna. Sin encabezado reconocible, una columna
 * cuyos valores son inequívocos (casi todos teléfonos o correos) igual se toma.
 *
 * Nada de esto inventa datos: sólo decide DÓNDE está cada dato. La pantalla
 * muestra lo que se decidió y la persona lo puede cambiar antes de importar.
 */

export type TipoDeValor =
  | 'texto'
  | 'nombre'
  | 'documento'
  | 'telefono'
  | 'correo'
  | 'plata'
  | 'fecha'
  | 'codigo'
  | 'periodo'
  | 'direccion';

export interface CampoReconocible<C extends string = string> {
  campo: C;
  /** Cómo se le dice en pantalla: «Teléfono». */
  etiqueta: string;
  /** Nombres completos de la columna (se comparan normalizados). */
  sinonimos: readonly string[];
  /** Palabras sueltas que lo delatan, más débiles que un sinónimo. */
  palabras?: readonly string[];
  /** Si el encabezado tiene una de estas, NO es este campo. */
  evitar?: readonly string[];
  tipo: TipoDeValor;
  requerido?: boolean;
  /**
   * Se puede tomar sólo por los valores, sin encabezado que lo nombre (cuando
   * el tipo es inequívoco: teléfono, correo). Por defecto no.
   */
  porLosValores?: boolean;
}

export type Mapeo<C extends string> = Partial<Record<C, string>>;

// ── Normalizar ──────────────────────────────────────────────────────────────

const PALABRAS_VACIAS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'al', 'a', 'en', 'y', 'o', 'por', 'para', 'su', 'sus', 'con', 'e',
]);

/** «Documento  Inquilino (C.C.)» → «documento inquilino c c». */
export function normalizarEncabezado(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // «No.», «Nº», «Nro.», «Num.» al EMPEZAR una palabra (no el final de «Teléfono.»).
    .replace(/(^|[^a-z])(n[º°]|no\.|nro\.?|num\.)/g, '$1 numero ')
    .replace(/#/g, ' numero ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    // Siglas con puntos: «C.C.» → «cc», «E-mail» → «email», «N.I.T.» → «nit».
    .replace(/\b([a-z])\s(?=[a-z]\b)/g, '$1')
    .replace(/\b(c c|e mail|n i t)\b/g, (m) => m.replace(/\s/g, ''));
}

function palabrasDe(texto: string): string[] {
  return normalizarEncabezado(texto)
    .split(' ')
    .filter((p) => p && !PALABRAS_VACIAS.has(p));
}

/** ¿`frase` aparece en `texto` como palabras completas y seguidas? */
function contieneFrase(texto: string, frase: string): boolean {
  if (!frase) return false;
  return ` ${texto} `.includes(` ${frase} `);
}

// ── Puntaje por el encabezado ───────────────────────────────────────────────

export function puntajeDelEncabezado(encabezado: string, campo: CampoReconocible): number {
  const n = normalizarEncabezado(encabezado);
  if (!n) return 0;
  const palabras = palabrasDe(encabezado);
  const evitar = (campo.evitar ?? []).map(normalizarEncabezado);

  let mejor = 0;
  for (const bruto of campo.sinonimos) {
    const sinonimo = normalizarEncabezado(bruto);
    if (!sinonimo) continue;
    if (n === sinonimo) return 1;
    if (contieneFrase(n, sinonimo)) {
      // Más alto cuanto más del encabezado explica el sinónimo.
      const cubre = sinonimo.split(' ').length / Math.max(1, n.split(' ').length);
      mejor = Math.max(mejor, 0.75 + 0.15 * Math.min(1, cubre));
      continue;
    }
    const delSinonimo = palabrasDe(sinonimo);
    if (delSinonimo.length > 1 && delSinonimo.every((p) => palabras.includes(p))) {
      mejor = Math.max(mejor, 0.7);
    }
  }
  if (mejor === 0) {
    for (const bruta of campo.palabras ?? []) {
      const palabra = normalizarEncabezado(bruta);
      if (palabra && (palabras.includes(palabra) || (palabra.includes(' ') && contieneFrase(n, palabra)))) {
        mejor = 0.5;
        break;
      }
    }
  }
  if (mejor > 0 && evitar.some((e) => e && (palabras.includes(e) || (e.includes(' ') && contieneFrase(n, e))))) {
    // Un sinónimo EXACTO del campo que contiene la palabra a evitar no se anula
    // (ya retornó arriba); lo demás sí.
    return 0;
  }
  return mejor;
}

// ── Qué parece cada valor ──────────────────────────────────────────────────

/** El texto de una celda, sin espacios de sobra. */
export function textoDeLaCelda(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    // Un número largo que Excel guardó como número: sin notación científica.
    return Number.isInteger(v) ? v.toFixed(0) : String(v);
  }
  const s = String(v).replace(/\s+/g, ' ').trim();
  // «3.507876877E9» o «3,50788E+09» (un CSV que pasó por Excel).
  const cientifica = /^(\d+)[.,](\d+)e\+?(\d+)$/i.exec(s);
  if (cientifica) {
    const n = Number(`${cientifica[1]}.${cientifica[2]}e${cientifica[3]}`);
    if (Number.isFinite(n)) return n.toFixed(0);
  }
  return s;
}

/**
 * Los teléfonos de Colombia que hay en una celda: «350 787 6877 / 604 444
 * 1234», «+57 3507876877», «3507876877-3112908053». En forma de 10 dígitos
 * (o 7, un fijo viejo), sin el 57.
 */
export function telefonosDeLaCelda(v: unknown): string[] {
  const texto = textoDeLaCelda(v);
  if (!texto) return [];
  const encontrados: string[] = [];
  // Primero los grupos separados por algo que no sea parte de un número.
  for (const parte of texto.split(/\s*(?:[/;|,\n]|\s-\s|\sy\s|\so\s)\s*/)) {
    let d = parte.replace(/\D/g, '');
    if (!d) continue;
    if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
    if (d.length === 14 && d.startsWith('0057')) d = d.slice(4);
    if (d.length === 10 && (d.startsWith('3') || d.startsWith('60'))) {
      encontrados.push(d);
      continue;
    }
    if (d.length === 7) {
      encontrados.push(d);
      continue;
    }
    // Dos celulares pegados con un guion: «3507876877-3112908053».
    if (d.length === 20 && d[0] === '3' && d[10] === '3') {
      encontrados.push(d.slice(0, 10), d.slice(10));
    }
  }
  return [...new Set(encontrados)];
}

/** «C.C. 8.070.550» → «8070550» · «NIT 900.123.456-7» → «900123456-7». */
export function documentoDeLaCelda(v: unknown): string {
  let s = textoDeLaCelda(v).toUpperCase();
  if (!s) return '';
  s = s.replace(/^(C\.?\s?C\.?|C\.?\s?E\.?|T\.?\s?I\.?|NIT|PPT|PEP|PASAPORTE|PP|CEDULA|CÉDULA)[\s:.#-]*/u, '');
  // Un número con decimales cero que vino de una celda numérica: «8070550.0».
  s = s.replace(/^(\d+)\.0+$/, '$1');
  s = s.replace(/[.\s,]/g, '');
  return s.replace(/[^0-9A-Z-]/g, '');
}

const RE_CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export function correoDeLaCelda(v: unknown): string | null {
  const m = RE_CORREO.exec(textoDeLaCelda(v));
  return m ? m[0].toLowerCase() : null;
}

function pareceNombre(s: string): boolean {
  if (/\d/.test(s) || s.includes('@')) return false;
  const palabras = s.split(/\s+/).filter((p) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'-]{2,}$/.test(p));
  return palabras.length >= 2 && palabras.length <= 8;
}

function pareceDocumento(s: string): boolean {
  const d = documentoDeLaCelda(s);
  if (/^\d{5,11}(-\d)?$/.test(d)) {
    // Un celular no es un documento.
    return !(d.length === 10 && d.startsWith('3'));
  }
  // Pasaporte / PPT: letras y números.
  return /^[A-Z]{1,3}\d{5,10}$/.test(d);
}

function pareceFecha(s: string): boolean {
  return (
    /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s) ||
    /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s) ||
    /^\d{1,2}[\s/-]+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?[\s/-]+\d{2,4}$/i.test(s)
  );
}

function pareceplata(s: string): boolean {
  if (/[a-zA-Z]/.test(s.replace(/cop|col|\$|pesos/gi, ''))) return false;
  const limpio = s.replace(/[$\s]|cop|pesos/gi, '');
  if (!/^\(?-?[\d.,]+\)?-?$/.test(limpio)) return false;
  const digitos = limpio.replace(/\D/g, '');
  return digitos.length >= 3 && digitos.length <= 13;
}

function pareceDireccion(s: string): boolean {
  return /\d/.test(s) && /[a-z]/i.test(s) && /(calle|cll|cl|carrera|cra|kr|cr|avenida|av|diagonal|dg|transversal|tv|apto|apartamento|casa|local|oficina|piso|torre|#)/i.test(s);
}

/** Qué proporción de los valores con algo escrito parece del tipo. */
export function proporcionDelTipo(valores: readonly unknown[], tipo: TipoDeValor): number {
  const escritos = valores.map(textoDeLaCelda).filter((s) => s !== '');
  if (escritos.length === 0) return 0;
  const parece = (s: string): boolean => {
    switch (tipo) {
      case 'telefono':
        return telefonosDeLaCelda(s).length > 0 && !/@/.test(s);
      case 'documento':
        return pareceDocumento(s);
      case 'nombre':
        return pareceNombre(s);
      case 'correo':
        return RE_CORREO.test(s);
      case 'plata':
        return pareceplata(s);
      case 'fecha':
        return pareceFecha(s);
      case 'codigo':
        return /^[A-Za-z0-9#/._-]{1,20}$/.test(s);
      case 'periodo':
        return /^\d{4}[-/]\d{1,2}$/.test(s) || /^(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?([\s/-]+\d{2,4})?$/i.test(s) || pareceFecha(s);
      case 'direccion':
        return pareceDireccion(s);
      case 'texto':
        return true;
    }
  };
  return escritos.filter(parece).length / escritos.length;
}

// ── Repartir ────────────────────────────────────────────────────────────────

/** Tipos cuyo valor se reconoce sin dudas: el valor pesa más que en los demás. */
const TIPOS_INEQUIVOCOS: ReadonlySet<TipoDeValor> = new Set(['telefono', 'correo', 'fecha']);

export function puntajeDeLaColumna(
  encabezado: string,
  valores: readonly unknown[],
  campo: CampoReconocible,
  opciones: { sinEncabezados?: boolean } = {},
): number {
  const h = opciones.sinEncabezados ? 0 : puntajeDelEncabezado(encabezado, campo);
  const hayValores = valores.some((v) => textoDeLaCelda(v) !== '');
  const v = hayValores ? proporcionDelTipo(valores, campo.tipo) : null;

  if (h === 0) {
    // Sin nombre que lo delate, sólo un tipo inequívoco y casi sin excepciones.
    if (campo.porLosValores && v !== null && v >= 0.9) return 0.4 * v;
    // Un archivo SIN títulos: cualquier campo con un tipo reconocible, si casi
    // todos los valores lo parecen. La persona lo confirma en la vista previa.
    if (opciones.sinEncabezados && campo.tipo !== 'texto' && v !== null && v >= 0.8) return 0.35 * v;
    return 0;
  }
  if (v === null) return 0.8 * h; // archivo de sólo encabezados
  let total = 0.65 * h + 0.35 * v;
  // El encabezado dice una cosa y los valores otra: «Fecha» con nombres adentro.
  if (v < 0.3 && campo.tipo !== 'texto') total *= TIPOS_INEQUIVOCOS.has(campo.tipo) ? 0.4 : 0.6;
  return total;
}

/** Por debajo de esto, una columna no se toma sola (la persona la elige). */
export const PUNTAJE_MINIMO = 0.32;

export interface ReconocimientoDeColumnas<C extends string> {
  mapeo: Mapeo<C>;
  /** El puntaje con que se tomó cada campo (0..1). */
  puntajes: Partial<Record<C, number>>;
}

/**
 * Qué columna es cada campo. `filas` son las filas de datos (encabezado →
 * valor); con 200 se decide igual que con 20.000.
 */
export function reconocerColumnas<C extends string>(
  encabezados: readonly string[],
  filas: readonly Record<string, unknown>[],
  campos: readonly CampoReconocible<C>[],
  opciones: { sinEncabezados?: boolean } = {},
): ReconocimientoDeColumnas<C> {
  const muestra = filas.slice(0, 200);
  const candidatos: Array<{ campo: C; encabezado: string; puntaje: number; orden: number }> = [];
  campos.forEach((campo, ordenDelCampo) => {
    for (const encabezado of encabezados) {
      const valores = muestra.map((f) => f[encabezado]);
      const puntaje = puntajeDeLaColumna(encabezado, valores, campo, opciones);
      if (puntaje >= PUNTAJE_MINIMO) candidatos.push({ campo: campo.campo, encabezado, puntaje, orden: ordenDelCampo });
    }
  });
  // Mayor puntaje primero; a igual puntaje, el campo que se declaró antes.
  candidatos.sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden);

  const mapeo: Mapeo<C> = {};
  const puntajes: Partial<Record<C, number>> = {};
  const usadas = new Set<string>();
  for (const c of candidatos) {
    if (mapeo[c.campo] !== undefined || usadas.has(c.encabezado)) continue;
    mapeo[c.campo] = c.encabezado;
    puntajes[c.campo] = Math.round(c.puntaje * 100) / 100;
    usadas.add(c.encabezado);
  }
  return { mapeo, puntajes };
}

// ── Dónde empieza la tabla ──────────────────────────────────────────────────

/** Cuántas celdas de una fila nombran algún campo (con puntaje de encabezado ≥ 0,5). */
export function celdasQueNombranCampos(fila: readonly unknown[], campos: readonly CampoReconocible[]): number {
  let n = 0;
  for (const celda of fila) {
    const texto = String(celda ?? '').trim();
    if (!texto || texto.length > 80) continue;
    // «ana@correo.co» dice «correo» pero es un DATO, no un título.
    if (pareceUnDato(texto)) continue;
    if (campos.some((c) => puntajeDelEncabezado(texto, c) >= 0.5)) n++;
  }
  return n;
}

/**
 * ¿En qué fila están los encabezados? La que más campos nombra entre las
 * primeras `hasta` (≥ 2). Un reporte trae arriba el logo, el nombre de la
 * inmobiliaria y la fecha de corte; la tabla empieza más abajo. `null` si
 * ninguna fila nombra al menos dos campos.
 */
export function detectarFilaDeEncabezado(
  filas: readonly (readonly unknown[])[],
  campos: readonly CampoReconocible[],
  hasta = 30,
): number | null {
  let mejor: { fila: number; n: number } | null = null;
  filas.slice(0, hasta).forEach((fila, i) => {
    const n = celdasQueNombranCampos(fila, campos);
    if (n >= 2 && (!mejor || n > mejor.n)) mejor = { fila: i, n };
  });
  return (mejor as { fila: number; n: number } | null)?.fila ?? null;
}

function pareceUnDato(s: string): boolean {
  return telefonosDeLaCelda(s).length > 0 || pareceDocumento(s) || RE_CORREO.test(s) || pareceFecha(s) || pareceplata(s);
}

/**
 * ¿La primera fila son DATOS y no encabezados? (un archivo exportado sin
 * títulos). Pasa cuando varias celdas parecen teléfono, documento, correo o
 * plata y ninguna nombra un campo.
 */
export function primeraFilaSonDatos(fila: readonly unknown[], campos: readonly CampoReconocible[]): boolean {
  if (celdasQueNombranCampos(fila, campos) > 0) return false;
  const pareceDato = fila.filter((c) => {
    const s = textoDeLaCelda(c);
    return s !== '' && pareceUnDato(s);
  }).length;
  return pareceDato >= 2;
}

/** «Columna A», «Columna B»… para un archivo sin encabezados. */
export function nombreDeColumnaSinTitulo(i: number): string {
  let n = i;
  let letras = '';
  do {
    letras = String.fromCharCode(65 + (n % 26)) + letras;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Columna ${letras}`;
}
