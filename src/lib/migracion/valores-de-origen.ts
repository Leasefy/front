/**
 * valores-de-origen — leer las celdas raras que traen los exports del sistema
 * viejo de una inmobiliaria.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * Los cuatro archivos reales de la migración (Propiedades, Contracts, el PUC y
 * los documentos contables) no traen datos sueltos: traen datos EMPAQUETADOS
 * dentro de una celda.
 *
 *     Propiedades.csv  →  Propietario   = «901548190 - PORTOFINO PROPIEDAD RAIZ S.A.S»
 *                         Estrato       = «Tres» / «No Estratificada» / «Comentario»
 *                         Fecha Creación= «2026-09-08 10:10:08»
 *     Contracts.csv    →  Propiedad     = «3 - CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO»
 *                         Inquilino     = «[1] 43090971 - LUZ ADRIANA, [2] 42979803 - MARIA»
 *     PUC / documentos →  banderas      = «SI» / «NO»
 *
 * Cada uno de esos formatos, leído de cualquier otra forma, produce un dato
 * FALSO que se ve bien: un propietario que se llama «901548190 - PORTOFINO…»,
 * un inmueble en la dirección «3 - CR 50 127 SUR 61», un estrato que quedó
 * vacío porque decía «Tres» y no «3».
 *
 * ── La regla del archivo ────────────────────────────────────────────────────
 *
 * Lo que no se puede leer con CERTEZA vuelve `undefined` (o la lista vacía),
 * nunca un valor inventado. Un campo vacío se nota en la revisión; uno lleno
 * con basura, no.
 *
 * Lo usan las tres importaciones —inmuebles, contratos y contabilidad— para
 * que la misma celda valga lo mismo en las tres pantallas.
 */

/** Sin tildes, minúsculas, espacios colapsados. */
function normalizar(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Estrato en palabras ─────────────────────────────────────────────────────

/**
 * El estrato del archivo real viene ESCRITO: «Tres», «Cinco», «No
 * Estratificada», «Comentario». La columna nunca trae un dígito.
 */
const ESTRATO_EN_PALABRAS: Record<string, number> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  // Por si otro sistema lo manda con dígito: es la misma columna.
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
};

/**
 * «Tres» → 3. «No Estratificada», «Comentario», vacío o cualquier otra cosa →
 * `undefined`.
 *
 * 🔴 Nunca 0 ni 1 por defecto: el estrato entra al canon de servicios públicos
 * y a la ficha del inmueble. Un estrato inventado es plata mal calculada.
 * Y nunca fuera de [1, 6]: el back valida `@Min(0) @Max(6)` y un 7 tumbaría el
 * lote entero con 400 en vez de dejar la celda vacía.
 */
export function estratoDePalabras(v: unknown): number | undefined {
  const n = normalizar(v);
  if (!n) return undefined;
  // «Estrato 3», «Estrato Tres»: la palabra sobra, el valor es lo último.
  const limpio = n.replace(/^estrato\s+/, '');
  return ESTRATO_EN_PALABRAS[limpio];
}

// ── «documento - nombre» ────────────────────────────────────────────────────

export interface PersonaDeOrigen {
  /** El documento tal como venía, sin puntos ni espacios. Vacío si no traía. */
  documento?: string;
  /** El nombre tal como venía, con sus espacios colapsados. */
  nombre?: string;
  /** El orden que el archivo declaró con `[1]`, `[2]`… `undefined` si no lo trae. */
  orden?: number;
}

/**
 * Un documento: entre 5 y 12 dígitos, con hasta tres letras adelante.
 *
 * Las letras son por los pasaportes y las cédulas de extranjería
 * («AA2004549»), que el archivo real trae y que son documentos igual de
 * válidos que una cédula. Se pide un mínimo de dígitos para no confundir el
 * prefijo con el número de un apartamento.
 *
 * 🔴 No se valida el PRIMER dígito ni el DV: en Colombia hay documentos que
 * empiezan por cualquier cifra, y rechazar por ahí bota gente real. Tampoco se
 * acepta cualquier cosa: un teléfono («(301) 402-3878») trae paréntesis y
 * guiones y NO pasa, que es justo lo que evita guardar un teléfono como si
 * fuera la cédula del dueño.
 */
const DOCUMENTO = /^[A-Z]{0,3}\d{5,12}$/;

/**
 * «901548190 - PORTOFINO PROPIEDAD RAIZ S.A.S» → documento + nombre.
 *
 * Se parte por el PRIMER « - » y sólo si lo de la izquierda tiene cara de
 * documento; si no, todo el texto es el nombre. Esa condición es la que evita
 * el error caro al revés: «CONSTRUCTORA A - B S.A.S» no tiene documento y su
 * nombre no puede quedar mochado en «B S.A.S».
 */
export function documentoYNombre(v: unknown): PersonaDeOrigen {
  const texto = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (!texto) return {};

  // El `[1]` / `[2]` con el que el archivo numera a los copropietarios.
  let orden: number | undefined;
  const conOrden = texto.match(/^\[(\d+)\]\s*(.*)$/);
  const cuerpo = conOrden ? conOrden[2].trim() : texto;
  if (conOrden) orden = Number(conOrden[1]);

  const partido = cuerpo.match(/^([^\s-][^-]*?)\s+-\s+(.+)$/);
  if (partido) {
    const izquierda = partido[1].replace(/[.\s]/g, '').toUpperCase();
    if (DOCUMENTO.test(izquierda)) {
      return { documento: izquierda, nombre: partido[2].trim() || undefined, orden };
    }
  }
  return { nombre: cuerpo || undefined, orden };
}

/**
 * «[1] 43090971 - LUZ ADRIANA, [2] 42979803 - MARIA VICTORIA» → las dos, en
 * orden.
 *
 * ── Por qué NO se parte por comas a secas ───────────────────────────────────
 *
 * Los nombres traen comas («GOMEZ, JUAN») y las razones sociales también
 * («PORTOFINO S.A.S, BIC»). Partir por coma parte personas por la mitad. Se
 * parte por el marcador `[n]`, que es lo que el archivo usa para numerarlas, y
 * sólo cuando no hay ninguno se cae a UNA sola persona con todo el texto.
 *
 * El `[1]` es el titular del contrato; los demás son copropietarios /
 * co-inquilinos. El orden de la lista es el del archivo.
 */
export function listaDePersonas(v: unknown): PersonaDeOrigen[] {
  const texto = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (!texto) return [];

  const marcadores = [...texto.matchAll(/\[(\d+)\]/g)];
  if (marcadores.length === 0) {
    const una = documentoYNombre(texto);
    return una.documento || una.nombre ? [una] : [];
  }

  const personas: PersonaDeOrigen[] = [];
  for (let i = 0; i < marcadores.length; i++) {
    const desde = marcadores[i].index ?? 0;
    const hasta = i + 1 < marcadores.length ? (marcadores[i + 1].index ?? texto.length) : texto.length;
    // La coma que separa a una persona de la siguiente queda al final del
    // trozo anterior: se saca acá y no con un split, para no cortar nombres.
    const trozo = texto.slice(desde, hasta).replace(/[,;]\s*$/, '').trim();
    const persona = documentoYNombre(trozo);
    if (persona.documento || persona.nombre) personas.push(persona);
  }
  return personas;
}

// ── «código - dirección» ────────────────────────────────────────────────────

export interface InmuebleDeOrigen {
  /** El código del inmueble en el sistema viejo, tal cual. */
  codigo?: string;
  /** La dirección, ya sin el código. */
  direccion?: string;
}

/**
 * «3 - CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO» → código `3` + la dirección.
 *
 * 🔴 Se parte por el PRIMER « - » y nada más. Las direcciones traen guiones
 * («126 SUR 42 - 37 AP 504») y partir por el último, o por todos, deja el
 * inmueble en una dirección que no existe.
 *
 * El código tiene que ser sólo dígitos: «CR 50 - 127» no es «código CR 50».
 */
export function codigoYDireccion(v: unknown): InmuebleDeOrigen {
  const texto = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (!texto) return {};
  const partido = texto.match(/^(\d+)\s+-\s+(.*)$/);
  if (!partido) return { direccion: texto };
  const direccion = partido[2].trim();
  return { codigo: partido[1], direccion: direccion || undefined };
}

// ── Fechas con hora ─────────────────────────────────────────────────────────

/**
 * «2026-09-08 10:10:08» → «2026-09-08». También acepta el ISO pelado y
 * `dd/mm/aaaa` (en Colombia el día va primero, SIEMPRE).
 *
 * Cualquier otra cosa vuelve `undefined`: una fecha adivinada corre un contrato
 * de mes y no da ningún error.
 */
export function fechaDeOrigen(v: unknown): string | undefined {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10);
  }
  const s = String(v ?? '').trim();
  if (!s) return undefined;

  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);
  if (iso) return armarFecha(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const latino = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T].*)?$/);
  if (latino) return armarFecha(Number(latino[3]), Number(latino[2]), Number(latino[1]));

  return undefined;
}

function armarFecha(a: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1) return undefined;
  const diasDelMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
  if (d > diasDelMes) return undefined;
  return `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── Plata y porcentajes del export ──────────────────────────────────────────

/**
 * `$1,900,000.00` → 1900000. También `$1.900.000,00`, `1900000`, `$0.00`.
 *
 * Se decide cuál separador es el DECIMAL por su posición (el último seguido de
 * 1 o 2 dígitos), nunca por locale: el mismo archivo trae las dos convenciones
 * y adivinar por país fue lo que dejó 1.365 cánones en 0.
 *
 * Una lista («$451,000.00, $649,000.00», que es como el export escribe el canon
 * repartido entre dos propietarios) vuelve `undefined` a propósito: no es UN
 * número, y sumarla acá sería inventar. Para eso está la columna «Canon Total».
 */
export function plataDeOrigen(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = String(v ?? '').trim();
  if (!s) return undefined;

  /*
   * 🔴 El signo se busca ANTES del primer dígito y DESPUÉS del símbolo de
   * moneda: el export escribe el saldo negativo como «$-4,500.00», con el
   * menos entre el `$` y el número. Buscarlo sólo al principio de la celda lo
   * perdía y el saldo entraba POSITIVO, sin ningún error.
   * U+2212 y los guiones largos también son signo: los pegan Excel y Numbers.
   */
  const antesDelNumero = s.slice(0, s.search(/\d/) === -1 ? s.length : s.search(/\d/));
  const signo = /[-−–—]/.test(antesDelNumero) || /^\(.*\)$/.test(s.trim()) ? -1 : 1;
  const limpio = s.replace(/[^\d.,]/g, '');
  if (!limpio) return undefined;

  const separadores = [...limpio.matchAll(/[.,]/g)];
  let entera = limpio;
  let decimal = '';
  if (separadores.length > 0) {
    const ultimo = separadores[separadores.length - 1];
    const posicion = ultimo.index ?? -1;
    const despues = limpio.length - posicion - 1;
    if (despues >= 1 && despues <= 2) {
      decimal = limpio.slice(posicion + 1);
      entera = limpio.slice(0, posicion);
    }
    const grupos = entera.split(/[.,]/);
    const agrupaBien =
      grupos.length === 1 || (grupos[0].length >= 1 && grupos.slice(1).every((g) => g.length === 3));
    if (!agrupaBien) return undefined;
    entera = grupos.join('');
  }
  if (!/^\d+$/.test(entera) || (decimal !== '' && !/^\d+$/.test(decimal))) return undefined;

  const n = Number(`${entera}.${decimal || '0'}`);
  return Number.isFinite(n) ? signo * n : undefined;
}

/** `«26,766»` → 26766. Un consecutivo del export trae miles con coma. */
export function enteroDeOrigen(v: unknown): number | undefined {
  const n = plataDeOrigen(v);
  if (n === undefined) return undefined;
  return Number.isSafeInteger(Math.round(n)) ? Math.round(n) : undefined;
}

/** `«7 %»` → 7 · `«7.5 %»` → 7.5. Fuera de [0, 100] no es un porcentaje. */
export function porcentajeDeOrigen(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 && v <= 100 ? v : undefined;
  const s = String(v ?? '').replace(/[%\s ]/g, '');
  if (!s) return undefined;
  const n = plataDeOrigen(s);
  if (n === undefined) return undefined;
  return n >= 0 && n <= 100 ? n : undefined;
}

// ── Banderas SI / NO ────────────────────────────────────────────────────────

const SI = new Set(['si', 'sí', 's', 'yes', 'y', 'true', 'verdadero', 'x', '1']);
const NO = new Set(['no', 'n', 'false', 'falso', '0']);

/**
 * «SI»/«NO» → `true`/`false`. Lo que no es ninguna de las dos vuelve
 * `undefined`: una bandera adivinada apaga o prende una cuenta contable.
 */
export function banderaDeOrigen(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  const n = normalizar(v);
  if (!n) return undefined;
  if (SI.has(n)) return true;
  if (NO.has(n)) return false;
  return undefined;
}
