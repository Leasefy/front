import { describe, expect, it } from 'vitest';
import { fraseDeLoQueFalta, inmuebleVacio, loQueFalta, paraCrear, tituloDe } from './borrador';

const lleno = { ...inmuebleVacio('a'), tipo: 'APARTMENT' as const, direccion: 'Cra 76 # 34-21', ciudad: 'Medellín', barrio: 'Laureles', precio: 2_800_000, habitaciones: 3 };

describe('el publicador rápido (19-10-2026)', () => {
  it('dice qué falta, en orden y en español', () => {
    expect(loQueFalta(inmuebleVacio('a'), 0)).toEqual(['fotos', 'tipo', 'direccion', 'ciudad', 'precio']);
    expect(fraseDeLoQueFalta(['direccion', 'precio'])).toBe('Falta la dirección y el precio.');
    expect(loQueFalta(lleno, 2)).toEqual([]);
    expect(fraseDeLoQueFalta([])).toBe('Listo para publicar.');
  });

  it('el título es el de la tarjeta del marketplace', () => {
    expect(tituloDe(lleno)).toBe('Apartamento en arriendo en Laureles, 3 habitaciones');
    expect(tituloDe({ ...lleno, operacion: 'sale', barrio: '', habitaciones: 1 })).toBe('Apartamento en venta en Medellín, 1 habitación');
  });

  it('publicar = disponible y en el marketplace; la venta sin canon, el arriendo sin precio de venta', () => {
    const arriendo = paraCrear(lleno);
    expect(arriendo).toMatchObject({ status: 'AVAILABLE', publicadoEnMarketplace: true, listingType: 'rent', monthlyRent: 2_800_000, type: 'APARTMENT' });
    expect('salePrice' in arriendo).toBe(false);
    const venta = paraCrear({ ...lleno, operacion: 'sale', precio: 450_000_000 });
    expect(venta).toMatchObject({ listingType: 'sale', monthlyRent: null, salePrice: 450_000_000 });
  });

  it('una descripción de menos de 20 letras no viaja (el back la rechazaría)', () => {
    expect('description' in paraCrear({ ...lleno, descripcion: 'Muy lindo' })).toBe(false);
    expect(paraCrear({ ...lleno, descripcion: 'Muy lindo, con mucha luz y vista' }).description).toBe('Muy lindo, con mucha luz y vista');
  });
});
