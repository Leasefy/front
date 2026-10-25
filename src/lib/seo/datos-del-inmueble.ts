import type { InmuebleDeLaVistaPrevia } from '@/lib/inmuebles/vista-previa-del-inmueble';

/**
 * Los datos estructurados de la ficha de un inmueble (SEO, Nico 24-10-2026; skill seo-experto §3): el aviso
 * (`RealEstateListing`) con su precio en COP —mensual en arriendo— y el inmueble que ofrece, hasta barrio y ciudad
 * (la dirección exacta no: la ficha tampoco la muestra). Sólo lo que trae el catálogo; lo que falta, no se pone.
 */
const TIPO_SCHEMA: Record<string, string> = {
  APARTMENT: 'Apartment',
  STUDIO: 'Apartment',
  HOUSE: 'House',
  ROOM: 'Room',
  COMMERCIAL: 'Place',
  OFFICE: 'Place',
  WAREHOUSE: 'Place',
  PARKING: 'Place',
  LAND: 'Place',
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

export function datosDelInmueble(p: InmuebleDeLaVistaPrevia, url: string, sitio = 'https://leasefy.co') {
  const venta = p.listingType === 'SALE';
  const precio = num(venta ? p.salePrice : p.monthlyRent);
  const fotos = [...((p.images ?? []) as { url?: string; order?: number }[])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((f) => f.url)
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
    .slice(0, 6);
  const lugar = {
    '@type': 'PostalAddress',
    ...(p.neighborhood ? { streetAddress: p.neighborhood } : {}),
    ...(p.city ? { addressLocality: p.city } : {}),
    addressCountry: 'CO',
  };
  const inmueble: Record<string, unknown> = {
    '@type': TIPO_SCHEMA[String(p.type)] ?? 'Place',
    name: p.title,
    address: lugar,
  };
  if (num(p.bedrooms)) inmueble.numberOfBedrooms = p.bedrooms;
  if (num(p.bathrooms)) inmueble.numberOfBathroomsTotal = p.bathrooms;
  if (num(p.area)) inmueble.floorSize = { '@type': 'QuantitativeValue', value: p.area, unitCode: 'MTK' };
  const datos: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${url}#aviso`,
    name: p.title,
    url,
    inLanguage: 'es-CO',
    image: fotos.length ? fotos : undefined,
    dateModified: p.updatedAt || undefined,
    about: inmueble,
    provider: { '@type': 'Organization', '@id': `${sitio}/#organizacion`, name: 'Leasefy', url: sitio },
  };
  if (precio) {
    datos.offers = {
      '@type': 'Offer',
      price: precio,
      priceCurrency: 'COP',
      availability: 'https://schema.org/InStock',
      businessFunction: venta ? 'http://purl.org/goodrelations/v1#Sell' : 'http://purl.org/goodrelations/v1#LeaseOut',
      ...(venta ? {} : { priceSpecification: { '@type': 'UnitPriceSpecification', price: precio, priceCurrency: 'COP', unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } } }),
    };
  }
  return JSON.parse(JSON.stringify(datos)) as Record<string, unknown>;
}
