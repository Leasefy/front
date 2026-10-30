/**
 * «Crear el inmueble desde un enlace» dentro del panel (Juan y Nico, 27-10-2026). Lo que el aviso no dice no se
 * inventa y lo que la persona ya escribió no se pisa.
 */
import { describe, expect, it } from 'vitest';
import type { InmuebleDesdeEnlace } from './leer-enlace';
import { datosDelAsistenteDesdeElEnlace, loQueTrajo, soloLoVacio } from './asistente-desde-enlace';

const dato = <T,>(valor: T) => ({ valor, fuente: 'json-ld' as const });

const aviso: InmuebleDesdeEnlace = {
  url: 'https://www.fincaraiz.com.co/x',
  titulo: dato('Apartamento en Laureles'),
  descripcion: dato('Hermoso apartamento con balcón y vista.'),
  direccion: dato('Cra 76 # 33-20'),
  ciudad: dato('Medellín'),
  barrio: dato('Laureles'),
  departamento: dato('Antioquia'),
  tipo: dato('apartment'),
  negocio: dato('arriendo'),
  canon: dato(2_300_000),
  administracion: dato(250_000),
  area: dato(72.4),
  habitaciones: dato(3),
  banos: dato(2),
  imagenes: ['https://img/1.jpg'],
  videos: ['https://www.youtube.com/watch?v=abc'],
};

describe('datosDelAsistenteDesdeElEnlace', () => {
  it('pasa cada dato a su campo del asistente', () => {
    expect(datosDelAsistenteDesdeElEnlace(aviso)).toEqual({
      propertyType: 'apartment',
      propertyTitle: 'Apartamento en Laureles',
      propertyDescription: 'Hermoso apartamento con balcón y vista.',
      propertyAddress: 'Cra 76 # 33-20',
      propertyCity: 'Medellín',
      propertyZone: 'Laureles',
      department: 'Antioquia',
      listingType: 'rent',
      monthlyRent: 2_300_000,
      adminFee: 250_000,
      area: 72,
      bedrooms: 3,
      bathrooms: 2,
      videoUrl: 'https://www.youtube.com/watch?v=abc',
    });
  });

  it('una venta lleva su precio y no un canon', () => {
    const venta = datosDelAsistenteDesdeElEnlace({
      ...aviso,
      negocio: dato('venta'),
      canon: undefined,
      precioVenta: dato(480_000_000),
    });
    expect(venta).toMatchObject({ listingType: 'sale', tambienEnVenta: false, salePrice: 480_000_000 });
    expect(venta).not.toHaveProperty('monthlyRent');
  });

  it('una dirección aproximada (una referencia o el municipio) no se pone como si fuera la exacta', () => {
    expect(datosDelAsistenteDesdeElEnlace({ ...aviso, direccionAproximada: true })).not.toHaveProperty('propertyAddress');
  });

  it('un tipo que el asistente no tiene no se inventa', () => {
    expect(datosDelAsistenteDesdeElEnlace({ ...aviso, tipo: dato('castillo') })).not.toHaveProperty('propertyType');
  });
});

describe('soloLoVacio', () => {
  it('no pisa lo que la persona ya escribió; el tipo y la operación sí los decide el aviso', () => {
    expect(
      soloLoVacio(
        { propertyTitle: 'Mi título', monthlyRent: 0, propertyType: 'house', listingType: 'rent' },
        { propertyTitle: 'Del aviso', monthlyRent: 2_000_000, propertyType: 'apartment', listingType: 'sale' },
      ),
    ).toEqual({ monthlyRent: 2_000_000, propertyType: 'apartment', listingType: 'sale' });
  });
});

describe('loQueTrajo', () => {
  it('lo dice en palabras', () => {
    expect(loQueTrajo({ propertyTitle: 'x', monthlyRent: 1 }, 12)).toEqual(['el título', 'el canon', '12 fotos']);
    expect(loQueTrajo({}, 1)).toEqual(['1 foto']);
  });
});
