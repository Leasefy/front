/**
 * IN-16 (QA 04-10): el paso «Propiedad» exigía barrio, habitaciones, baños,
 * área y descripción para cualquier tipo (un Lote pedía baños) y mandaba
 * 0 / 1 / 10 de relleno cuando no se escribían.
 */
import { describe, it, expect } from 'vitest';
import {
  datosOpcionalesParaCrear,
  descripcionValida,
  llevaHabitaciones,
  pasoDelInmuebleCompleto,
} from './reglas-del-paso-del-inmueble';

const minimo = {
  propertyType: 'land',
  propertyTitle: 'Lote en Rionegro',
  propertyAddress: 'Vereda Llanogrande km 3',
  propertyCity: 'Rionegro',
  listingType: 'rent' as const,
  monthlyRent: 3500000,
};

describe('reglas del paso del inmueble (IN-16)', () => {
  it('sólo tipo, título, dirección, ciudad y canon son obligatorios', () => {
    expect(pasoDelInmuebleCompleto(minimo)).toBe(true);
    for (const falta of ['propertyType', 'propertyTitle', 'propertyAddress', 'propertyCity', 'monthlyRent'] as const) {
      expect(pasoDelInmuebleCompleto({ ...minimo, [falta]: undefined })).toBe(false);
    }
  });

  it('en venta pide el precio de venta, no el canon', () => {
    expect(pasoDelInmuebleCompleto({ ...minimo, listingType: 'sale', monthlyRent: null })).toBe(false);
    expect(pasoDelInmuebleCompleto({ ...minimo, listingType: 'sale', monthlyRent: null, salePrice: 350000000 })).toBe(true);
  });

  it('la descripción es opcional; si se escribe, entre 20 y 5.000', () => {
    expect(descripcionValida('')).toBe(true);
    expect(descripcionValida(undefined)).toBe(true);
    expect(descripcionValida('corta')).toBe(false);
    expect(descripcionValida('Lote plano con servicios y vía pavimentada.')).toBe(true);
    expect(pasoDelInmuebleCompleto({ ...minimo, propertyDescription: 'corta' })).toBe(false);
  });

  it('habitaciones y baños sólo para los tipos que los tienen', () => {
    for (const t of ['commercial', 'office', 'warehouse', 'land', 'parking']) expect(llevaHabitaciones(t)).toBe(false);
    for (const t of ['apartment', 'house', 'studio']) expect(llevaHabitaciones(t)).toBe(true);
    expect(llevaHabitaciones(undefined)).toBe(true);
  });

  it('🔴 lo que no se escribió viaja vacío, nunca 0 / 1 / 10 de relleno', () => {
    expect(datosOpcionalesParaCrear({ propertyType: 'apartment' })).toEqual({
      neighborhood: null,
      bedrooms: null,
      bathrooms: null,
      area: null,
    });
  });

  it('un Lote no manda habitaciones ni baños aunque hayan quedado escritos de otro tipo', () => {
    expect(
      datosOpcionalesParaCrear({ propertyType: 'land', bedrooms: 3, bathrooms: 2, area: 500, propertyZone: ' Llanogrande ' }),
    ).toEqual({ neighborhood: 'Llanogrande', bedrooms: null, bathrooms: null, area: 500 });
  });

  it('la descripción escrita viaja recortada', () => {
    expect(datosOpcionalesParaCrear({ propertyType: 'house', propertyDescription: '  Casa con patio y garaje cubierto.  ' }).description).toBe(
      'Casa con patio y garaje cubierto.',
    );
  });
});
