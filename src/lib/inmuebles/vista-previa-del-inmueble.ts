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
  | 'id'
  | 'type'
  | 'stratum'
  | 'updatedAt'
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
> & {
  /** La inmobiliaria que lo publica (el público lo trae aunque el tipo del front no lo declare). */
  agencyId?: string | null;
};

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
    estrato: p.stratum,
  };
}

/** La primera foto del inmueble según su orden, o `null`. */
export function primeraFoto(p: Pick<InmuebleDeLaVistaPrevia, 'images'>): string | null {
  const fotos = [...(p.images ?? [])]
    .filter((f) => typeof f?.url === 'string' && /^https?:\/\//i.test(f.url))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return fotos[0]?.url ?? null;
}

export const ANCHO_DE_LA_IMAGEN = 1200;
export const ALTO_DE_LA_IMAGEN = 630;

/**
 * La dirección de la imagen de la vista previa. `v` cambia cada vez que el
 * inmueble cambia: WhatsApp y Facebook guardan la imagen por dirección, y así
 * un precio nuevo no sigue mostrando el viejo.
 */
export function rutaDeLaImagen(p: Pick<InmuebleDeLaVistaPrevia, 'id' | 'updatedAt'>): string {
  const cuando = Date.parse(p.updatedAt ?? '');
  const v = Number.isFinite(cuando) ? `?v=${cuando.toString(36)}` : '';
  return `/api/og/inmueble/${encodeURIComponent(p.id)}${v}`;
}

/** La inmobiliaria que publica el inmueble: su nombre entero y su logo. `null` si no se sabe. */
export async function pedirInmobiliariaDeLaVistaPrevia(
  agencyId: string | null | undefined,
): Promise<{ nombre: string; logoUrl: string | null } | null> {
  if (!agencyId || !UUID.test(agencyId)) return null;
  const back = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${back}/marketplace/inmobiliarias`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    if (!res.ok) return null;
    const cuerpo = (await res.json()) as unknown;
    const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo as { data?: unknown })?.data;
    if (!Array.isArray(lista)) return null;
    const i = lista.find((x) => (x as { id?: string })?.id === agencyId) as
      | { nombre?: string; logoUrl?: string | null }
      | undefined;
    const nombre = i?.nombre?.trim();
    return nombre ? { nombre, logoUrl: i?.logoUrl ?? null } : null;
  } catch {
    return null;
  }
}

/** Pide el inmueble al back como lo vería cualquiera, sin sesión. `null` si no se pudo. */
export async function pedirInmuebleParaLaVistaPrevia(
  id: string,
  esperaMs: number = ESPERA_MAXIMA_MS,
): Promise<InmuebleDeLaVistaPrevia | null> {
  if (!UUID.test(id)) return null;
  const back = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${back}/properties/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(esperaMs),
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
  // La tarjeta diseñada (diseño A, Nico 21-10-2026), con foto o sin ella.
  const imagenes = [
    { url: rutaDeLaImagen(p), width: ANCHO_DE_LA_IMAGEN, height: ALTO_DE_LA_IMAGEN, alt: titulo, type: 'image/jpeg' },
  ];
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
      images: imagenes,
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descripcion,
      images: imagenes.map((i) => i.url),
    },
  };
}
