import { describe, expect, it } from 'vitest';
import { datosDelInmueble } from './datos-del-inmueble';

const base = {
  id: 'c9804b19-9fd8-4155-9247-9cd7228e74d0', type: 'APARTMENT', title: 'Apartamento en Laureles, Medellin', city: 'Medellin', neighborhood: 'Laureles',
  monthlyRent: 6000000, salePrice: null, listingType: 'RENT', area: 80, bedrooms: 2, bathrooms: 2, updatedAt: '2026-10-20T00:00:00Z',
  images: [{ url: 'https://x.supabase.co/b.jpg', order: 1 }, { url: 'https://x.supabase.co/a.jpg', order: 0 }],
} as never;

describe('los datos estructurados de la ficha', () => {
  it('arriendo: aviso con el canon mensual en COP y el inmueble con lo que trae el catálogo', () => {
    const d = datosDelInmueble(base, 'https://leasefy.co/es/propiedades/x') as Record<string, any>;
    expect(d['@type']).toBe('RealEstateListing');
    expect(d.image).toEqual(['https://x.supabase.co/a.jpg', 'https://x.supabase.co/b.jpg']);
    expect(d.offers).toMatchObject({ price: 6000000, priceCurrency: 'COP', priceSpecification: { unitCode: 'MON' } });
    expect(d.about).toMatchObject({ '@type': 'Apartment', numberOfBedrooms: 2, numberOfBathroomsTotal: 2, floorSize: { value: 80, unitCode: 'MTK' } });
    expect(d.about.address).toEqual({ '@type': 'PostalAddress', streetAddress: 'Laureles', addressLocality: 'Medellin', addressCountry: 'CO' });
  });

  it('venta: el precio de venta, sin «mensual»', () => {
    const d = datosDelInmueble({ ...(base as object), listingType: 'SALE', salePrice: 450000000, monthlyRent: null } as never, 'u') as Record<string, any>;
    expect(d.offers.price).toBe(450000000);
    expect(d.offers.priceSpecification).toBeUndefined();
  });

  it('lo que falta no se inventa', () => {
    const d = datosDelInmueble({ ...(base as object), monthlyRent: 0, bedrooms: null, area: null, images: [] } as never, 'u') as Record<string, any>;
    expect(d.offers).toBeUndefined();
    expect(d.image).toBeUndefined();
    expect(d.about.numberOfBedrooms).toBeUndefined();
    expect(d.about.floorSize).toBeUndefined();
  });
});
