import { describe, it, expect } from 'vitest';
import {
  comoSeLeeLaOcupacion,
  cuentaParaLaOcupacion,
  ocupacionDelPortafolio,
  type EstadoDeInmueble,
  type InmuebleParaOcupacion,
} from './ocupacion';

/**
 * Las dos reglas de Nico (2026-09-12), fijadas del lado del front con los
 * mismos casos que el back:
 *   1. arrendados = inmuebles DISTINTOS con contrato vigente;
 *   2. la tasa se mide contra el CATÁLOGO.
 *
 * Son cuentas: `tsc` queda verde con la fórmula equivocada y el número sigue
 * pareciendo razonable, así que se asserta el RESULTADO.
 */

const inmueble = (
  id: string,
  estado: EstadoDeInmueble,
  arrendado: boolean,
): InmuebleParaOcupacion => ({ id, estado, arrendado });

describe('ocupacionDelPortafolio', () => {
  it('cuenta arrendados por CONTRATO, no por el estado del inmueble', () => {
    const o = ocupacionDelPortafolio([
      inmueble('a', 'AVAILABLE', true),
      inmueble('b', 'RENTED', false),
      inmueble('c', 'RENTED', true),
    ]);

    expect(o.arrendados).toBe(2);
    expect(o.enCatalogo).toBe(3);
    expect(o.disponibles).toBe(1);
    expect(o.tasa).toBeCloseTo(66.67, 1);
  });

  it('los inmuebles FUERA DEL CATÁLOGO no entran al denominador', () => {
    const o = ocupacionDelPortafolio([
      inmueble('a', 'RENTED', true),
      inmueble('b', 'AVAILABLE', false),
      inmueble('fuera-1', 'DRAFT', false),
      inmueble('fuera-2', 'DRAFT', false),
    ]);

    expect(o.total).toBe(4);
    expect(o.enCatalogo).toBe(2);
    expect(o.fueraDelCatalogo).toBe(2);
    // 1 de 2, no 1 de 4.
    expect(o.tasa).toBe(50);
  });

  it('un arrendado fuera del catálogo no pasa la tasa del 100 %', () => {
    const o = ocupacionDelPortafolio([
      inmueble('a', 'RENTED', true),
      inmueble('raro', 'DRAFT', true),
    ]);

    expect(o.arrendados).toBe(2);
    expect(o.arrendadosEnCatalogo).toBe(1);
    expect(o.arrendadosFueraDelCatalogo).toBe(1);
    expect(o.tasa).toBe(100);
  });

  it('DOS contratos vigentes sobre el mismo inmueble son UN arrendado', () => {
    const o = ocupacionDelPortafolio([
      inmueble('a', 'RENTED', true),
      inmueble('a', 'RENTED', true),
      inmueble('b', 'AVAILABLE', false),
    ]);

    expect(o.total).toBe(2);
    expect(o.arrendados).toBe(1);
    expect(o.tasa).toBe(50);
  });

  it('sin contratos la tasa es 0 %, que es una medición real', () => {
    const o = ocupacionDelPortafolio([
      inmueble('a', 'AVAILABLE', false),
      inmueble('b', 'PENDING', false),
    ]);

    expect(o.arrendados).toBe(0);
    expect(o.enCatalogo).toBe(2);
    expect(o.tasa).toBe(0);
  });

  it('sin catálogo NO hay tasa: null, nunca un 0 % inventado', () => {
    const o = ocupacionDelPortafolio([inmueble('fuera', 'DRAFT', false)]);

    expect(o.enCatalogo).toBe(0);
    expect(o.tasa).toBeNull();
  });

  it('un portafolio vacío tampoco tiene tasa', () => {
    expect(ocupacionDelPortafolio([]).tasa).toBeNull();
  });
});

describe('cuentaParaLaOcupacion', () => {
  it('sólo DRAFT queda fuera del catálogo', () => {
    expect(cuentaParaLaOcupacion('DRAFT')).toBe(false);
    for (const estado of ['AVAILABLE', 'RENTED', 'PENDING', 'RESERVED'] as const) {
      expect(cuentaParaLaOcupacion(estado)).toBe(true);
    }
  });
});

describe('comoSeLeeLaOcupacion', () => {
  it('dice QUÉ cuenta, nunca un porcentaje suelto', () => {
    expect(
      comoSeLeeLaOcupacion({
        arrendados: 730,
        enCatalogo: 880,
        fueraDelCatalogo: 1944,
      }),
    ).toBe('730 arrendados de 880 en catálogo · 1.944 fuera del catálogo');
  });

  it('omite el pedazo que no aplica', () => {
    expect(comoSeLeeLaOcupacion({ arrendados: 1, enCatalogo: 2 })).toBe(
      '1 arrendados de 2 en catálogo',
    );
  });
});
