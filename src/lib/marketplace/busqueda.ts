/**
 * ══ LA BÚSQUEDA DEL MARKETPLACE (Nico, 09-10-2026) ═════════════════════════
 *
 * «El mejor marketplace posible»: la conversación ESCRIBE los filtros, y los
 * filtros son la dirección de la página. Este archivo es esa idea, pura (sin
 * React): leer y escribir la URL, convertir lo que el back entendió del texto
 * (`meta.filtrosEntendidos`) en pastillas que se editan, quitar una, y decir
 * por qué un inmueble sale en la lista.
 *
 * Dos formas de una misma búsqueda:
 *   · con `q`: el texto todavía no pasó a pastillas; el back lo entiende en
 *     cada consulta y devuelve qué entendió;
 *   · sin `q`: todo son filtros explícitos.
 * Tocar una pastilla «absorbe» lo entendido: el texto se vuelve filtros
 * (`absorber`) y desde ahí manda la URL. Así una búsqueda compartida dice
 * exactamente lo que se ve.
 */
import { formatCurrency } from '@/lib/format';
import type { PropertyFiltersParams } from '@/lib/api/properties.types';
import type { Property, PropertyType } from '@/lib/types/property';

export type Operacion = 'arriendo' | 'venta';
export type TipoDeLaApi = 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'COMMERCIAL' | 'OFFICE' | 'WAREHOUSE';

export interface Busqueda {
  /** El texto que escribió la persona y todavía no pasó a pastillas. */
  q?: string;
  operacion?: Operacion;
  ciudad?: string;
  barrio?: string;
  tipo?: TipoDeLaApi;
  /** Exacto: el back filtra `bedrooms = n`. */
  habitaciones?: number;
  banos?: number;
  /** Mínimo de parqueaderos. */
  parqueaderos?: number;
  /** Canon (arriendo) o precio (venta). */
  desde?: number;
  hasta?: number;
  estrato?: number;
  areaMin?: number;
  areaMax?: number;
  /** Ids de la API: `pets`, `pool`… */
  comodidades?: string[];
  /** Palabras que no son un filtro: se buscan en título, barrio y dirección. */
  texto?: string;
}

/** `meta.filtrosEntendidos` del back: lo que el texto puso, con los nombres de la API. */
export interface FiltrosEntendidos {
  listingType?: 'RENT' | 'SALE';
  propertyType?: string;
  city?: string;
  neighborhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  stratum?: number;
  floor?: number;
  amenities?: string[];
  textoLibre?: string;
}

// ── Vocabulario de la URL ──────────────────────────────────────────────────

const TIPOS: readonly { api: TipoDeLaApi; url: string; nombre: string; plural: string }[] = [
  { api: 'APARTMENT', url: 'apartamento', nombre: 'Apartamento', plural: 'Apartamentos' },
  { api: 'HOUSE', url: 'casa', nombre: 'Casa', plural: 'Casas' },
  { api: 'STUDIO', url: 'apartaestudio', nombre: 'Apartaestudio', plural: 'Apartaestudios' },
  { api: 'ROOM', url: 'habitacion', nombre: 'Habitación', plural: 'Habitaciones' },
  { api: 'COMMERCIAL', url: 'local', nombre: 'Local', plural: 'Locales' },
  { api: 'OFFICE', url: 'oficina', nombre: 'Oficina', plural: 'Oficinas' },
  { api: 'WAREHOUSE', url: 'bodega', nombre: 'Bodega', plural: 'Bodegas' },
];

/** Las comodidades que entiende la API, con su palabra en la URL y su nombre. */
export const COMODIDADES: readonly { api: string; url: string; nombre: string }[] = [
  { api: 'pets', url: 'mascotas', nombre: 'Acepta mascotas' },
  { api: 'parking', url: 'parqueadero', nombre: 'Parqueadero' },
  { api: 'furnished', url: 'amoblado', nombre: 'Amoblado' },
  { api: 'balcony', url: 'balcon', nombre: 'Balcón' },
  { api: 'pool', url: 'piscina', nombre: 'Piscina' },
  { api: 'gym', url: 'gimnasio', nombre: 'Gimnasio' },
  { api: 'elevator', url: 'ascensor', nombre: 'Ascensor' },
  { api: 'security', url: 'vigilancia', nombre: 'Vigilancia' },
  { api: 'terrace', url: 'terraza', nombre: 'Terraza' },
  { api: 'bbq', url: 'bbq', nombre: 'Zona BBQ' },
  { api: 'laundry', url: 'lavanderia', nombre: 'Zona de lavado' },
  { api: 'storage', url: 'deposito', nombre: 'Cuarto útil' },
  { api: 'playground', url: 'zona-infantil', nombre: 'Zona infantil' },
  { api: 'ac', url: 'aire', nombre: 'Aire acondicionado' },
  { api: 'heating', url: 'calefaccion', nombre: 'Calefacción' },
];

/** Los tipos que son vivienda (Ley 820 de 2003: sin depósito en dinero). */
const VIVIENDA: ReadonlySet<PropertyType> = new Set(['apartment', 'house', 'studio', 'room']);

const entero = (v: string | null): number | undefined => {
  if (v == null || v.trim() === '') return undefined;
  const n = Number(v.replace(/[.\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};
const textoDe = (v: string | null): string | undefined => {
  const t = v?.trim();
  return t ? t.slice(0, 200) : undefined;
};

// ── URL ↔ búsqueda ─────────────────────────────────────────────────────────

/** La búsqueda que dice la dirección. Lo que no se entiende se ignora: nunca rompe la página. */
export function leerBusqueda(params: URLSearchParams): Busqueda {
  const b: Busqueda = {};
  const q = textoDe(params.get('q'));
  if (q) b.q = q;
  const operacion = params.get('operacion');
  if (operacion === 'arriendo' || operacion === 'venta') b.operacion = operacion;
  const ciudad = textoDe(params.get('ciudad'));
  if (ciudad) b.ciudad = ciudad;
  const barrio = textoDe(params.get('barrio'));
  if (barrio) b.barrio = barrio;
  const tipo = TIPOS.find((t) => t.url === params.get('tipo'));
  if (tipo) b.tipo = tipo.api;
  const numeros: [keyof Busqueda, string][] = [
    ['habitaciones', 'habitaciones'],
    ['banos', 'banos'],
    ['parqueaderos', 'parqueaderos'],
    ['desde', 'desde'],
    ['hasta', 'hasta'],
    ['estrato', 'estrato'],
    ['areaMin', 'area-min'],
    ['areaMax', 'area-max'],
  ];
  for (const [clave, param] of numeros) {
    const n = entero(params.get(param));
    if (n !== undefined) (b as Record<string, unknown>)[clave] = n;
  }
  const comodidades = (params.get('comodidades') ?? '')
    .split(',')
    .map((c) => COMODIDADES.find((x) => x.url === c.trim())?.api)
    .filter((c): c is string => !!c);
  if (comodidades.length > 0) b.comodidades = [...new Set(comodidades)];
  const texto = textoDe(params.get('texto'));
  if (texto) b.texto = texto;
  return b;
}

/** La dirección de una búsqueda, en un orden fijo: dos búsquedas iguales dan la misma URL. */
export function escribirBusqueda(b: Busqueda): string {
  const p = new URLSearchParams();
  if (b.q) p.set('q', b.q);
  if (b.operacion) p.set('operacion', b.operacion);
  if (b.ciudad) p.set('ciudad', b.ciudad);
  if (b.barrio) p.set('barrio', b.barrio);
  if (b.tipo) p.set('tipo', TIPOS.find((t) => t.api === b.tipo)?.url ?? '');
  if (b.habitaciones !== undefined) p.set('habitaciones', String(b.habitaciones));
  if (b.banos !== undefined) p.set('banos', String(b.banos));
  if (b.parqueaderos !== undefined) p.set('parqueaderos', String(b.parqueaderos));
  if (b.desde !== undefined) p.set('desde', String(b.desde));
  if (b.hasta !== undefined) p.set('hasta', String(b.hasta));
  if (b.estrato !== undefined) p.set('estrato', String(b.estrato));
  if (b.areaMin !== undefined) p.set('area-min', String(b.areaMin));
  if (b.areaMax !== undefined) p.set('area-max', String(b.areaMax));
  if (b.comodidades?.length) {
    p.set(
      'comodidades',
      b.comodidades.map((c) => COMODIDADES.find((x) => x.api === c)?.url ?? c).join(','),
    );
  }
  if (b.texto) p.set('texto', b.texto);
  return p.toString();
}

/** ¿Hay algo buscado? Sin nada, se muestra la portada. */
export function hayBusqueda(b: Busqueda): boolean {
  return Object.keys(b).length > 0;
}

// ── Búsqueda → API ─────────────────────────────────────────────────────────

/** Los parámetros de `GET /properties`. El texto con IA va como `naturalQuery`. */
export function filtrosDeLaApi(b: Busqueda, limite = 100): PropertyFiltersParams {
  const f: PropertyFiltersParams = { limit: limite };
  if (b.q) f.naturalQuery = b.q;
  if (b.operacion) f.listingType = b.operacion === 'venta' ? 'SALE' : 'RENT';
  if (b.ciudad) f.city = b.ciudad;
  if (b.barrio) f.neighborhood = b.barrio;
  if (b.tipo) f.propertyType = b.tipo as PropertyFiltersParams['propertyType'];
  if (b.habitaciones !== undefined) f.bedrooms = b.habitaciones;
  if (b.banos !== undefined) f.bathrooms = b.banos;
  if (b.parqueaderos !== undefined) f.parkingSpaces = b.parqueaderos;
  // El precio de una venta y el canon de un arriendo son ejes distintos en la API.
  if (b.operacion === 'venta') {
    if (b.desde !== undefined) f.minSalePrice = b.desde;
    if (b.hasta !== undefined) f.maxSalePrice = b.hasta;
  } else {
    if (b.desde !== undefined) f.minPrice = b.desde;
    if (b.hasta !== undefined) f.maxPrice = b.hasta;
  }
  if (b.estrato !== undefined) f.stratum = b.estrato;
  if (b.areaMin !== undefined) f.minArea = b.areaMin;
  if (b.areaMax !== undefined) f.maxArea = b.areaMax;
  if (b.comodidades?.length) f.amenities = b.comodidades;
  if (b.texto) f.searchQuery = b.texto;
  return f;
}

/**
 * El texto se vuelve filtros: lo entendido pasa a la búsqueda y `q` se va.
 * Lo que la persona ya había puesto a mano gana (el back hace lo mismo).
 */
export function absorber(b: Busqueda, e: FiltrosEntendidos | null | undefined): Busqueda {
  const { q: _q, ...resto } = b;
  void _q;
  if (!e) return resto;
  const tipo = TIPOS.find((t) => t.api === e.propertyType)?.api;
  const deLoEntendido: Busqueda = {
    ...(e.listingType ? { operacion: e.listingType === 'SALE' ? 'venta' : 'arriendo' } : {}),
    ...(e.city ? { ciudad: e.city } : {}),
    ...(e.neighborhood ? { barrio: e.neighborhood } : {}),
    ...(tipo ? { tipo } : {}),
    ...(e.bedrooms !== undefined ? { habitaciones: e.bedrooms } : {}),
    ...(e.bathrooms !== undefined ? { banos: e.bathrooms } : {}),
    ...(e.parkingSpaces !== undefined ? { parqueaderos: e.parkingSpaces } : {}),
    ...(e.minPrice !== undefined ? { desde: e.minPrice } : {}),
    ...(e.maxPrice !== undefined ? { hasta: e.maxPrice } : {}),
    ...(e.stratum !== undefined ? { estrato: e.stratum } : {}),
    ...(e.minArea !== undefined ? { areaMin: e.minArea } : {}),
    ...(e.maxArea !== undefined ? { areaMax: e.maxArea } : {}),
    ...(e.textoLibre ? { texto: e.textoLibre } : {}),
  };
  const comodidades = [...new Set([...(resto.comodidades ?? []), ...(e.amenities ?? [])])];
  return {
    ...deLoEntendido,
    ...resto,
    ...(comodidades.length > 0 ? { comodidades } : {}),
  };
}

// ── Pastillas ──────────────────────────────────────────────────────────────

export type ClaveDePastilla =
  | 'operacion'
  | 'ciudad'
  | 'barrio'
  | 'tipo'
  | 'habitaciones'
  | 'banos'
  | 'parqueaderos'
  | 'precio'
  | 'estrato'
  | 'area'
  | 'texto'
  | `comodidad:${string}`;

export interface Pastilla {
  clave: ClaveDePastilla;
  etiqueta: string;
  /** Salió del texto (con IA), no de un filtro puesto a mano. */
  entendida: boolean;
}

const millones = (n: number) => formatCurrency(n);

function etiquetaDelPrecio(desde?: number, hasta?: number): string | null {
  if (desde !== undefined && hasta !== undefined) return `${millones(desde)} – ${millones(hasta)}`;
  if (hasta !== undefined) return `Hasta ${millones(hasta)}`;
  if (desde !== undefined) return `Desde ${millones(desde)}`;
  return null;
}

function etiquetaDelArea(min?: number, max?: number): string | null {
  if (min !== undefined && max !== undefined) return `${min}–${max} m²`;
  if (max !== undefined) return `Hasta ${max} m²`;
  if (min !== undefined) return `Desde ${min} m²`;
  return null;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Las pastillas de lo que dice la búsqueda, en el orden en que se lee una búsqueda. */
function pastillasDe(b: Busqueda, entendida: boolean): Pastilla[] {
  const p: Pastilla[] = [];
  const poner = (clave: ClaveDePastilla, etiqueta: string | null) => {
    if (etiqueta) p.push({ clave, etiqueta, entendida });
  };
  if (b.operacion) poner('operacion', b.operacion === 'venta' ? 'En venta' : 'En arriendo');
  if (b.tipo) poner('tipo', TIPOS.find((t) => t.api === b.tipo)?.nombre ?? null);
  if (b.ciudad) poner('ciudad', b.ciudad);
  if (b.barrio) poner('barrio', b.barrio);
  if (b.habitaciones !== undefined) poner('habitaciones', plural(b.habitaciones, 'habitación', 'habitaciones'));
  if (b.banos !== undefined) poner('banos', plural(b.banos, 'baño', 'baños'));
  if (b.parqueaderos !== undefined) {
    poner('parqueaderos', b.parqueaderos <= 1 ? 'Con parqueadero' : `${b.parqueaderos}+ parqueaderos`);
  }
  poner('precio', etiquetaDelPrecio(b.desde, b.hasta));
  if (b.estrato !== undefined) poner('estrato', `Estrato ${b.estrato}`);
  poner('area', etiquetaDelArea(b.areaMin, b.areaMax));
  for (const c of b.comodidades ?? []) {
    poner(`comodidad:${c}`, COMODIDADES.find((x) => x.api === c)?.nombre ?? c);
  }
  if (b.texto) poner('texto', `«${b.texto}»`);
  return p;
}

/**
 * Las pastillas que se ven. Con texto sin absorber, lo entendido va marcado
 * (`entendida`) y lo puesto a mano no; las dos juntas son la búsqueda entera.
 */
export function pastillas(b: Busqueda, e?: FiltrosEntendidos | null): Pastilla[] {
  if (!b.q) return pastillasDe(b, false);
  const { q: _q, ...aMano } = b;
  void _q;
  const deLaMano = pastillasDe(aMano, false);
  const yaEstan = new Set(deLaMano.map((x) => x.clave));
  const deLoEntendido = pastillasDe(absorber({}, e), true).filter((x) => !yaEstan.has(x.clave));
  return [...deLoEntendido, ...deLaMano];
}

/** Quitar una pastilla: lo entendido pasa a filtros y esa clave se va. */
export function quitarPastilla(
  b: Busqueda,
  e: FiltrosEntendidos | null | undefined,
  clave: ClaveDePastilla,
): Busqueda {
  const nueva: Busqueda = { ...absorber(b, e) };
  if (clave.startsWith('comodidad:')) {
    const id = clave.slice('comodidad:'.length);
    const quedan = (nueva.comodidades ?? []).filter((c) => c !== id);
    if (quedan.length > 0) nueva.comodidades = quedan;
    else delete nueva.comodidades;
    return nueva;
  }
  switch (clave) {
    case 'precio':
      delete nueva.desde;
      delete nueva.hasta;
      break;
    case 'area':
      delete nueva.areaMin;
      delete nueva.areaMax;
      break;
    default:
      delete (nueva as Record<string, unknown>)[clave];
  }
  return nueva;
}

// ── La tarjeta ─────────────────────────────────────────────────────────────

const plegar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Por qué este inmueble sale en la lista: lo pedido que cumple, dicho con
 * las mismas palabras de las pastillas. Lo que no se puede saber (el inmueble
 * no trae el dato) va aparte, nunca como cumplido.
 */
export function porQueTeLoMuestro(
  p: Property,
  b: Busqueda,
  e?: FiltrosEntendidos | null,
): { cumple: string[]; sinDato: string[] } {
  const todo = absorber(b, e);
  const cumple: string[] = [];
  const sinDato: string[] = [];
  const revisar = (etiqueta: string | null, ok: boolean | null) => {
    if (!etiqueta) return;
    if (ok === null) sinDato.push(etiqueta);
    else if (ok) cumple.push(etiqueta);
  };
  for (const x of pastillasDe(todo, false)) {
    switch (x.clave) {
      case 'operacion':
        revisar(x.etiqueta, p.listingType === (todo.operacion === 'venta' ? 'sale' : 'rent'));
        break;
      case 'tipo':
        revisar(x.etiqueta, p.type === (todo.tipo ?? '').toLowerCase());
        break;
      case 'ciudad':
        revisar(x.etiqueta, plegar(p.city ?? '').includes(plegar(todo.ciudad ?? '')));
        break;
      case 'barrio':
        revisar(
          x.etiqueta,
          p.neighborhood ? plegar(p.neighborhood).includes(plegar(todo.barrio ?? '')) : null,
        );
        break;
      case 'habitaciones':
        revisar(x.etiqueta, p.bedrooms == null ? null : p.bedrooms === todo.habitaciones);
        break;
      case 'banos':
        revisar(x.etiqueta, p.bathrooms == null ? null : p.bathrooms === todo.banos);
        break;
      case 'parqueaderos':
        revisar(x.etiqueta, p.parkingSpaces == null ? null : p.parkingSpaces >= (todo.parqueaderos ?? 0));
        break;
      case 'precio': {
        const precio = p.listingType === 'sale' ? p.salePrice : p.monthlyRent;
        revisar(
          x.etiqueta,
          precio == null
            ? null
            : (todo.desde === undefined || precio >= todo.desde) &&
                (todo.hasta === undefined || precio <= todo.hasta),
        );
        break;
      }
      case 'estrato':
        revisar(x.etiqueta, p.stratum == null ? null : p.stratum === todo.estrato);
        break;
      case 'area':
        revisar(
          x.etiqueta,
          p.area == null
            ? null
            : (todo.areaMin === undefined || p.area >= todo.areaMin) &&
                (todo.areaMax === undefined || p.area <= todo.areaMax),
        );
        break;
      case 'texto':
        break;
      default: {
        const id = x.clave.slice('comodidad:'.length);
        revisar(x.etiqueta, p.amenities.some((a) => a.id === id));
      }
    }
  }
  return { cumple, sinDato };
}

/** Lo que cuesta al mes de verdad: canon + administración. `null` si no aplica o no hay canon. */
export function costoMensual(p: Property): { canon: number; administracion: number; total: number } | null {
  if (p.listingType !== 'rent' || p.canonPorConfirmar || p.monthlyRent == null) return null;
  const administracion = p.adminFee > 0 ? p.adminFee : 0;
  return { canon: p.monthlyRent, administracion, total: p.monthlyRent + administracion };
}

/** Arriendo de vivienda: la Ley 820 de 2003 (art. 16) prohíbe pedir depósito en dinero. */
export function sinDeposito(p: Property): boolean {
  return p.listingType === 'rent' && VIVIENDA.has(p.type);
}

/** El título de una búsqueda («Apartamentos en arriendo en Laureles, Medellín»). */
export function tituloDeLaBusqueda(b: Busqueda): string {
  const tipo = TIPOS.find((t) => t.api === b.tipo)?.plural ?? 'Inmuebles';
  const negocio = b.operacion === 'venta' ? ' en venta' : b.operacion === 'arriendo' ? ' en arriendo' : '';
  const lugar = [b.barrio, b.ciudad].filter(Boolean).join(', ');
  return `${tipo}${negocio}${lugar ? ` en ${lugar}` : ''}`;
}
