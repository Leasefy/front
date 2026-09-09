import { describe, expect, it } from 'vitest';
import { resumenDeLecturaDeInmuebles } from './resumenDeLectura';
import type { ImportProperty } from './importTypes';

function inmueble(p: Partial<ImportProperty>): ImportProperty {
  return {
    _rowIndex: 1,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    ...p,
  };
}

describe('resumenDeLecturaDeInmuebles', () => {
  it('cuenta lo que cada fila trae, no lo que se espera que traiga', () => {
    const r = resumenDeLecturaDeInmuebles([
      inmueble({
        externalId: '2945',
        propertyAddress: 'CRA 51 #96 SUR 50',
        propertyCity: 'La Estrella',
        ownerDocument: '901111111',
        ownerName: 'INVERSIONES DEL SUR S.A.S',
        listingType: 'Arriendo',
        monthlyRent: 1_900_000,
        stratum: 3,
      }),
      inmueble({ propertyAddress: 'CALLE 1', ownerName: 'ALGUIEN SIN CEDULA' }),
    ]);

    const por = Object.fromEntries(r.renglones.map((x) => [x.que, x.con]));
    expect(r.total).toBe(2);
    expect(por['Código del sistema anterior']).toBe(1);
    expect(por['Dirección']).toBe(2);
    expect(por['Ciudad']).toBe(1);
    expect(por['Propietario con documento']).toBe(1);
    expect(por['Precio (canon o venta)']).toBe(1);
    expect(por['Estrato']).toBe(1);
  });

  it('cuando algo falta, dice por qué y con cuántas', () => {
    const r = resumenDeLecturaDeInmuebles([
      inmueble({ propertyAddress: 'CALLE 1', ownerName: 'ALGUIEN SIN CEDULA' }),
    ]);
    const propietario = r.renglones.find((x) => x.que === 'Propietario con documento');
    expect(propietario?.porque).toContain('1 filas quedan sin cédula');
    expect(propietario?.porque).toContain('sólo el nombre');
  });

  it('cuando no falta nada, no inventa un motivo', () => {
    const r = resumenDeLecturaDeInmuebles([
      inmueble({
        externalId: '1',
        propertyAddress: 'CALLE 1',
        propertyCity: 'Medellín',
        ownerDocument: '123456',
        listingType: 'Arriendo',
        monthlyRent: 1_000_000,
        stratum: 4,
      }),
    ]);
    expect(r.renglones.every((x) => x.porque === '')).toBe(true);
  });

  it('un inmueble en venta se mide por su precio de venta, no por el canon', () => {
    const r = resumenDeLecturaDeInmuebles([
      inmueble({ listingType: 'Venta', salePrice: 240_000_000 }),
    ]);
    expect(r.renglones.find((x) => x.que === 'Precio (canon o venta)')?.con).toBe(1);
  });

  it('un archivo vacío no rompe ni afirma nada', () => {
    const r = resumenDeLecturaDeInmuebles([]);
    expect(r.total).toBe(0);
    expect(r.renglones.every((x) => x.con === 0)).toBe(true);
  });
});
