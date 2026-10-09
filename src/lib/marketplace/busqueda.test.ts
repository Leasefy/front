import { describe, expect, it } from 'vitest';

import {
  absorber,
  costoMensual,
  escribirBusqueda,
  filtrosDeLaApi,
  leerBusqueda,
  pastillas,
  porQueTeLoMuestro,
  quitarPastilla,
  sinDeposito,
  tituloDeLaBusqueda,
  type Busqueda,
  type FiltrosEntendidos,
} from './busqueda';
import type { Property } from '@/lib/types/property';

const leer = (qs: string) => leerBusqueda(new URLSearchParams(qs));

const ENTENDIDO: FiltrosEntendidos = {
  propertyType: 'APARTMENT',
  city: 'Medellín',
  neighborhood: 'Laureles',
  bedrooms: 2,
  maxPrice: 2_500_000,
  amenities: ['pets'],
};

function inmueble(extra: Partial<Property> = {}): Property {
  return {
    id: 'p1',
    title: 'Apartamento en Laureles',
    description: '',
    type: 'apartment',
    status: 'available',
    city: 'Medellín',
    neighborhood: 'Laureles',
    address: 'Cra 76',
    latitude: null,
    longitude: null,
    department: null,
    listingType: 'rent',
    salePrice: null,
    monthlyRent: 2_350_000,
    adminFee: 260_000,
    deposit: 0,
    bedrooms: 2,
    bathrooms: 2,
    area: 68,
    amenities: [{ id: 'pets', name: 'Acepta mascotas' }],
    images: [],
    thumbnailUrl: '',
    landlordId: 'l1',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
    ...extra,
  } as Property;
}

describe('la URL de una búsqueda', () => {
  it('ida y vuelta: lo que se escribe se lee igual', () => {
    const b: Busqueda = {
      operacion: 'arriendo',
      ciudad: 'Medellín',
      barrio: 'Laureles',
      tipo: 'APARTMENT',
      habitaciones: 2,
      hasta: 2_500_000,
      comodidades: ['pets', 'balcony'],
      texto: 'cerca al metro',
    };
    const url = escribirBusqueda(b);
    expect(url).toContain('tipo=apartamento');
    expect(url).toContain('comodidades=mascotas%2Cbalcon');
    expect(leer(url)).toEqual(b);
  });

  it('lo que no se entiende se ignora, nunca rompe la página', () => {
    expect(leer('operacion=alquiler&tipo=castillo&habitaciones=dos&comodidades=jacuzzi,mascotas')).toEqual({
      comodidades: ['pets'],
    });
  });

  it('dos búsquedas iguales dan la misma dirección', () => {
    expect(escribirBusqueda({ hasta: 1, ciudad: 'Cali' })).toBe(escribirBusqueda({ ciudad: 'Cali', hasta: 1 }));
  });
});

describe('búsqueda → API', () => {
  it('el texto con IA va como naturalQuery y lo puesto a mano como filtros', () => {
    expect(filtrosDeLaApi({ q: 'apto en laureles', habitaciones: 2 }, 50)).toEqual({
      limit: 50,
      naturalQuery: 'apto en laureles',
      bedrooms: 2,
    });
  });

  it('en venta, el precio va contra el precio de venta, no contra el canon', () => {
    const f = filtrosDeLaApi({ operacion: 'venta', desde: 300_000_000, hasta: 500_000_000 });
    expect(f).toMatchObject({ listingType: 'SALE', minSalePrice: 300_000_000, maxSalePrice: 500_000_000 });
    expect(f.minPrice).toBeUndefined();
  });
});

describe('las pastillas', () => {
  it('con texto sin absorber, lo entendido va marcado', () => {
    const p = pastillas({ q: 'apto en laureles medellín 2 hab hasta 2,5 M con mascotas' }, ENTENDIDO);
    expect(p.map((x) => x.etiqueta)).toEqual([
      'Apartamento',
      'Medellín',
      'Laureles',
      '2 habitaciones',
      'Hasta $ 2.500.000',
      'Acepta mascotas',
    ]);
    expect(p.every((x) => x.entendida)).toBe(true);
  });

  it('lo puesto a mano no se repite con lo entendido', () => {
    const p = pastillas({ q: 'apto en laureles', ciudad: 'Bello' }, ENTENDIDO);
    expect(p.filter((x) => x.clave === 'ciudad')).toEqual([{ clave: 'ciudad', etiqueta: 'Bello', entendida: false }]);
  });

  it('quitar una pastilla absorbe el texto: queda todo lo demás como filtro y la q se va', () => {
    const b = quitarPastilla({ q: 'apto en laureles…' }, ENTENDIDO, 'comodidad:pets');
    expect(b).toEqual({
      tipo: 'APARTMENT',
      ciudad: 'Medellín',
      barrio: 'Laureles',
      habitaciones: 2,
      hasta: 2_500_000,
    });
  });

  it('quitar el precio quita el desde y el hasta', () => {
    expect(quitarPastilla({ desde: 1, hasta: 2, ciudad: 'Cali' }, null, 'precio')).toEqual({ ciudad: 'Cali' });
  });

  it('absorber: lo puesto a mano gana sobre lo entendido', () => {
    expect(absorber({ q: 'x', ciudad: 'Bello' }, { city: 'Medellín', bedrooms: 3 })).toEqual({
      ciudad: 'Bello',
      habitaciones: 3,
    });
  });
});

describe('la tarjeta', () => {
  it('por qué te lo muestro: lo que cumple, con las palabras de las pastillas', () => {
    const r = porQueTeLoMuestro(inmueble(), { q: 'x' }, ENTENDIDO);
    expect(r.cumple).toEqual(['Apartamento', 'Medellín', 'Laureles', '2 habitaciones', 'Hasta $ 2.500.000', 'Acepta mascotas']);
    expect(r.sinDato).toEqual([]);
  });

  it('lo que el inmueble no dice va aparte, nunca como cumplido', () => {
    const r = porQueTeLoMuestro(inmueble({ bedrooms: null, neighborhood: null }), { habitaciones: 2, barrio: 'Laureles' });
    expect(r.cumple).toEqual([]);
    expect(r.sinDato).toEqual(['Laureles', '2 habitaciones']);
  });

  it('costo mensual real: canon + administración; sin canon o en venta, nada', () => {
    expect(costoMensual(inmueble())).toEqual({ canon: 2_350_000, administracion: 260_000, total: 2_610_000 });
    expect(costoMensual(inmueble({ adminFee: 0 }))).toEqual({ canon: 2_350_000, administracion: 0, total: 2_350_000 });
    expect(costoMensual(inmueble({ canonPorConfirmar: true }))).toBeNull();
    expect(costoMensual(inmueble({ listingType: 'sale', salePrice: 1, monthlyRent: null }))).toBeNull();
  });

  it('sin depósito sólo en arriendo de vivienda (Ley 820)', () => {
    expect(sinDeposito(inmueble())).toBe(true);
    expect(sinDeposito(inmueble({ type: 'commercial' }))).toBe(false);
    expect(sinDeposito(inmueble({ listingType: 'sale' }))).toBe(false);
  });

  it('el título de la búsqueda', () => {
    expect(tituloDeLaBusqueda({ tipo: 'APARTMENT', operacion: 'arriendo', barrio: 'Laureles', ciudad: 'Medellín' })).toBe(
      'Apartamentos en arriendo en Laureles, Medellín',
    );
    expect(tituloDeLaBusqueda({})).toBe('Inmuebles');
  });
});
