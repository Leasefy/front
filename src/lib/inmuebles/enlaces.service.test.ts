/**
 * Lo leído de un enlace → el inmueble que maneja el asistente.
 *
 * Lo que se congela: que una VENTA llegue al asistente como venta —con su
 * precio en `salePrice` y el `listingType` que `resolveImportListingType`
 * entiende— y no como un arriendo de $320.000.000; y que el barrio y el
 * departamento que el lector consiguió no se pierdan en el cruce.
 */

import { describe, expect, it } from 'vitest';

import { aImportProperty } from './enlaces.service';
import type { InmuebleDesdeEnlace } from './leer-enlace';

function leido(parcial: Partial<InmuebleDesdeEnlace> = {}): InmuebleDesdeEnlace {
  return {
    url: 'https://www.fincaraiz.com.co/apartamento-en-venta-en-las-villas-zipaquira/193740609',
    titulo: { valor: 'Apartamento en Venta en Las villas, Zipaquirá', fuente: 'json-ld' },
    ciudad: { valor: 'Zipaquirá', fuente: 'json-ld' },
    imagenes: [],
    videos: [],
    ...parcial,
  };
}

describe('aImportProperty', () => {
  it('una venta viaja como venta: salePrice y listingType «Venta», sin canon', () => {
    const p = aImportProperty(
      leido({
        negocio: { valor: 'venta', fuente: 'json-ld', textoOriginal: 'BreadcrumbList: Venta' },
        precioVenta: { valor: 320_000_000, fuente: 'json-ld', textoOriginal: 'price' },
      }),
      0,
    );

    expect(p.listingType).toBe('Venta');
    expect(p.salePrice).toBe(320_000_000);
    expect(p.monthlyRent).toBeUndefined();
    expect(p.procedencia?.listingType).toBe('json-ld: BreadcrumbList: Venta');
    expect(p.procedencia?.salePrice).toBe('json-ld: price');
  });

  it('un arriendo viaja como arriendo', () => {
    const p = aImportProperty(
      leido({
        negocio: { valor: 'arriendo', fuente: 'url' },
        canon: { valor: 2_500_000, fuente: 'json-ld', textoOriginal: 'price' },
      }),
      0,
    );

    expect(p.listingType).toBe('Arriendo');
    expect(p.monthlyRent).toBe(2_500_000);
    expect(p.salePrice).toBeUndefined();
  });

  it('sin negocio leído no finge uno: listingType queda vacío', () => {
    const p = aImportProperty(leido({ canon: { valor: 2_500_000, fuente: 'json-ld' } }), 0);

    expect(p.listingType).toBeUndefined();
    expect(p.monthlyRent).toBe(2_500_000);
  });

  it('el barrio y el departamento llegan al asistente', () => {
    const p = aImportProperty(
      leido({
        barrio: { valor: 'Las villas', fuente: 'json-ld', textoOriginal: 'BreadcrumbList: Las villas' },
        departamento: { valor: 'Cundinamarca', fuente: 'json-ld', textoOriginal: 'address.addressRegion' },
      }),
      0,
    );

    expect(p.propertyZone).toBe('Las villas');
    expect(p.propertyDepartment).toBe('Cundinamarca');
    expect(p.procedencia?.propertyDepartment).toBe('json-ld: address.addressRegion');
  });
});
