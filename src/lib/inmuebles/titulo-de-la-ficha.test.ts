import { describe, expect, it } from 'vitest';

import {
  ciudadDeLaDireccion,
  portadaDelInmueble,
  sinMayusculasSostenidas,
  tituloEsDireccion,
} from './titulo-de-la-ficha';

describe('portadaDelInmueble', () => {
  it('🔴 el título que es una dirección cruda pasa a «Apartamento en Caldas», con la dirección legible', () => {
    const p = portadaDelInmueble(
      {
        propertyTitle: 'CR 53 CL 129 SUR - 58 INT 701 BARRIO LOCERIA , CALDAS - ANTIOQUIA',
        propertyCity: 'Medellín',
      },
      'Apartamento',
    );
    expect(p.titulo).toBe('Apartamento en Caldas');
    expect(p.direccion).toBe('Carrera 53 # 129 Sur - 58 · int. 701');
    expect(p.eraDireccion).toBe(true);
    // El registro dice Medellín y la dirección Caldas: se afirma la de la dirección.
    expect(p.ciudad).toBe('Caldas');
  });

  it('un título de verdad queda como vino', () => {
    const p = portadaDelInmueble({ propertyTitle: 'Apartamento en Sabaneta', propertyCity: 'Sabaneta' }, 'Apartamento');
    expect(p).toEqual({ titulo: 'Apartamento en Sabaneta', direccion: null, ciudad: 'Sabaneta', eraDireccion: false });
  });

  it('sin ciudad en ninguna parte, el título es el tipo', () => {
    expect(portadaDelInmueble({ propertyTitle: 'CL 10 # 20 - 30', propertyCity: null }, 'Casa').titulo).toBe('Casa');
  });
});

describe('piezas', () => {
  it('«MONTEFLOR ACACIA» se escribe con mayúscula inicial; lo que ya trae minúsculas no se toca', () => {
    expect(sinMayusculasSostenidas('MONTEFLOR ACACIA')).toBe('Monteflor Acacia');
    expect(sinMayusculasSostenidas('URBANIZACION LA FLORESTA')).toBe('Urbanizacion la Floresta');
    expect(sinMayusculasSostenidas('Acuarela del Río')).toBe('Acuarela del Río');
    expect(sinMayusculasSostenidas('CR')).toBe('CR');
  });

  it('una vía al PRINCIPIO es una dirección; «Apartamento en la Calle 10» no', () => {
    expect(tituloEsDireccion('CR 53 CL 129 SUR - 58')).toBe(true);
    expect(tituloEsDireccion('Calle 10 # 20 - 30')).toBe(true);
    expect(tituloEsDireccion('Apartamento en la Calle 10 # 20')).toBe(false);
    expect(tituloEsDireccion('MONTEFLOR ACACIA')).toBe(false);
  });

  it('la ciudad sale de después de la coma, sin el departamento', () => {
    expect(ciudadDeLaDireccion('CR 53 CL 129 SUR - 58, CALDAS - ANTIOQUIA')).toBe('Caldas');
    expect(ciudadDeLaDireccion('CR 53 CL 129 SUR - 58')).toBeNull();
  });
});
