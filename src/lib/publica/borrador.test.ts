import { describe, expect, it } from 'vitest';
import {
  desdeImportProperty,
  direccionesRepetidas,
  fotosDeLaCelda,
  fraseDeLoQueFalta,
  inmuebleVacio,
  llaveDeDireccion,
  loQueFalta,
  nuevaLlave,
  paraCrear,
  tipoDesdeTexto,
  tituloDe,
} from './borrador';

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


describe('escala: muchos inmuebles (20-10-2026)', () => {
  it('cada tarjeta nace con su llave anti-duplicados, en el formato que pide el back', () => {
    const a = inmuebleVacio('a');
    const b = inmuebleVacio('b');
    expect(a.llave).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(a.llave).not.toBe(b.llave);
    expect(nuevaLlave()).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });

  it('el tipo sale del texto sin inventar: apartaestudio antes que apartamento, lote queda sin tipo', () => {
    expect(tipoDesdeTexto('Apartaestudio')).toBe('STUDIO');
    expect(tipoDesdeTexto('APARTAMENTO')).toBe('APARTMENT');
    expect(tipoDesdeTexto('apto')).toBe('APARTMENT');
    expect(tipoDesdeTexto('Casa')).toBe('HOUSE');
    expect(tipoDesdeTexto('Local comercial')).toBe('COMMERCIAL');
    expect(tipoDesdeTexto('Local')).toBe('COMMERCIAL');
    expect(tipoDesdeTexto('Locales')).toBe('COMMERCIAL');
    expect(tipoDesdeTexto('Oficina')).toBe('OFFICE');
    expect(tipoDesdeTexto('Bodega')).toBe('WAREHOUSE');
    expect(tipoDesdeTexto('Habitación')).toBe('ROOM');
    expect(tipoDesdeTexto('WAREHOUSE')).toBe('WAREHOUSE');
    expect(tipoDesdeTexto('Lote')).toBeNull();
    expect(tipoDesdeTexto('')).toBeNull();
  });

  it('una fila del Excel o un enlace se vuelve tarjeta con lo que trae, y nada más', () => {
    const { inmueble, fotos } = desdeImportProperty(
      {
        _rowIndex: 3,
        externalId: 'INM-041',
        propertyType: 'Apartamento',
        propertyAddress: ' Cra 76 # 34-21 apto 301 ',
        propertyCity: 'Medellín',
        propertyZone: 'Laureles',
        listingType: 'Arriendo',
        monthlyRent: 2_800_000,
        bedrooms: 3,
        bathrooms: 2,
        propertyArea: 84.4,
        fotos: 'https://x.co/1.jpg, https://x.co/2.jpg https://x.co/1.jpg',
        suggestions: [],
        selected: true,
        hasErrors: false,
        errorMessages: [],
      },
      'k1',
      { tipo: 'excel', etiqueta: 'Fila 3' },
    );
    expect(inmueble).toMatchObject({
      clave: 'k1',
      operacion: 'rent',
      tipo: 'APARTMENT',
      direccion: 'Cra 76 # 34-21 apto 301',
      ciudad: 'Medellín',
      barrio: 'Laureles',
      precio: 2_800_000,
      habitaciones: 3,
      banos: 2,
      area: 84,
      codigo: 'INM-041',
      origen: { tipo: 'excel', etiqueta: 'Fila 3' },
    });
    expect(fotos).toEqual(['https://x.co/1.jpg', 'https://x.co/2.jpg']);

    const venta = desdeImportProperty(
      { _rowIndex: 1, listingType: 'Venta', salePrice: 450_000_000, suggestions: [], selected: true, hasErrors: false, errorMessages: [] },
      'k2',
    ).inmueble;
    expect(venta).toMatchObject({ operacion: 'sale', precio: 450_000_000, tipo: null, direccion: '' });
  });

  it('las fotos de una celda: sólo URLs, sin repetidas', () => {
    expect(fotosDeLaCelda('https://a.co/1.jpg;https://a.co/2.png\nnada https://a.co/1.jpg')).toEqual([
      'https://a.co/1.jpg',
      'https://a.co/2.png',
    ]);
    expect(fotosDeLaCelda(undefined)).toEqual([]);
  });

  it('la misma dirección escrita distinto se reconoce; otra unidad del edificio no', () => {
    expect(llaveDeDireccion('Cra. 76 #34-21, apto 301', 'Medellín')).toBe(llaveDeDireccion('carrera 76 n 34 21 apartamento 301', 'medellin'));
    expect(llaveDeDireccion('Cra 76 # 34-21 apto 301')).not.toBe(llaveDeDireccion('Cra 76 # 34-21 apto 502'));
    expect(llaveDeDireccion('Laureles')).toBeNull();

    const lista = [
      { ...inmuebleVacio('a'), direccion: 'Calle 10 # 43-21', ciudad: 'Medellín' },
      { ...inmuebleVacio('b'), direccion: 'Cl 10 #43 - 21', ciudad: 'Medellín' },
      { ...inmuebleVacio('c'), direccion: 'Calle 10 # 43-21', ciudad: 'Bogotá' },
    ];
    expect([...direccionesRepetidas(lista)]).toEqual([['b', 1]]);
  });
});
