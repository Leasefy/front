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
 */

export type FuenteDelDato = 'json-ld' | 'open-graph' | 'texto' | 'titulo-html';

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
  tipo?: DatoLeido<string>;
  canon?: DatoLeido<number>;
  administracion?: DatoLeido<number>;
  area?: DatoLeido<number>;
  habitaciones?: DatoLeido<number>;
  banos?: DatoLeido<number>;
  /** URLs absolutas, sin repetidos, en el orden en que aparecen. */
  imagenes: string[];
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

/** Todos los bloques `application/ld+json`, aplanando `@graph` y arreglos. */
export function bloquesJsonLd(html: string): Record<string, unknown>[] {
  const bloques: Record<string, unknown>[] = [];
  const scripts =
    html.match(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? [];

  for (const script of scripts) {
    const cuerpo = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    let datos: unknown;
    try {
      datos = JSON.parse(cuerpo.trim());
    } catch {
      continue; // Un JSON-LD roto no invalida la página.
    }
    aplanar(datos, bloques);
  }

  return bloques;
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
 * Los 32 departamentos de Colombia (+ Bogotá D.C., aunque esa ya está en
 * CIUDADES). Existe para el mismo motivo que CIUDADES pero al revés: un valor
 * que ES un departamento NUNCA es plausible como barrio, y antes de esto se
 * asignaba igual — T-0030 WU-3, defecto real: una ficha con
 * `addressRegion: "Antioquia"` + `addressLocality: "Itagüí"` dejaba
 * `neighborhood: "Antioquia"` en el inmueble creado.
 */
const DEPARTAMENTOS = new Set(
  [
    'amazonas', 'antioquia', 'arauca', 'atlantico', 'bolivar', 'boyaca',
    'caldas', 'caqueta', 'casanare', 'cauca', 'cesar', 'choco', 'cordoba',
    'cundinamarca', 'guainia', 'guaviare', 'huila', 'la guajira', 'magdalena',
    'meta', 'narino', 'norte de santander', 'putumayo', 'quindio',
    'risaralda', 'san andres y providencia', 'santander', 'sucre', 'tolima',
    'valle del cauca', 'vaupes', 'vichada',
  ],
);

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
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

  return normalizarUrls(urls, base);
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
      absoluta = new URL(decodificarEntidades(cruda.trim()), base).toString();
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

  const leido: InmuebleDesdeEnlace = {
    url,
    imagenes: galeriaDelMismoInmueble(html, imagenesDelHtml(html, jsonLd, url), url),
    videos: videosDelHtml(html, jsonLd, url),
  };

  // ── 1. JSON-LD: lo que el sitio declara como dato ───────────────────────
  for (const bloque of jsonLd) {
    const conFuente = <T>(valor: T | undefined, campo: string): DatoLeido<T> | undefined =>
      valor === undefined ? undefined : { valor, fuente: 'json-ld', textoOriginal: campo };

    leido.titulo ??= conFuente(comoTexto(bloque.name), 'name');
    leido.descripcion ??= conFuente(comoTexto(bloque.description), 'description');
    leido.canon ??= conFuente(comoDinero(bloque.price), 'price');
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

  // ── 3. Texto, siempre con la etiqueta al lado ───────────────────────────
  // El corpus es el texto visible más lo que ya se leyó: en muchas fichas los
  // metros y las alcobas viven en la descripción de Open Graph, no en el body.
  const corpus = [texto, leido.descripcion?.valor, leido.titulo?.valor]
    .filter(Boolean)
    .join(' · ');

  if (!leido.canon) {
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

  if (!leido.direccion) {
    // ⚠️ Sólo en la descripción y el título del inmueble, NUNCA en el texto
    // suelto de la página: el pie de página trae la dirección de la
    // inmobiliaria, y meterla acá sería ponerle al inmueble la casa de otro.
    const propio = [leido.titulo?.valor, leido.descripcion?.valor].filter(Boolean).join(' · ');
    const m = propio.match(DIRECCION_COLOMBIANA);
    if (m) {
      leido.direccion = {
        valor: m[0].replace(/\s+/g, ' ').trim(),
        fuente: 'texto',
        textoOriginal: m[0].trim(),
      };
    }
  }

  if (!leido.barrio) {
    const m = corpus.match(/\bbarrio\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.\-]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.\-]*){0,2})/);
    if (m) leido.barrio = { valor: m[1].trim(), fuente: 'texto', textoOriginal: m[0].trim() };
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
  if (!leido.canon || leido.canon.valor < 100_000) faltan.push('canon');
  if (!leido.area || leido.area.valor < 10) faltan.push('área');
  if (!leido.banos || leido.banos.valor < 1) faltan.push('baños');
  return faltan;
}
