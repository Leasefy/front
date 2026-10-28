import { mapBackendProperty } from '@/lib/api/properties.mapper';
import type { BackendProperty } from '@/lib/api/properties.types';

/**
 * La franja del marketplace de la landing estática (Nico 24-10-2026: «deben
 * quedar conectados con todo lo que hay en producción»). Antes tenía ocho
 * inmuebles escritos a mano; ahora sale del catálogo público (`GET /properties`)
 * como salía en la landing anterior (`landing-v2/marketplace/catalogo.ts`):
 * lo que se pinta es lo publicado, nunca inventado.
 *
 * La ruta `/api/vitrina-de-la-home` llama al back desde el servidor (con caché)
 * y entrega sólo esto, así la página no necesita hablar con otro origen. La foto
 * va por el optimizador de Next (mismo origen, miniatura de 96 px).
 */
export interface InmuebleDeLaVitrina {
  id: string;
  /** Miniatura por `/_next/image` (las fotos viven en Supabase, permitido en `images.remotePatterns`). */
  foto: string;
  /** Publicado sin foto: `foto` es la ilustración de su tipo (27-10). */
  sinFoto?: boolean;
  precio: number;
  venta: boolean;
  /** El tipo como lo manda el back (`APARTMENT`, `HOUSE`…): la página lo nombra en su idioma. */
  tipo: string;
  habitaciones: number | null;
  lugar: string | null;
}

export interface VitrinaDeLaHome {
  /** Cuántos hay publicados (lo dice el back, no lo que alcanza a la franja). */
  total: number;
  inmuebles: InmuebleDeLaVitrina[];
}

export const VITRINA_VACIA: VitrinaDeLaHome = { total: 0, inmuebles: [] };

/** Cuántos van en la franja (la cinta los repite dos veces para dar la vuelta). */
export const MAXIMO_EN_LA_FRANJA = 16;

export function miniatura(url: string): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=96&q=75`;
}

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * 🔴 Nico 27-10-2026 («sigo sin ver ahí dentro inmuebles, ¿por qué?»): la franja escondía todo inmueble sin
 * foto, y con pocos o ninguno con foto quedaba VACÍA. Ahora van primero los que tienen foto y, si sobra lugar,
 * los publicados sin foto con la ilustración de su tipo (es el inmueble real; sólo falta la foto).
 */
const ILUSTRACION_DEL_TIPO: Record<string, string> = {
  APARTMENT: '/landing/img/edificio-voltaje.webp',
  STUDIO: '/landing/img/edificio-voltaje.webp',
  ROOM: '/landing/img/edificio-voltaje.webp',
  HOUSE: '/landing/img/fachada-voltaje.webp',
  COMMERCIAL: '/landing/img/local-voltaje.webp',
  WAREHOUSE: '/landing/img/local-voltaje.webp',
  OFFICE: '/landing/img/torre-voltaje.webp',
};
const ILUSTRACION_POR_DEFECTO = '/landing/img/fachada-voltaje.webp';

export function armarVitrina(respuesta: unknown, maximo = MAXIMO_EN_LA_FRANJA): VitrinaDeLaHome {
  const cuerpo = respuesta as { data?: unknown; meta?: { total?: unknown } } | null;
  const lista = Array.isArray(cuerpo?.data) ? (cuerpo!.data as BackendProperty[]) : [];
  const inmuebles: InmuebleDeLaVitrina[] = [];
  const sinFoto: InmuebleDeLaVitrina[] = [];
  for (const bp of lista) {
    if (inmuebles.length >= maximo) break;
    let p;
    try {
      p = mapBackendProperty(bp);
    } catch {
      continue; // un inmueble raro (tipo de operación desconocido) no tumba la franja
    }
    if (p.status !== 'available') continue;
    const foto = (p.images ?? []).find(esTexto) ?? (esTexto(p.thumbnailUrl) ? p.thumbnailUrl : null);
    const venta = p.listingType === 'sale';
    const precio = venta ? p.salePrice : p.monthlyRent;
    if (typeof precio !== 'number' || !(precio > 0)) continue;
    (foto ? inmuebles : sinFoto).push({
      id: String(p.id),
      foto: foto ? miniatura(foto) : (ILUSTRACION_DEL_TIPO[String(bp.type ?? '')] ?? ILUSTRACION_POR_DEFECTO),
      ...(foto ? {} : { sinFoto: true }),
      precio,
      venta,
      tipo: String(bp.type ?? ''),
      habitaciones: typeof p.bedrooms === 'number' && p.bedrooms > 0 ? p.bedrooms : null,
      lugar: esTexto(p.neighborhood) ? p.neighborhood.trim() : esTexto(p.city) ? p.city.trim() : null,
    });
  }
  for (const i of sinFoto) {
    if (inmuebles.length >= maximo) break;
    inmuebles.push(i);
  }
  const total = Number(cuerpo?.meta?.total);
  return { total: Number.isFinite(total) && total >= 0 ? total : lista.length, inmuebles };
}
