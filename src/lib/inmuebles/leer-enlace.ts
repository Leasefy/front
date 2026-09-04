/**
 * Leer un inmueble de la página que hay detrás de un enlace para compartir.
 *
 * ── Qué es un enlace para compartir ──────────────────────────────────────
 * SIMI, Daytona, Nuby, Wasi y los portales generan, por inmueble, una página
 * pública para mandar por WhatsApp. Como su razón de existir es que WhatsApp
 * le arme la vista previa, prácticamente todas traen Open Graph, y muchas
 * traen JSON-LD de schema.org. O sea: **el dato ya viene rotulado**. No hay que
 * adivinarlo del diseño.
 *
 * ── Por qué no hay un modelo adivinando acá ──────────────────────────────
 * Se lee lo que la página DECLARA, por orden de confianza:
 *
 *   1. JSON-LD  — el sitio dice «el precio es 2.500.000». Es un dato rotulado.
 *   2. Open Graph — el sitio dice «el título es X». Rotulado, pero más pobre.
 *   3. Texto     — lo dice un humano en una frase. Sólo con etiqueta al lado.
 *
 * Cada campo sale con `fuente` y `textoOriginal`, así la pantalla puede mostrar
 * de dónde salió cada número y la persona puede discutirle al lector. Lo que no
 * está, queda `undefined` — nunca en cero. Un campo vacío se nota; uno lleno
 * con un número inventado, no.
 *
 * ⚠️ La regla que más importa acá es la del dinero. Una ficha de inmueble suele
 * traer varios pesos —canon, administración, precio de VENTA— y agarrar
 * cualquier `$` es cómo se termina publicando un arriendo de $450.000.000. Por
 * eso el texto sólo se acepta **con su etiqueta al lado**.
 *
 * ── Y el precio declarado también tiene que saber DE QUÉ es ─────────────
 * El JSON-LD dice «price: 320000000» sin decir si es un canon o un precio de
 * venta. Medido en tres enlaces reales de Fincaraíz (2026-09-01): dos eran
 * «Apartamento en Venta» y los dos entraron con `monthlyRent: 420.000.000` —
 * exactamente el arriendo de $450.000.000 que el párrafo de arriba prometía
 * evitar, sólo que por la puerta rotulada. Por eso antes de asignar el precio
 * se lee el NEGOCIO (venta / arriendo) de lo que la página declara: las migas
 * de pan, la URL y el título. Sin negocio conocido, el precio sigue yendo al
 * canon —es lo que traen los CRM de arriendo— y la revisión lo muestra.
 */

import { COLOMBIAN_DEPARTMENTS } from '@/lib/types/inmobiliaria';

export type FuenteDelDato = 'json-ld' | 'open-graph' | 'texto' | 'titulo-html' | 'url';

export type Negocio = 'venta' | 'arriendo';

export interface DatoLeido<T> {
  valor: T;
  fuente: FuenteDelDato;
  /** El fragmento exacto del que salió, para poder verificarlo a ojo. */
  textoOriginal?: string;
}

export interface InmuebleDesdeEnlace {
  url: string;
  titulo?: DatoLeido<string>;
  descripcion?: DatoLeido<string>;
  direccion?: DatoLeido<string>;
  ciudad?: DatoLeido<string>;
  barrio?: DatoLeido<string>;
  /** Con el nombre canónico de la lista congelada (`Valle del Cauca`, no «Valle del cauca»). */
  departamento?: DatoLeido<string>;
  tipo?: DatoLeido<string>;
  /**
   * Qué se ofrece: vender o arrendar. Decide a qué campo va el precio
   * declarado. Ausente = la página no lo dice en ningún lado rotulado.
   */
  negocio?: DatoLeido<Negocio>;
  canon?: DatoLeido<number>;
  /** Sólo cuando `negocio` es venta: el mismo `price` del JSON-LD, en su campo. */
  precioVenta?: DatoLeido<number>;
  administracion?: DatoLeido<number>;
  area?: DatoLeido<number>;
  habitaciones?: DatoLeido<number>;
  banos?: DatoLeido<number>;
  /** URLs absolutas, sin repetidos, en el orden en que aparecen. */
  imagenes: string[];
  /**
   * `direccion` no es la dirección exacta: es una referencia que da el
   * aviso, o directamente el municipio. La pantalla tiene que poder
   * distinguirlo — si no, el dato se ve tan sólido como uno exacto y nadie
   * lo revisa (T-0034 WU-1, Slice B).
   */
  direccionAproximada?: boolean;
  /** Se leen aunque hoy el inmueble no los pueda guardar. Ver la nota al pie. */
  videos: string[];
}

// ── Números en formato colombiano ─────────────────────────────────────────

/**
 * Dinero: en Colombia el punto separa miles y no hay centavos en la práctica.
 * `$ 2.500.000 COP` → 2500000. Se descartan los separadores, todos.
 */
export function dineroColombiano(texto: string): number | undefined {
  const soloNumero = texto.replace(/[^\d.,]/g, '');
  if (!soloNumero) return undefined;
  const limpio = soloNumero.replace(/[.,]/g, '');
  if (!limpio) return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Medida: acá la coma SÍ es decimal (`75,5 m²`), y el punto también se usa
 * como decimal en muchas fichas (`75.5`). Con medidas de inmueble no hay
 * ambigüedad real: nadie tiene 75.500 m².
 */
export function medidaColombiana(texto: string): number | undefined {
  const m = texto.match(/\d+(?:[.,]\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ── Lectura del HTML sin dependencias ─────────────────────────────────────

/** `<meta property="og:title" content="X">` en cualquier orden de atributos. */
export function etiquetasMeta(html: string): Map<string, string> {
  const encontradas = new Map<string, string>();
  const etiquetas = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const etiqueta of etiquetas) {
    const clave =
      etiqueta.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    const valor = etiqueta.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (!clave || !valor) continue;
    const k = clave.toLowerCase();
    // og:image puede repetirse: la primera manda como principal, el resto se
    // recoge aparte en `imagenesDelHtml`.
    if (!encontradas.has(k)) encontradas.set(k, decodificarEntidades(valor.trim()));
  }

  return encontradas;
}

/**
 * Bloques cuyo contenido NO es el inmueble, por más que traigan `name` y
 * `address` que encajan perfecto en los campos que buscamos.
 *
 * ⚠️ Esto no es una precaución teórica. Una ficha real de Ciencuadras trae
 * cuatro bloques JSON-LD: Organization, WebSite, BreadcrumbList y el Product
 * que sí es el inmueble. Leyendo todos por igual, el inmueble quedaba llamado
 * «Ciencuadras.com» y con la dirección de la OFICINA del portal —
 * «Avenida Calle 26 # 68b-31»— en el campo de la dirección del apartamento.
 *
 * Un campo vacío se nota. Uno lleno con la dirección de otro, no.
 */
const TIPOS_QUE_NO_SON_EL_INMUEBLE = new Set([
  'organization',
  'website',
  'webpage',
  'breadcrumblist',
  'searchaction',
  'sitenavigationelement',
  'person',
  'localbusiness',
  'realestateagent',
  'itemlist',
  'collectionpage',
  'faqpage',
  'question',
]);

function esBloqueDelInmueble(bloque: Record<string, unknown>): boolean {
  const tipos = Array.isArray(bloque['@type']) ? bloque['@type'] : [bloque['@type']];
  return !tipos.some(
    (t) => typeof t === 'string' && TIPOS_QUE_NO_SON_EL_INMUEBLE.has(t.toLowerCase()),
  );
}

/** Cada `<script type="application/ld+json">` parseado, tal cual viene. */
function raicesJsonLd(html: string): unknown[] {
  const raices: unknown[] = [];
  const scripts =
    html.match(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? [];

  for (const script of scripts) {
    const cuerpo = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      raices.push(JSON.parse(cuerpo.trim()));
    } catch {
      continue; // Un JSON-LD roto no invalida la página.
    }
  }

  return raices;
}

/** Todos los bloques `application/ld+json`, aplanando `@graph` y arreglos. */
export function bloquesJsonLd(html: string): Record<string, unknown>[] {
  const bloques: Record<string, unknown>[] = [];
  for (const raiz of raicesJsonLd(html)) aplanar(raiz, bloques);
  return bloques;
}

/**
 * Las migas de pan (`BreadcrumbList`), en orden y sin el sitio ni la ficha.
 *
 * `bloquesJsonLd` las descarta a propósito —su `name` no es el del inmueble—
 * pero como CAMINO son el dato más rotulado que hay sobre dónde está y qué se
 * ofrece: Fincaraíz publica `Fincaraíz > Venta > Apartamentos > Zipaquirá >
 * Las villas > (la ficha)`. Se leen aparte, como lista de nombres.
 */
export function migasDePan(html: string): string[] {
  const nombres: string[] = [];

  const recorrer = (nodo: unknown): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach(recorrer);
      return;
    }
    if (!nodo || typeof nodo !== 'object') return;
    const obj = nodo as Record<string, unknown>;
    const tipos = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
    if (tipos.some((t) => typeof t === 'string' && t.toLowerCase() === 'breadcrumblist')) {
      const items = Array.isArray(obj.itemListElement) ? obj.itemListElement : [];
      const ordenados = [...items]
        .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
        .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
      for (const item of ordenados) {
        const nombre =
          comoTexto(item.name) ??
          comoTexto((item.item as Record<string, unknown> | undefined)?.name);
        if (nombre) nombres.push(nombre);
      }
      return;
    }
    if (obj['@graph']) recorrer(obj['@graph']);
  };

  raicesJsonLd(html).forEach(recorrer);

  // El primero es el sitio y el último es la ficha misma: ninguno de los dos
  // dice nada del lugar. Con menos de tres no queda camino que leer.
  return nombres.length >= 3 ? nombres.slice(1, -1) : [];
}

function aplanar(datos: unknown, salida: Record<string, unknown>[]): void {
  if (Array.isArray(datos)) {
    for (const d of datos) aplanar(d, salida);
    return;
  }
  if (!datos || typeof datos !== 'object') return;

  const obj = datos as Record<string, unknown>;

  // Un bloque de la empresa se descarta ENTERO: no se le leen los hijos. Su
  // `address` es la oficina del portal, y es justo lo que no debe llegar.
  if (!esBloqueDelInmueble(obj)) return;

  salida.push(obj);

  if (obj['@graph']) aplanar(obj['@graph'], salida);
  // Los anidados que sí traen datos del inmueble. `offers.itemOffered` es donde
  // los portales cuelgan lo bueno: área, coordenadas y la dirección real.
  for (const clave of ['offers', 'itemOffered', 'mainEntity', 'about']) {
    if (obj[clave]) aplanar(obj[clave], salida);
  }
}

/** El texto visible, sin scripts ni estilos. Para las búsquedas con etiqueta. */
export function textoVisible(html: string): string {
  return decodificarEntidades(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function decodificarEntidades(texto: string): string {
  const tabla: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&ntilde;': 'ñ',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&Ntilde;': 'Ñ',
  };
  return texto
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => {
      if (tabla[e]) return tabla[e];
      const numero = e.match(/^&#(\d+);$/);
      return numero ? String.fromCharCode(Number(numero[1])) : e;
    })
    .replace(/ /g, ' ');
}

// ── Tipo de inmueble ──────────────────────────────────────────────────────

/** Claves que entiende el resto del front (ver TIPO_EN_ESPANOL del asistente). */
const TIPOS: { clave: string; terminos: string[] }[] = [
  { clave: 'studio', terminos: ['apartaestudio', 'aparta estudio', 'studio', 'monoambiente'] },
  { clave: 'apartment', terminos: ['apartamento', 'apartment', 'apto', 'penthouse'] },
  { clave: 'house', terminos: ['casa', 'house', 'singlefamilyresidence', 'townhouse', 'casa campestre'] },
  { clave: 'commercial', terminos: ['local comercial', 'local', 'commercial'] },
  { clave: 'office', terminos: ['oficina', 'office', 'consultorio'] },
  { clave: 'warehouse', terminos: ['bodega', 'warehouse', 'galpon'] },
];

/**
 * `apartaestudio` va primero a propósito: contiene «estudio», y si «apartamento»
 * ganara primero un apartaestudio entraría mal tipificado.
 */
export function tipoDeInmueble(texto: string): string | undefined {
  const t = texto.toLowerCase();
  for (const { clave, terminos } of TIPOS) {
    if (terminos.some((termino) => t.includes(termino))) return clave;
  }
  return undefined;
}

// ── Lectura principal ─────────────────────────────────────────────────────

function comoTexto(valor: unknown): string | undefined {
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  if (typeof valor === 'number') return String(valor);
  return undefined;
}

/**
 * ⚠️ Cada magnitud se lee con SU parser. No es una sutileza de estilo.
 *
 * El punto significa cosas opuestas según qué se esté midiendo: en dinero
 * separa miles (`2.500.000`), en una medida es decimal (`35.0`). Pasar el
 * `floorSize` de una ficha real por el parser de dinero convertía **35.0 m² en
 * 350 m²** — un apartamento diez veces más grande, con el tipo correcto, la
 * procedencia «json-ld» y ninguna forma de notarlo mirando la pantalla.
 */
function comoNumeroCon(
  valor: unknown,
  parsear: (texto: string) => number | undefined,
): number | undefined {
  if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) return valor;
  if (typeof valor === 'string') return parsear(valor);
  // schema.org QuantitativeValue: { value: '35.0', unitCode: 'MTK' }
  if (valor && typeof valor === 'object' && 'value' in valor) {
    return comoNumeroCon((valor as Record<string, unknown>).value, parsear);
  }
  return undefined;
}

const comoDinero = (valor: unknown) => comoNumeroCon(valor, dineroColombiano);
const comoMedida = (valor: unknown) => comoNumeroCon(valor, medidaColombiana);
const comoEntero = (valor: unknown) => {
  const n = comoNumeroCon(valor, medidaColombiana);
  return n === undefined ? undefined : Math.floor(n);
};

/**
 * En Colombia las fichas usan `addressLocality` para el BARRIO y
 * `addressRegion` para la ciudad tan seguido como al revés. Medido en una ficha
 * real: `addressLocality: "Teusaquillo"`, `addressRegion: "Bogotá"`. Leer el
 * esquema al pie de la letra deja «Teusaquillo» como ciudad.
 *
 * Así que no se adivina por el nombre del campo: se mira cuál de los dos ES una
 * ciudad. Si ninguno lo es, manda el esquema.
 */
const CIUDADES = new Set(
  [
    'bogota', 'medellin', 'cali', 'barranquilla', 'cartagena', 'bucaramanga',
    'pereira', 'manizales', 'santa marta', 'ibague', 'villavicencio', 'armenia',
    'neiva', 'popayan', 'monteria', 'pasto', 'cucuta', 'soacha', 'envigado',
    'itagui', 'bello', 'sabaneta', 'chia', 'cajica', 'zipaquira', 'rionegro',
    'floridablanca', 'palmira', 'tulua', 'valledupar', 'sincelejo', 'riohacha',
  ],
);

/**
 * Los 32 departamentos de Colombia, con su nombre canónico. Existe para el
 * mismo motivo que CIUDADES pero al revés: un valor que ES un departamento
 * NUNCA es plausible como barrio, y antes de esto se asignaba igual — T-0030
 * WU-3, defecto real: una ficha con `addressRegion: "Antioquia"` +
 * `addressLocality: "Itagüí"` dejaba `neighborhood: "Antioquia"` en el
 * inmueble creado.
 *
 * Es la MISMA lista congelada que valida el back (`@IsIn`), así que lo que se
 * lee de acá («Valle del cauca» en Fincaraíz) sale ya con la grafía que el
 * back acepta («Valle del Cauca») — no con la del portal.
 */
const DEPARTAMENTOS = new Map<string, string>(
  COLOMBIAN_DEPARTMENTS.map((d) => [normalizarNombre(d), d]),
);

function normalizarNombre(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      // «Bogotá, D.C.» / «Bogotá D.C.» / «Bogota DC» son la misma ciudad. Sin
      // esto, una ficha real con `addressRegion: "Bogotá, d.c."` dejaba ese
      // texto como BARRIO del inmueble.
      .replace(/[\s,]*\bd\.?\s*c\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** El mismo lugar escrito de dos maneras («Bogotá D.C.» y «Bogotá», «Jamundi» y «Jamundí»). */
function mismoNombre(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return normalizarNombre(a) === normalizarNombre(b);
}

/**
 * Nomenclatura colombiana: `Calle 39A # 25-14`, `Cra. 13 No. 53-20`,
 * `Diagonal 40 # 20-15`, `Kr 13 # 45 - 11`.
 *
 * Existe porque los portales NO publican la dirección en el campo estructurado
 * —la reservan hasta que alguien pregunta— pero el aviso la escribe igual en la
 * descripción: «ubicado en el barrio la soledad calle 39A # 25-14, 3 piso».
 * Sin esto, ninguna ficha de Ciencuadras se puede importar: el asistente exige
 * dirección y la marca como error.
 *
 * Leerla de la prosa no es inventarla. Pero sale con `fuente: 'texto'` y se
 * mira en la revisión antes de crear nada.
 */
// La letra de la nomenclatura va PEGADA al número (`39A`, `68b`), nunca
// separada: permitir un espacio ahí hacía que `12-34 con patio` se leyera como
// `12-34 c`, comiéndose la primera letra de la palabra siguiente.
const DIRECCION_COLOMBIANA =
  /\b(?:calles?|cll?\.?|carreras?|cra\.?|kra\.?|kr\.?|diagonal|dg\.?|transversal|tv\.?|avenida|av\.?|autopista)\s*\.?\s*\d{1,3}[a-z]?(?:\s+bis)?(?:\s+(?:sur|norte|este|oeste))?\s*(?:#|n[oº°]\.?|nro\.?|num\.?)\s*\d{1,3}[a-z]?\s*-\s*\d{1,3}[a-z]?\b/i;

/**
 * Una referencia locacional: no una calle con número, sino cómo la gente
 * describe DÓNDE queda algo — «cerca al tránsito de itagui», «frente al
 * centro comercial X», «a dos cuadras del parque». Es lo segundo mejor
 * cuando el portal no publica la dirección exacta (T-0034 WU-1, Slice B).
 *
 * El marcador (`cerca de`, `frente a`, …) es general — no depende del sitio.
 * El corte es en `.`, `,`, `;` o salto de línea: sin él, «cerca al tránsito
 * de itagui, estación del metro, rutas integradas» se guardaría entero, una
 * frase corrida y no una referencia legible.
 */
const REFERENCIA_LOCACIONAL =
  /\b(?:cerca\s+(?:de|al?)|frente\s+a|junto\s+a|al\s+lado\s+de|a\s+\d+\s*(?:cuadras?|min(?:utos)?)\s+de|diagonal\s+a)\b[^.,;\n]{0,60}/i;

function referenciaLocacional(texto: string): string | undefined {
  const m = texto.match(REFERENCIA_LOCACIONAL);
  if (!m) return undefined;
  const limpia = m[0].replace(/\s+/g, ' ').trim();
  return limpia || undefined;
}

function esCiudad(nombre: string | undefined): boolean {
  if (!nombre) return false;
  return CIUDADES.has(normalizarNombre(nombre));
}

/**
 * Un departamento no es un barrio, nunca. Se usa para vetar la asignación
 * "lo que sobra es barrio" cuando lo que sobra es en realidad el
 * departamento — ver DEPARTAMENTOS arriba.
 */
function esDepartamento(nombre: string | undefined): boolean {
  if (!nombre) return false;
  return DEPARTAMENTOS.has(normalizarNombre(nombre));
}

/** «Valle del cauca» → «Valle del Cauca». `undefined` si no es un departamento. */
function departamentoCanonico(nombre: string | undefined): string | undefined {
  if (!nombre) return undefined;
  return DEPARTAMENTOS.get(normalizarNombre(nombre));
}

// ── Negocio: venta o arriendo ─────────────────────────────────────────────

const PALABRAS_DE_VENTA = /\b(?:ventas?|vender|se\s+vende)\b/i;
const PALABRAS_DE_ARRIENDO = /\b(?:arriendos?|arrendar|arrendamiento|alquiler|alquilar|renta|se\s+arrienda)\b/i;

/**
 * Qué negocio dice UNA frase. `undefined` si no dice ninguno o dice los dos
 * («venta y arriendo»): un precio solo no se puede repartir entre dos
 * negocios, así que ahí no se decide.
 */
function negocioEnTexto(texto: string | undefined): Negocio | undefined {
  if (!texto) return undefined;
  const venta = PALABRAS_DE_VENTA.test(texto);
  const arriendo = PALABRAS_DE_ARRIENDO.test(texto);
  if (venta === arriendo) return undefined;
  return venta ? 'venta' : 'arriendo';
}

/**
 * El negocio, por orden de cuán rotulado viene:
 *
 *   1. Las migas de pan — `Fincaraíz > Venta > Apartamentos > …`: un nodo que
 *      es exactamente la palabra.
 *   2. La URL — `/apartamento-en-venta-en-las-villas-zipaquira/193740609`,
 *      `/inmueble/venta-apartamento-bogota-…`: los portales lo ponen en la
 *      ruta porque también es su SEO.
 *   3. El título — «Apartamento en Venta en Las villas, Zipaquirá».
 *
 * La descripción NO cuenta: un aviso de arriendo dice «también se vende» y
 * uno de venta dice «actualmente arrendado» todo el tiempo.
 */
function negocioDe(
  migas: string[],
  url: string,
  titulos: (DatoLeido<string> | undefined)[],
): DatoLeido<Negocio> | undefined {
  for (const miga of migas) {
    const n = normalizarNombre(miga);
    if (/^(?:ventas?|vender)$/.test(n)) return { valor: 'venta', fuente: 'json-ld', textoOriginal: `BreadcrumbList: ${miga}` };
    if (/^(?:arriendos?|arrendar|alquiler|renta)$/.test(n)) {
      return { valor: 'arriendo', fuente: 'json-ld', textoOriginal: `BreadcrumbList: ${miga}` };
    }
  }

  let ruta = '';
  try {
    ruta = decodeURIComponent(new URL(url).pathname);
  } catch {
    ruta = url;
  }
  // En la ruta las palabras van separadas por `/` o `-`, no por espacios.
  const enRuta = negocioEnTexto(ruta.replace(/[/_-]+/g, ' '));
  if (enRuta) return { valor: enRuta, fuente: 'url', textoOriginal: ruta };

  for (const titulo of titulos) {
    const n = negocioEnTexto(titulo?.valor);
    if (n && titulo) return { valor: n, fuente: titulo.fuente, textoOriginal: titulo.valor };
  }

  return undefined;
}

// ── Barrio: de dónde sale cuando el JSON-LD no lo trae ────────────────────

/** Palabras que en un título o una miga NO son un lugar. */
const NO_ES_UN_LUGAR =
  /^(?:ventas?|arriendos?|alquiler|renta|apartamentos?|apartaestudios?|casas?|locales?|oficinas?|bodegas?|lotes?|fincas?|inmuebles?|proyectos?|habitaciones?|colombia)$/i;

/**
 * Si este texto puede ser el nombre de un barrio: no es la ciudad ni un
 * departamento ni una palabra del rubro, y tiene tamaño de nombre.
 */
function plausibleComoBarrio(candidato: string | undefined, ciudad: string | undefined): candidato is string {
  if (!candidato) return false;
  const limpio = candidato.trim();
  if (limpio.length < 2 || limpio.length > 60) return false;
  if (/\d{3,}/.test(limpio)) return false; // un código de aviso, no un barrio
  if (NO_ES_UN_LUGAR.test(limpio)) return false;
  if (esCiudad(limpio) || esDepartamento(limpio)) return false;
  if (mismoNombre(limpio, ciudad)) return false;
  return true;
}

/**
 * El barrio según las migas de pan: lo que queda del camino después de sacar
 * el negocio, el tipo, la ciudad y el departamento. Si queda exactamente UNA
 * cosa, es el barrio; si quedan dos, no se adivina cuál.
 */
function barrioDeMigas(migas: string[], ciudad: string | undefined): string | undefined {
  const restantes = migas.filter((m) => plausibleComoBarrio(m, ciudad));
  return restantes.length === 1 ? restantes[0] : undefined;
}

/**
 * El barrio según el título, que los portales arman con plantilla:
 *
 *   Fincaraíz     «Apartamento en Venta en Las villas, Zipaquirá»
 *                 «Apartamento en Arriendo en Jamundí, Alfaguara»  (el <title>, al revés)
 *   Metrocuadrado «Venta de Apartamento en Bella suiza - Bogotá D.C. - 2162-M6953741»
 *   OG            «Apartamento ubicado en Jamundí, Alfaguara. Cuenta con…»
 *
 * Las dos partes después del último «en» son barrio y ciudad, en cualquier
 * orden: la que coincide con la ciudad ya leída es la ciudad, la otra es el
 * barrio. Si la ciudad no se conoce, manda el orden «Barrio, Ciudad», que es
 * el de la ficha misma (`name`) en los dos portales.
 */
function lugarDeTitulo(
  titulo: string | undefined,
  ciudad: string | undefined,
): { barrio?: string; ciudad?: string } {
  if (!titulo) return {};
  // Sin el negocio, el único «en» que queda es el del lugar: «Apartamento en
  // Venta en Las villas, Zipaquirá» → «Apartamento en Las villas, Zipaquirá».
  const sinNegocio = titulo
    .replace(/\b(?:en\s+)?(?:ventas?|arriendos?|alquiler|renta)\s+(?:de\s+)?/gi, ' ')
    .replace(/\s+/g, ' ');
  const m = sinNegocio.match(/\ben\s+([^,\-–|]{2,60}?)\s*[,\-–]\s*([^,\-–|]{2,60})/i);
  if (!m) return {};
  // El segundo tramo termina en la primera frase: «Alfaguara. Cuenta con 3
  // habitaciones» es «Alfaguara». El punto de «D.C.» no corta porque no le
  // sigue un espacio.
  const partes = [m[1].trim(), m[2].split(/\.(?=\s|$)/)[0].trim()];
  if (ciudad) {
    const i = partes.findIndex((p) => mismoNombre(p, ciudad));
    if (i === -1) return {}; // ninguna es la ciudad: no es el patrón que se cree
    const otra = partes[1 - i];
    return plausibleComoBarrio(otra, ciudad) ? { barrio: otra } : {};
  }
  // Ciudad desconocida: sólo se cree el patrón si la segunda parte ES una
  // ciudad conocida («Bella suiza - Bogotá D.C.»). Si no, podría ser
  // cualquier «en X, Y» de una frase.
  const [barrio, posibleCiudad] = partes;
  if (!esCiudad(posibleCiudad)) return {};
  return {
    // «Bogotá D.C.» se guarda como «Bogotá»: el sufijo es del portal, no de la ciudad.
    ciudad: posibleCiudad.replace(/[\s,]*\bd\.?\s*c\.?$/i, '').trim(),
    barrio: plausibleComoBarrio(barrio, posibleCiudad) ? barrio : undefined,
  };
}

/**
 * `streetAddress` con la cola de lugar recortada: Fincaraíz publica
 * «Verde Alto apartments, Carrera 27, Zipaquirá, Cundinamarca, Colombia», y
 * la ciudad, el departamento y el país ya tienen su campo. Sólo se recorta
 * desde el final y sólo lo que coincide: nada del medio se toca.
 */
function sinColaDeLugar(direccion: string, lugares: (string | undefined)[]): string {
  const partes = direccion.split(',').map((p) => p.trim()).filter(Boolean);
  const sobrantes = new Set(
    ['colombia', ...lugares.filter((l): l is string => !!l).map(normalizarNombre)],
  );
  while (partes.length > 1 && sobrantes.has(normalizarNombre(partes[partes.length - 1]))) {
    partes.pop();
  }
  return partes.join(', ');
}

/**
 * Busca `etiqueta … número` en el texto. Devuelve el número Y el fragmento,
 * porque un número sin su frase alrededor no se puede verificar.
 *
 * El hueco entre la etiqueta y el número es corto (30 caracteres) a propósito:
 * con un hueco largo, «Canon» de un párrafo agarra el precio de venta del
 * párrafo siguiente.
 */
function conEtiqueta(
  texto: string,
  etiquetas: string[],
): { fragmento: string; numero: string } | undefined {
  for (const etiqueta of etiquetas) {
    const re = new RegExp(`(${etiqueta})([^\\d$]{0,30})\\$?\\s*([\\d][\\d.,]*)`, 'i');
    const m = texto.match(re);
    if (m) return { fragmento: m[0].trim(), numero: m[3] };
  }
  return undefined;
}

/**
 * Muchos portales no sirven la foto real: la pasan por su propio proxy de
 * redimensionado — `/api/nuby/image-proxy?url=<real>&w=800&q=75`, o el de
 * Next.js, `/_next/image?url=<real>&w=…`. El wrapper es ruido: dos tamaños
 * del mismo archivo son la MISMA foto, y compararlos como strings distintos
 * duplicaría la galería. Se desenvuelve ANTES de comparar y de deduplicar.
 *
 * Es una propiedad general del patrón `?url=…`, no de un proxy en particular
 * ni de un dominio: cualquier imagen servida detrás de un parámetro `url`
 * (absoluto o relativo a la raíz) se desenvuelve igual.
 */
function desenvolverProxy(cruda: string): string {
  const m = cruda.match(/[?&]url=([^&]+)/);
  if (!m) return cruda;
  let interior: string;
  try {
    interior = decodeURIComponent(m[1]);
  } catch {
    return cruda;
  }
  // Sólo cuenta si adentro hay de verdad otra ruta — si no, `url=` podía ser
  // cualquier otro parámetro sin relación con un proxy de imágenes.
  if (/^https?:\/\//i.test(interior) || interior.startsWith('/')) return interior;
  return cruda;
}

/**
 * Nombres de archivo que casi nunca son una foto del inmueble: son el activo
 * genérico del sitio — el que Open Graph sirve cuando la ficha no tiene fotos
 * propias, el logo, el ícono. Es un patrón de NOMBRE, no de dominio: un
 * portal que sirve sus fotos reales desde su propio dominio no cae acá,
 * porque sus archivos de fotos no se llaman así.
 *
 * Caso real (T-0034): la ficha 2929 de portofinopropiedadraiz.com no tiene
 * fotos propias — es un cascarón — y lo único declarado es `og-image.png`,
 * el logo del sitio. Sin este filtro esa sería la ÚNICA imagen que se
 * importa: el logo quedaría de portada del inmueble.
 */
const NOMBRE_DE_ACTIVO_GENERICO =
  /(?:^|[-_/])(og[-_]?image|default[-_]?(?:og|share|image)|share[-_]?image|placeholder|logo|favicon|banner|avatar)(?:[-_.]|$)/i;

function esActivoGenerico(url: string): boolean {
  try {
    const nombre = new URL(url).pathname.split('/').pop() ?? '';
    return NOMBRE_DE_ACTIVO_GENERICO.test(nombre);
  } catch {
    return false;
  }
}

/** Todas las imágenes declaradas: og:image (repetible), twitter, JSON-LD. */
function imagenesDelHtml(html: string, jsonLd: Record<string, unknown>[], base: string): string[] {
  const urls: string[] = [];

  const ogs =
    html.match(/<meta\b[^>]*\b(?:property|name)\s*=\s*["']og:image(?::url)?["'][^>]*>/gi) ?? [];
  for (const etiqueta of ogs) {
    const valor = etiqueta.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (valor) urls.push(valor);
  }

  const twitter = etiquetasMeta(html).get('twitter:image');
  if (twitter) urls.push(twitter);

  for (const bloque of jsonLd) {
    const imagen = bloque.image ?? bloque.photo;
    for (const item of Array.isArray(imagen) ? imagen : [imagen]) {
      if (typeof item === 'string') urls.push(item);
      else if (item && typeof item === 'object') {
        const u = (item as Record<string, unknown>).url ?? (item as Record<string, unknown>).contentUrl;
        if (typeof u === 'string') urls.push(u);
      }
    }
  }

  // El logo/ícono/og-image genérico NUNCA es una foto del inmueble, aunque el
  // sitio lo declare como og:image — filtra ANTES de que se vuelva el ancla
  // de la que cuelga todo lo demás.
  return normalizarUrls(urls, base).filter((u) => !esActivoGenerico(u));
}

/**
 * `<img>`/`<picture><source>` que la página ya renderiza, en orden de
 * documento — `src` y cada URL del `srcSet` (el descriptor `Nw`/`Nx` no
 * importa, sólo la URL).
 */
function etiquetasImg(html: string): string[] {
  const urls: string[] = [];
  const etiquetas = html.match(/<(?:img|source)\b[^>]*>/gi) ?? [];

  for (const etiqueta of etiquetas) {
    const src = etiqueta.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) urls.push(src);

    const srcset = etiqueta.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      for (const parte of srcset.split(',')) {
        const u = parte.trim().split(/\s+/)[0];
        if (u) urls.push(u);
      }
    }
  }

  return urls.map((u) => decodificarEntidades(u.trim()));
}

function carpetaDe(u: URL): string {
  return u.pathname.slice(0, u.pathname.lastIndexOf('/') + 1);
}

/**
 * Mismo archivo salvo el número de la secuencia: separa el ÚLTIMO tramo de
 * dígitos del nombre y compara lo que queda. `foto_1.jpg` y `foto_8.jpg`
 * comparten `foto_.jpg` con el número afuera — son la misma serie. Sin
 * ningún dígito en el nombre no hay serie que probar.
 */
function mismoPatronDeArchivo(a: URL, b: URL): boolean {
  const nombreDe = (u: URL) => u.pathname.slice(u.pathname.lastIndexOf('/') + 1);
  const nombreA = nombreDe(a);
  const nombreB = nombreDe(b);
  if (nombreA === nombreB) return true;
  if (!/\d/.test(nombreA) || !/\d/.test(nombreB)) return false;
  const sinNumero = (nombre: string) => nombre.replace(/\d+(?!.*\d)/, '');
  return sinNumero(nombreA) === sinNumero(nombreB);
}

/**
 * La galería que la página RENDERIZA como `<img>`/`<picture>`, pero sólo la
 * parte que se puede probar que es del mismo inmueble que la foto declarada
 * (el ancla, ya cierta con certeza).
 *
 * ⚠️ Esto es un camino APARTE de `galeriaDelMismoInmueble` — no relaja su
 * guarda de la carpeta con id numérico (línea ~456 más abajo), que sigue
 * intacta y sigue siendo necesaria para su propio caso: un grep sobre TODO
 * el HTML crudo, sin saber si lo que encuentra es una etiqueta `<img>` de
 * verdad o un estado embebido de "similares".
 *
 * Acá la fuente ya es más angosta —sólo elementos `<img>`/`<source>` que el
 * navegador de verdad pintaría— pero portales reales embeben carruseles de
 * "similares" como `<img>` también, así que la prueba sigue haciendo falta:
 * la carpeta (una vez desenvuelto el proxy) tiene que ser la MISMA que la
 * del ancla, y el nombre de archivo tiene que compartir su patrón numerado.
 * Un logo, un avatar o el ícono del WhatsApp casi nunca cumplen ninguna de
 * las dos — y si por casualidad comparten carpeta, casi nunca comparten el
 * patrón de nombre con el ancla (que si es él mismo el activo genérico, ya
 * fue descartado antes de llegar acá).
 */
function galeriaDeImgs(html: string, declaradas: string[], base: string): string[] {
  if (declaradas.length === 0) return [];

  let anclaUrl: URL;
  try {
    anclaUrl = new URL(declaradas[0]);
  } catch {
    return [];
  }
  const carpetaAncla = carpetaDe(anclaUrl);

  const salida: string[] = [];
  for (const cruda of etiquetasImg(html)) {
    const desenvuelta = desenvolverProxy(cruda);
    let u: URL;
    try {
      u = new URL(desenvuelta, base);
    } catch {
      continue;
    }
    if (u.origin !== anclaUrl.origin) continue;
    if (carpetaDe(u) !== carpetaAncla) continue;
    if (!mismoPatronDeArchivo(anclaUrl, u)) continue;
    salida.push(u.toString());
  }
  return salida;
}

/**
 * La galería, pero sólo lo que se puede PROBAR que es de este inmueble.
 *
 * ⚠️ Medido sobre una ficha real de Ciencuadras: la página trae 93 URLs de
 * imágenes de **89 inmuebles distintos** —el carrusel de «similares» viaja
 * embebido en el estado de la página— y sólo 14 son del apartamento que se está
 * mirando. Barrer todas las imágenes del HTML le colgaría al inmueble las fotos
 * de la casa de otro. Es el peor caso de esta familia de defectos: la ficha
 * queda completa, linda, y muestra un inmueble que no es.
 *
 * La regla que sí se sostiene: la foto declarada (og:image / JSON-LD) es de
 * este inmueble con certeza. Vive en una carpeta del CDN, y esa carpeta se
 * llama como el id del inmueble — que además aparece en la URL de la ficha. Si
 * las dos cosas coinciden, lo que cuelgue de esa carpeta es del mismo inmueble.
 *
 * Si no se puede probar, no se expande: queda la portada sola. Una foto cierta
 * vale más que catorce probables.
 */
function galeriaDelMismoInmueble(
  html: string,
  declaradas: string[],
  urlPagina: string,
): string[] {
  if (declaradas.length === 0) return declaradas;

  const ancla = declaradas[0];
  const corte = ancla.lastIndexOf('/');
  if (corte < 0) return declaradas;
  const carpeta = ancla.slice(0, corte + 1);

  let identificador: string | undefined;
  try {
    const segmentos = new URL(ancla).pathname.split('/').filter(Boolean);
    identificador = segmentos[segmentos.length - 2];
  } catch {
    return declaradas;
  }

  // Sin un id numérico en la carpeta no hay nada que probar: podría ser
  // `/fotos/` y contener las imágenes de todo el portal.
  if (!identificador || !/^\d{3,}$/.test(identificador)) return declaradas;

  // Y el id tiene que estar en la URL de ESTA ficha. Ese es el vínculo.
  if (!urlPagina.includes(identificador)) return declaradas;

  const escapada = carpeta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const encontradas = html.match(new RegExp(`${escapada}[^"'\\\\\\s&<>)]+`, 'g')) ?? [];

  // El filtro de extensión va sólo sobre lo ENCONTRADO. Las declaradas ya son
  // ciertas y no tienen que ganarse el lugar: puede que ni traigan extensión.
  const extras = normalizarUrls(encontradas, urlPagina).filter((u) =>
    /\.(jpe?g|png|webp)(\?.*)?$/i.test(u),
  );

  return normalizarUrls([...declaradas, ...extras], urlPagina);
}

function videosDelHtml(html: string, jsonLd: Record<string, unknown>[], base: string): string[] {
  const urls: string[] = [];
  const meta = etiquetasMeta(html);
  for (const clave of ['og:video', 'og:video:url', 'og:video:secure_url']) {
    const v = meta.get(clave);
    if (v) urls.push(v);
  }
  for (const bloque of jsonLd) {
    const video = bloque.video ?? (bloque['@type'] === 'VideoObject' ? bloque : null);
    for (const item of Array.isArray(video) ? video : [video]) {
      if (typeof item === 'string') urls.push(item);
      else if (item && typeof item === 'object') {
        const u =
          (item as Record<string, unknown>).contentUrl ??
          (item as Record<string, unknown>).embedUrl ??
          (item as Record<string, unknown>).url;
        if (typeof u === 'string') urls.push(u);
      }
    }
  }
  return normalizarUrls(urls, base);
}

function normalizarUrls(urls: string[], base: string): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const cruda of urls) {
    let absoluta: string;
    try {
      const desenvuelta = desenvolverProxy(decodificarEntidades(cruda.trim()));
      absoluta = new URL(desenvuelta, base).toString();
    } catch {
      continue;
    }
    if (!/^https?:/.test(absoluta) || vistas.has(absoluta)) continue;
    vistas.add(absoluta);
    salida.push(absoluta);
  }
  return salida;
}

/**
 * Lee la ficha. Función pura: recibe el HTML y la URL, no toca la red.
 */
export function leerInmuebleDeHtml(html: string, url: string): InmuebleDesdeEnlace {
  const meta = etiquetasMeta(html);
  const jsonLd = bloquesJsonLd(html);
  const texto = textoVisible(html);

  const declaradas = imagenesDelHtml(html, jsonLd, url);
  const leido: InmuebleDesdeEnlace = {
    url,
    // Dos caminos que se complementan y no se pisan: el whitelist por
    // carpeta+id de `galeriaDelMismoInmueble` (sin tocar su guarda), y la
    // galería que la página ya renderiza como <img>, probada por patrón de
    // nombre de archivo (Slice A, T-0034 WU-1). La portada declarada va
    // primero en los dos, así que queda primera acá también.
    imagenes: normalizarUrls(
      [...galeriaDelMismoInmueble(html, declaradas, url), ...galeriaDeImgs(html, declaradas, url)],
      url,
    ),
    videos: videosDelHtml(html, jsonLd, url),
  };

  // ── 1. JSON-LD: lo que el sitio declara como dato ───────────────────────
  // El precio se guarda aparte hasta saber el negocio: `price` no dice si es
  // un canon o un precio de venta, y asignarlo a ciegas es el defecto de
  // arriba (dos ventas de Fincaraíz entraron como arriendos de $420.000.000).
  let precioDeclarado: DatoLeido<number> | undefined;

  for (const bloque of jsonLd) {
    const conFuente = <T>(valor: T | undefined, campo: string): DatoLeido<T> | undefined =>
      valor === undefined ? undefined : { valor, fuente: 'json-ld', textoOriginal: campo };

    leido.titulo ??= conFuente(comoTexto(bloque.name), 'name');
    leido.descripcion ??= conFuente(comoTexto(bloque.description), 'description');
    precioDeclarado ??= conFuente(comoDinero(bloque.price), 'price');
    leido.area ??= conFuente(comoMedida(bloque.floorSize), 'floorSize');
    leido.habitaciones ??= conFuente(
      comoEntero(bloque.numberOfBedrooms ?? bloque.numberOfRooms),
      'numberOfBedrooms',
    );
    leido.banos ??= conFuente(
      comoEntero(bloque.numberOfBathroomsTotal ?? bloque.numberOfBathrooms),
      'numberOfBathrooms',
    );

    const direccion = bloque.address;
    if (direccion && typeof direccion === 'object') {
      const d = direccion as Record<string, unknown>;
      leido.direccion ??= conFuente(comoTexto(d.streetAddress), 'address.streetAddress');

      const localidad = comoTexto(d.addressLocality);
      const region = comoTexto(d.addressRegion);

      // Cuál de los dos es la ciudad se decide mirando el VALOR, no el nombre
      // del campo. El otro, SI ES PLAUSIBLE que sea un barrio, es el barrio —
      // un departamento (`esDepartamento`) nunca lo es (T-0030 WU-3: una
      // ficha real con addressRegion="Antioquia" dejaba
      // `neighborhood: "Antioquia"` sin esta guarda).
      if (esCiudad(region) && !esCiudad(localidad)) {
        leido.ciudad ??= conFuente(region, 'address.addressRegion');
        if (!esDepartamento(localidad)) leido.barrio ??= conFuente(localidad, 'address.addressLocality');
      } else {
        leido.ciudad ??= conFuente(localidad, 'address.addressLocality');
        if (!esCiudad(region) && !esDepartamento(region)) {
          leido.barrio ??= conFuente(region, 'address.addressRegion');
        }
      }

      // Cuando `addressRegion` es un departamento de verdad, es EL
      // departamento — con la grafía que el back acepta, no la del portal.
      leido.departamento ??= conFuente(
        departamentoCanonico(region) ?? departamentoCanonico(localidad),
        'address.addressRegion',
      );
    } else if (typeof direccion === 'string') {
      leido.direccion ??= conFuente(direccion.trim(), 'address');
    }

    const tipoDeclarado = comoTexto(bloque['@type']);
    if (tipoDeclarado) {
      leido.tipo ??= (() => {
        const clave = tipoDeInmueble(tipoDeclarado);
        return clave ? { valor: clave, fuente: 'json-ld' as const, textoOriginal: tipoDeclarado } : undefined;
      })();
    }
  }

  // ── 2. Open Graph: rotulado, pero sólo título, descripción e imágenes ────
  const ogTitulo = meta.get('og:title');
  if (ogTitulo) {
    leido.titulo ??= { valor: ogTitulo, fuente: 'open-graph', textoOriginal: 'og:title' };
  }
  const ogDescripcion = meta.get('og:description') ?? meta.get('description');
  if (ogDescripcion) {
    leido.descripcion ??= {
      valor: ogDescripcion,
      fuente: 'open-graph',
      textoOriginal: meta.has('og:description') ? 'og:description' : 'meta description',
    };
  }

  const tituloHtml = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (tituloHtml?.trim()) {
    leido.titulo ??= {
      valor: decodificarEntidades(tituloHtml.trim()),
      fuente: 'titulo-html',
      textoOriginal: '<title>',
    };
  }

  // ── El negocio, y con él a qué campo va el precio declarado ─────────────
  const migas = migasDePan(html);
  const tituloOg = ogTitulo
    ? { valor: ogTitulo, fuente: 'open-graph' as const, textoOriginal: 'og:title' }
    : undefined;
  const tituloDePagina = tituloHtml?.trim()
    ? { valor: decodificarEntidades(tituloHtml.trim()), fuente: 'titulo-html' as const, textoOriginal: '<title>' }
    : undefined;
  leido.negocio = negocioDe(migas, url, [leido.titulo, tituloOg, tituloDePagina]);

  if (precioDeclarado) {
    if (leido.negocio?.valor === 'venta') leido.precioVenta = precioDeclarado;
    else leido.canon = precioDeclarado;
  }

  // ── 3. Texto, siempre con la etiqueta al lado ───────────────────────────
  // El corpus es el texto visible más lo que ya se leyó: en muchas fichas los
  // metros y las alcobas viven en la descripción de Open Graph, no en el body.
  const corpus = [texto, leido.descripcion?.valor, leido.titulo?.valor]
    .filter(Boolean)
    .join(' · ');

  const esVenta = leido.negocio?.valor === 'venta';

  if (esVenta && !leido.precioVenta) {
    const hallado = conEtiqueta(corpus, ['precio de venta', 'valor de venta', 'venta', 'precio']);
    const valor = hallado ? dineroColombiano(hallado.numero) : undefined;
    // El mismo piso que exige el back para una venta (≥ 1.000.000): «venta 3»
    // de una frase suelta no es un precio.
    if (valor && valor >= 1_000_000) {
      leido.precioVenta = { valor, fuente: 'texto', textoOriginal: hallado!.fragmento };
    }
  }

  // En una venta NO se busca canon en la prosa: «arriendo $2.500.000» en un
  // aviso de venta es lo que paga el inquilino actual, no lo que se ofrece.
  if (!esVenta && !leido.canon) {
    const hallado = conEtiqueta(corpus, [
      'canon de arrendamiento',
      'canon mensual',
      'canon',
      'valor arriendo',
      'precio de arriendo',
      'arriendo',
      'alquiler',
    ]);
    const valor = hallado ? dineroColombiano(hallado.numero) : undefined;
    // Piso de cordura: el back exige ≥ 100.000, y un «arriendo 3» de una frase
    // suelta no es un canon. Sin esto el texto mete ruido con cara de dato.
    if (valor && valor >= 100_000) {
      leido.canon = { valor, fuente: 'texto', textoOriginal: hallado!.fragmento };
    }
  }

  if (!leido.administracion) {
    const hallado = conEtiqueta(corpus, ['administración', 'administracion', 'adm\\.']);
    const valor = hallado ? dineroColombiano(hallado.numero) : undefined;
    if (valor && valor >= 1_000) {
      leido.administracion = { valor, fuente: 'texto', textoOriginal: hallado!.fragmento };
    }
  }

  if (!leido.area) {
    const m = corpus.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts2|mts²|metros cuadrados)\b/i);
    const valor = m ? medidaColombiana(m[1]) : undefined;
    if (valor) leido.area = { valor, fuente: 'texto', textoOriginal: m![0].trim() };
  }

  if (!leido.habitaciones) {
    // El decimal se captura para NO dejarlo suelto: sin él, «2.5 alcobas»
    // haría que `\d+` enganche el «5» y devuelva cinco habitaciones.
    const m = corpus.match(
      /(\d+(?:[.,]\d+)?)\s*(?:habitaciones?|alcobas?|dormitorios?|cuartos?|hab\b)/i,
    );
    const valor = m ? Math.floor(Number(m[1].replace(',', '.'))) : undefined;
    if (valor !== undefined && valor >= 0 && valor <= 20) {
      leido.habitaciones = { valor, fuente: 'texto', textoOriginal: m![0].trim() };
    }
  }

  if (!leido.banos) {
    const m = corpus.match(/(\d+(?:[.,]\d+)?)\s*(?:baños?|banos?)\b/i);
    const valor = m ? Math.floor(Number(m[1].replace(',', '.'))) : undefined;
    if (valor !== undefined && valor >= 1 && valor <= 10) {
      leido.banos = { valor, fuente: 'texto', textoOriginal: m![0].trim() };
    }
  }

  if (!leido.tipo) {
    const desde = leido.titulo?.valor ?? texto.slice(0, 400);
    const clave = tipoDeInmueble(desde);
    if (clave) leido.tipo = { valor: clave, fuente: 'texto', textoOriginal: desde.slice(0, 80) };
  }

  // ── Barrio: los portales lo ponen en el camino y en el título, no en la
  // dirección estructurada. Medido en Fincaraíz: `addressLocality` es la
  // ciudad y `addressRegion` el departamento; «Las villas» sólo está en las
  // migas de pan, en el `name` y en la descripción de Open Graph.
  if (!leido.barrio) {
    const deMigas = barrioDeMigas(migas, leido.ciudad?.valor);
    if (deMigas) {
      leido.barrio = { valor: deMigas, fuente: 'json-ld', textoOriginal: `BreadcrumbList: ${deMigas}` };
    } else {
      for (const titulo of [leido.titulo, tituloOg, tituloDePagina, leido.descripcion]) {
        if (!titulo) continue;
        const lugar = lugarDeTitulo(titulo.valor, leido.ciudad?.valor);
        const conFuente = (valor: string): DatoLeido<string> => ({
          valor,
          fuente: titulo.fuente,
          textoOriginal: titulo.valor.slice(0, 80),
        });
        // La ciudad del título sólo cuando ningún dato rotulado la trajo.
        if (lugar.ciudad && !leido.ciudad) leido.ciudad = conFuente(lugar.ciudad);
        if (lugar.barrio) {
          leido.barrio = conFuente(lugar.barrio);
          break;
        }
      }
    }
  }

  if (!leido.barrio) {
    const m = corpus.match(/\bbarrio\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.\-]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.\-]*){0,2})/);
    if (m) leido.barrio = { valor: m[1].trim(), fuente: 'texto', textoOriginal: m[0].trim() };
  }

  // ⚠️ Sólo en la descripción y el título del inmueble, NUNCA en el texto
  // suelto de la página: el pie de página trae la dirección de la
  // inmobiliaria, y meterla acá sería ponerle al inmueble la casa de otro.
  // Los dos intentos de abajo (dirección exacta y referencia) comparten esta
  // misma fuente por la misma razón.
  const propio = [leido.titulo?.valor, leido.descripcion?.valor].filter(Boolean).join(' · ');

  if (!leido.direccion) {
    const m = propio.match(DIRECCION_COLOMBIANA);
    if (m) {
      leido.direccion = {
        valor: m[0].replace(/\s+/g, ' ').trim(),
        fuente: 'texto',
        textoOriginal: m[0].trim(),
      };
    }
  }

  // ── Sin dirección exacta: la cadena de resguardo del dueño del producto ──
  // «si no hay dirección exacta pone una referencia si la propiedad la tiene
  // o al menos el municipio donde se encuentre» — nunca bloquear el import
  // por esto, pero la fila SIGUE necesitando poder corregirse, así que se
  // marca `direccionAproximada` en los dos casos de abajo.
  if (!leido.direccion) {
    const referencia = referenciaLocacional(propio);
    if (referencia) {
      leido.direccion = { valor: referencia, fuente: 'texto', textoOriginal: referencia };
      leido.direccionAproximada = true;
    } else if (leido.ciudad?.valor) {
      leido.direccion = {
        valor: leido.ciudad.valor,
        fuente: leido.ciudad.fuente,
        textoOriginal: 'municipio (el portal no publica dirección ni referencia)',
      };
      leido.direccionAproximada = true;
    }
  }

  // La ciudad, el departamento y el país ya tienen campo: en la dirección
  // son cola. Sólo a la dirección declarada — una referencia («cerca al
  // parque») o el municipio de resguardo no tienen cola que recortar.
  if (leido.direccion && !leido.direccionAproximada) {
    const recortada = sinColaDeLugar(leido.direccion.valor, [
      leido.ciudad?.valor,
      leido.departamento?.valor,
    ]);
    if (recortada && recortada !== leido.direccion.valor) {
      leido.direccion = { ...leido.direccion, valor: recortada };
    }
  }

  return leido;
}

/**
 * Los campos que el back exige y esta lectura no consiguió.
 * Se muestran ANTES de importar: el área de un inmueble es un dato, no una
 * suposición, y descubrirlo al final es lo que ya nos pasó una vez.
 */
export function loQueFalta(leido: InmuebleDesdeEnlace): string[] {
  const faltan: string[] = [];
  if (!leido.direccion) faltan.push('dirección');
  if (!leido.ciudad) faltan.push('ciudad');
  if (leido.negocio?.valor === 'venta') {
    if (!leido.precioVenta || leido.precioVenta.valor < 1_000_000) faltan.push('precio de venta');
  } else if (!leido.canon || leido.canon.valor < 100_000) {
    faltan.push('canon');
  }
  if (!leido.area || leido.area.valor < 10) faltan.push('área');
  if (!leido.banos || leido.banos.valor < 1) faltan.push('baños');
  return faltan;
}
