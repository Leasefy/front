/**
 * El publicador rápido (Juan y Nico, 19-10-2026: «que pueda publicar muy rápido
 * uno o muchos, que se sienta rápido»). Lo puro: el inmueble que se está
 * llenando, qué le falta para publicarse, su título y cómo se guarda en el
 * navegador mientras la persona escribe. Las fotos viven aparte, en
 * IndexedDB (`fotos-guardadas.ts`): son archivos y no caben en localStorage.
 *
 * Escala (Nico, 20-10-2026: «si llegan a ser muchísimos inmuebles, ¿cómo
 * escala esto?»): un inmueble puede llegar de un enlace, de una fila de Excel
 * o de una carpeta de fotos, y cada uno lleva su LLAVE anti-duplicados para
 * que publicar dos veces (un reintento, una pestaña que se cerró a mitad)
 * nunca cree dos inmuebles.
 */

import type { ImportProperty } from '@/components/inmobiliaria/import/lib/importTypes';
import { tipoEfectivo } from '@/components/inmobiliaria/import/lib/requisitosDelBack';

export type Operacion = 'rent' | 'sale';

export type TipoRapido = 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'COMMERCIAL' | 'OFFICE' | 'WAREHOUSE';

export const TIPOS: { valor: TipoRapido; nombre: string }[] = [
  { valor: 'APARTMENT', nombre: 'Apartamento' },
  { valor: 'HOUSE', nombre: 'Casa' },
  { valor: 'STUDIO', nombre: 'Apartaestudio' },
  { valor: 'ROOM', nombre: 'Habitación' },
  { valor: 'COMMERCIAL', nombre: 'Local' },
  { valor: 'OFFICE', nombre: 'Oficina' },
  { valor: 'WAREHOUSE', nombre: 'Bodega' },
];

/** De dónde salió la tarjeta, para que la persona sepa a qué mirarle la cara. */
export interface OrigenDelInmueble {
  tipo: 'enlace' | 'excel' | 'carpeta';
  /** «fincaraiz.com.co», «Fila 12», «Laureles 302». */
  etiqueta: string;
  url?: string;
}

export interface InmuebleRapido {
  /** Sólo de la pantalla: identifica la tarjeta. */
  clave: string;
  /**
   * La llave anti-duplicados (`Idempotency-Key` de `POST /properties`). Nace
   * con la tarjeta y NUNCA cambia: si la pestaña se cierra justo después de
   * crear el inmueble, publicar otra vez devuelve el mismo, no uno nuevo.
   */
  llave: string;
  operacion: Operacion;
  tipo: TipoRapido | null;
  direccion: string;
  ciudad: string;
  barrio: string;
  latitud?: number;
  longitud?: number;
  /**
   * Qué tan bien quedó en el mapa (`ubicarDireccion`, la regla del importador
   * del panel): la dirección exacta, sólo el municipio, o no se encontró.
   * Ausente = todavía no se buscó.
   */
  ubicado?: 'direccion' | 'municipio' | 'ninguna';
  /** Pesos, sin puntos. `null` = no lo ha escrito. */
  precio: number | null;
  habitaciones: number | null;
  banos: number | null;
  area: number | null;
  descripcion: string;
  /** El código de la inmobiliaria (columna «Código» del Excel): acomoda las carpetas de fotos. */
  codigo?: string;
  origen?: OrigenDelInmueble;
  /** El id del inmueble ya creado: publicar de nuevo sólo sube las fotos que falten. */
  idCreado?: string;
}

/** Una llave de 8 a 64 caracteres `[A-Za-z0-9-]`, como la pide el back. */
export function nuevaLlave(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function inmuebleVacio(clave: string, base?: Partial<InmuebleRapido>): InmuebleRapido {
  return {
    clave,
    llave: nuevaLlave(),
    operacion: base?.operacion ?? 'rent',
    tipo: base?.tipo ?? null,
    direccion: '',
    ciudad: base?.ciudad ?? '',
    barrio: '',
    precio: null,
    habitaciones: null,
    banos: null,
    area: null,
    descripcion: '',
  };
}

export type CampoQueFalta = 'tipo' | 'direccion' | 'ciudad' | 'precio' | 'fotos';

const FRASES: Record<CampoQueFalta, string> = {
  tipo: 'el tipo',
  direccion: 'la dirección',
  ciudad: 'la ciudad',
  precio: 'el precio',
  fotos: 'al menos una foto',
};

/** Lo que le falta para publicarse, en el orden en que se llena la tarjeta. */
export function loQueFalta(i: InmuebleRapido, fotos: number): CampoQueFalta[] {
  const faltan: CampoQueFalta[] = [];
  if (fotos < 1) faltan.push('fotos');
  if (!i.tipo) faltan.push('tipo');
  if (!i.direccion.trim()) faltan.push('direccion');
  if (!i.ciudad.trim()) faltan.push('ciudad');
  if (!i.precio || i.precio <= 0) faltan.push('precio');
  return faltan;
}

/** «Falta la dirección y el precio.» */
export function fraseDeLoQueFalta(faltan: CampoQueFalta[]): string {
  if (faltan.length === 0) return 'Listo para publicar.';
  const partes = faltan.map((f) => FRASES[f]);
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
  return `Falta ${lista}.`;
}

/** «Apartamento en arriendo en Laureles, 3 habitaciones»: lo que dice la tarjeta del marketplace. */
export function tituloDe(i: InmuebleRapido): string {
  const tipo = TIPOS.find((t) => t.valor === i.tipo)?.nombre ?? 'Inmueble';
  const operacion = i.operacion === 'sale' ? 'en venta' : 'en arriendo';
  const donde = i.barrio.trim() || i.ciudad.trim();
  const habs =
    i.habitaciones && i.habitaciones > 0 && i.tipo !== 'ROOM'
      ? `, ${i.habitaciones} ${i.habitaciones === 1 ? 'habitación' : 'habitaciones'}`
      : '';
  return `${tipo} ${operacion}${donde ? ` en ${donde}` : ''}${habs}`.slice(0, 200);
}

/** Lo que va a `POST /properties`. El estado AVAILABLE + en el marketplace: es publicar. */
export function paraCrear(i: InmuebleRapido) {
  const venta = i.operacion === 'sale';
  return {
    title: tituloDe(i),
    ...(i.descripcion.trim().length >= 20 ? { description: i.descripcion.trim() } : {}),
    type: i.tipo as string,
    city: i.ciudad.trim(),
    neighborhood: i.barrio.trim() || null,
    address: i.direccion.trim(),
    listingType: venta ? ('sale' as const) : ('rent' as const),
    monthlyRent: venta ? null : i.precio,
    ...(venta ? { salePrice: i.precio } : {}),
    bedrooms: i.habitaciones,
    bathrooms: i.banos,
    area: i.area,
    ...(i.latitud != null && i.longitud != null ? { latitude: i.latitud, longitude: i.longitud } : {}),
    status: 'AVAILABLE',
    publicadoEnMarketplace: true,
  };
}

// ── El tipo, desde lo que escribió la persona o el portal ───────────────────

/** Sin tildes, en minúscula, con un espacio entre palabras. */
export function plegar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/*
 * El mismo vocabulario que el back usa para leer el tipo de una fila
 * (`inmuebles-importacion/tipo-de-las-filas-sin-tipo.ts`), más los nombres en
 * inglés que traen los portales. El orden decide: «apartaestudio» antes que
 * «apartamento». Lo que no se reconoce (lote, parqueadero, finca) queda sin
 * tipo y la tarjeta lo pide: nunca se inventa un apartamento.
 */
const PALABRAS_DEL_TIPO: ReadonlyArray<[TipoRapido, RegExp]> = [
  [
    'STUDIO',
    /\b(apartaestudios?|aptoestudios?|aparta estudios?|apartamento estudio|studio|estudio|loft)\b/,
  ],
  ['APARTMENT', /\b(aptos?|apartamentos?|apt|aparta|apartment|penthouse|duplex)\b/],
  ['HOUSE', /\b(casas?|house|casalote)\b/],
  ['COMMERCIAL', /\b(local(es)?|commercial|consultorios?)\b/],
  ['OFFICE', /\b(oficinas?|ofic|office)\b/],
  ['WAREHOUSE', /\b(bodegas?|warehouse)\b/],
  ['ROOM', /\b(habitacion(es)?|hab|cuartos?|room)\b/],
];

const TIPOS_DEL_BACK = new Set<string>(TIPOS.map((t) => t.valor));

export function tipoDesdeTexto(texto: string | null | undefined): TipoRapido | null {
  if (!texto) return null;
  const crudo = texto.trim().toUpperCase();
  if (TIPOS_DEL_BACK.has(crudo)) return crudo as TipoRapido;
  const t = plegar(texto);
  for (const [tipo, patron] of PALABRAS_DEL_TIPO) if (patron.test(t)) return tipo;
  return null;
}

// ── Una fila de Excel o un enlace, vuelto tarjeta ───────────────────────────

/** Las URLs de una celda «Fotos» (separadas por coma, punto y coma, espacio o salto de línea). */
export function fotosDeLaCelda(celda: string | null | undefined): string[] {
  if (!celda) return [];
  const vistas = new Set<string>();
  for (const pedazo of celda.split(/[\s,;|]+/)) {
    const url = pedazo.trim();
    if (/^https?:\/\/\S+$/i.test(url)) vistas.add(url);
  }
  return [...vistas];
}

function numeroPositivo(n: number | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
}

function enteroHasta(n: number | undefined, max: number): number | null {
  const v = numeroPositivo(n);
  return v === null ? null : Math.min(Math.round(v), max);
}

/**
 * Lo que leyó el lector de Excel o el de enlaces (el MISMO del panel,
 * `ImportProperty`) en el formato del publicador. Nada se inventa: lo que la
 * fila no trae queda vacío y la tarjeta lo pide.
 */
export function desdeImportProperty(
  p: ImportProperty,
  clave: string,
  origen?: OrigenDelInmueble,
): { inmueble: InmuebleRapido; fotos: string[] } {
  const operacion = tipoEfectivo(p);
  const precio = operacion === 'sale' ? numeroPositivo(p.salePrice) : numeroPositivo(p.monthlyRent);
  const inmueble: InmuebleRapido = {
    ...inmuebleVacio(clave),
    operacion,
    tipo: tipoDesdeTexto(p.propertyType),
    direccion: (p.propertyAddress ?? '').trim().slice(0, 300),
    ciudad: (p.propertyCity ?? '').trim().slice(0, 50),
    barrio: (p.propertyZone ?? '').trim().slice(0, 100),
    precio: precio === null ? null : Math.min(Math.round(precio), 2_000_000_000),
    habitaciones: enteroHasta(p.bedrooms, 20),
    banos: enteroHasta(p.bathrooms, 20),
    area: enteroHasta(p.propertyArea, 100_000),
    descripcion: (p.notes ?? '').trim().slice(0, 5000),
    ...(p.externalId?.trim() ? { codigo: p.externalId.trim() } : {}),
    ...(origen ? { origen } : {}),
  };
  const fotos = p.imagenes?.length ? p.imagenes : fotosDeLaCelda(p.fotos);
  return { inmueble, fotos: fotos.slice(0, MAX_FOTOS) };
}

/** Cuántas fotos se suben por inmueble en el publicador (el back acepta 40). */
export const MAX_FOTOS = 20;

/**
 * Cuántos inmuebles caben en una pasada del publicador. Más que eso no cabe
 * cómodo en una pestaña (fotos en memoria, una lista que nadie revisa): se
 * publican estos y se trae el resto después.
 */
export const MAX_INMUEBLES = 500;

// ── Direcciones repetidas ───────────────────────────────────────────────────

const PALABRAS_DE_LA_DIRECCION: Record<string, string> = {
  carrera: 'cr', cra: 'cr', kr: 'cr', kra: 'cr', cr: 'cr', carr: 'cr',
  calle: 'cl', cll: 'cl', cl: 'cl', call: 'cl',
  avenida: 'av', av: 'av', avda: 'av',
  transversal: 'tv', tv: 'tv', trans: 'tv', tr: 'tv',
  diagonal: 'dg', dg: 'dg', diag: 'dg',
  circular: 'cq', cq: 'cq', circ: 'cq',
  apartamento: 'ap', apto: 'ap', apt: 'ap', ap: 'ap',
  interior: 'in', int: 'in',
  torre: 'to', to: 'to', tor: 'to',
  casa: 'ca',
  numero: '', no: '', nro: '', n: '',
};

/** La dirección reducida a lo que la distingue: «Cra. 76 #34-21, apto 301» = «carrera 76 34 21 apartamento 301». */
export function llaveDeDireccion(direccion: string, ciudad = ''): string | null {
  const palabras = plegar(direccion)
    .split(' ')
    .map((p) => (p in PALABRAS_DE_LA_DIRECCION ? PALABRAS_DE_LA_DIRECCION[p] : p))
    .filter(Boolean);
  if (palabras.length < 2 || !palabras.some((p) => /\d/.test(p))) return null;
  return `${plegar(ciudad)}|${palabras.join(' ')}`;
}

/**
 * Cada tarjeta cuya dirección ya está en otra anterior, con el número de esa
 * otra (1-based). Sólo AVISA: dos apartamentos del mismo edificio sin el
 * número del apartamento se ven iguales, y la persona sabe cuál es cuál.
 */
export function direccionesRepetidas(inmuebles: InmuebleRapido[]): Map<string, number> {
  const primera = new Map<string, number>();
  const repetidas = new Map<string, number>();
  inmuebles.forEach((i, n) => {
    const llave = llaveDeDireccion(i.direccion, i.ciudad);
    if (!llave) return;
    const antes = primera.get(llave);
    if (antes === undefined) primera.set(llave, n + 1);
    else repetidas.set(i.clave, antes);
  });
  return repetidas;
}

// ── Lo que se guarda en el navegador mientras escribe ────────────────────────

const CLAVE = 'leasefy.publica.borrador.v1';

export function guardarBorrador(usuario: string, inmuebles: InmuebleRapido[]): void {
  try {
    window.localStorage.setItem(`${CLAVE}:${usuario}`, JSON.stringify({ inmuebles, guardado: Date.now() }));
  } catch {
    // Sin almacenamiento (privado, lleno): se sigue sin guardar.
  }
}

export function leerBorrador(usuario: string): InmuebleRapido[] | null {
  try {
    const crudo = window.localStorage.getItem(`${CLAVE}:${usuario}`);
    if (!crudo) return null;
    const { inmuebles } = JSON.parse(crudo) as { inmuebles?: unknown };
    if (!Array.isArray(inmuebles) || inmuebles.length === 0) return null;
    // Un borrador de antes de la llave anti-duplicados recibe la suya.
    return (inmuebles as InmuebleRapido[]).map((i) => (i.llave ? i : { ...i, llave: nuevaLlave() }));
  } catch {
    return null;
  }
}

export function borrarBorrador(usuario: string): void {
  try {
    window.localStorage.removeItem(`${CLAVE}:${usuario}`);
  } catch {
    // nada
  }
}
