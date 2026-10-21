/**
 * La vista previa del enlace de un inmueble (`leasefy.co/propiedades/<id>`):
 * lo que WhatsApp, iMessage, Facebook o LinkedIn pintan al pegar el enlace
 * (Juan y Nico, 21-10-2026: «cuando se comparta el enlace la idea es que
 * genere una mini ficha como esta»). Hasta hoy la ficha heredaba el texto
 * del catálogo («Propiedades en Arriendo | Leasefy») y la imagen genérica.
 *
 * Sólo del servidor: la usa `app/propiedades/[id]/layout.tsx`.
 */

import type { Metadata } from 'next';

import type { BackendProperty } from '@/lib/api/properties.types';
import {
  descripcionParaLaVistaPrevia,
  tituloParaCompartir,
  type IdiomaDeLaFicha,
  type InmuebleParaCompartir,
} from '@/lib/inmuebles/ficha-para-compartir';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lo que la vista previa espera del back como mucho. WhatsApp arma la vista
 * previa desde el celular de quien comparte y no espera para siempre: si el
 * back tarda, mejor la vista previa genérica que ninguna.
 */
const ESPERA_MAXIMA_MS = 2500;

/** Los campos del inmueble que la vista previa usa (el `GET /properties/:id` público). */
export type InmuebleDeLaVistaPrevia = Pick<
  BackendProperty,
  | 'title'
  | 'city'
  | 'neighborhood'
  | 'monthlyRent'
  | 'adminFee'
  | 'listingType'
  | 'salePrice'
  | 'area'
  | 'bedrooms'
  | 'bathrooms'
  | 'parkingSpaces'
  | 'images'
>;

/** Del cable a los datos de la ficha. */
export function paraCompartir(p: InmuebleDeLaVistaPrevia): InmuebleParaCompartir {
  return {
    titulo: p.title,
    tipoDeNegocio: p.listingType === 'SALE' ? 'sale' : 'rent',
    canon: p.monthlyRent,
    precioDeVenta: p.salePrice ?? null,
    administracion: p.adminFee,
    ciudad: p.city,
    barrio: p.neighborhood,
    area: p.area,
    habitaciones: p.bedrooms,
    banos: p.bathrooms,
    parqueaderos: p.parkingSpaces,
  };
}

/** La primera foto del inmueble según su orden, o `null`. */
export function primeraFoto(p: Pick<InmuebleDeLaVistaPrevia, 'images'>): string | null {
  const fotos = [...(p.images ?? [])]
    .filter((f) => typeof f?.url === 'string' && /^https?:\/\//i.test(f.url))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return fotos[0]?.url ?? null;
}

/**
 * La foto pasada por el optimizador de imágenes de Next, a 1200 px: una foto
 * de celular pesa varios MB y WhatsApp descarta la imagen de la vista previa
 * si pesa mucho (la de Portofino pasa igual por su proxy, a 1600 px). 75 es
 * una de las calidades permitidas en `next.config.mjs`.
 *
 * Sólo las fotos del almacén (Supabase): el optimizador rechaza cualquier
 * otro origen, así que otra URL va tal cual.
 */
export function fotoParaLaVistaPrevia(url: string): string {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return url;
  }
  let almacen = '';
  try {
    almacen = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    /* sin almacén configurado */
  }
  const esDelAlmacen = host.endsWith('.supabase.co') || (almacen !== '' && host === almacen);
  return esDelAlmacen ? `/_next/image?url=${encodeURIComponent(url)}&w=1200&q=75` : url;
}

/** Pide el inmueble al back como lo vería cualquiera, sin sesión. `null` si no se pudo. */
export async function pedirInmuebleParaLaVistaPrevia(id: string): Promise<InmuebleDeLaVistaPrevia | null> {
  if (!UUID.test(id)) return null;
  const back = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${back}/properties/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    if (!res.ok) return null;
    const p = (await res.json()) as InmuebleDeLaVistaPrevia | null;
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

/**
 * La metadata de la ficha: título, descripción, la foto y la URL canónica.
 * `ruta` es la del inmueble sin idioma (`/propiedades/<id>`); `alternates` la
 * pone quien llama, con el idioma de la petición.
 */
export function metadataDeLaVistaPrevia(
  p: InmuebleDeLaVistaPrevia,
  { idioma, url }: { idioma: IdiomaDeLaFicha; url: string },
): Metadata {
  const datos = paraCompartir(p);
  const titulo = tituloParaCompartir(datos, idioma);
  const descripcion = descripcionParaLaVistaPrevia(datos, idioma);
  const foto = primeraFoto(p);
  const imagenes = foto ? [{ url: fotoParaLaVistaPrevia(foto), alt: titulo }] : undefined;
  return {
    // La plantilla del layout raíz ya agrega «| Leasefy».
    title: titulo,
    description: descripcion,
    openGraph: {
      type: 'website',
      siteName: 'Leasefy',
      locale: idioma === 'en' ? 'en_US' : 'es_CO',
      url,
      title: titulo,
      description: descripcion,
      // Sin foto, queda la imagen de Leasefy del layout raíz.
      ...(imagenes ? { images: imagenes } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descripcion,
      ...(imagenes ? { images: imagenes.map((i) => i.url) } : {}),
    },
  };
}
