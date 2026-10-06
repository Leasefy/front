import { describe, expect, it } from 'vitest';

import {
  detalleDelAtraso,
  fechaCortaDelGiro,
  generadoSinGirarDeLaLista,
  girosDelPropietario,
} from './giros-del-propietario';

/** El `t` de las pruebas: la clave y sus parámetros, para ver qué se eligió. */
const t = (clave: string, params?: Record<string, string | number>) =>
  params ? `${clave}(${Object.values(params).join(',')})` : clave;

const HOY = new Date('2026-10-03T12:00:00');

describe('girosDelPropietario — 🔴 P-10: `pendingBalance` ya es lo VENCIDO sin girar', () => {
  it('lee el atraso, cuántos giros y desde cuándo, y lo generado aparte', () => {
    const g = girosDelPropietario({
      pendingBalance: 23_698_900,
      girosVencidos: 13,
      giroVencidoDesde: '2025-11-01',
      generadoSinGirar: 3_656_150,
    });
    expect(g).toEqual({
      oculto: false,
      atrasado: 23_698_900,
      girosVencidos: 13,
      desde: '2025-11-01',
      generadoSinGirar: 3_656_150,
      conAtraso: true,
      // COLA-FRONT (04-10): con atraso no es «sin día de giro».
      sinDiaDeGiro: false,
    });
  });

  it('🔴 lo generado en Dispersiones NO es atraso: sin vencido, está al día aunque haya generado', () => {
    const g = girosDelPropietario({ pendingBalance: 0, girosVencidos: 0, giroVencidoDesde: null, generadoSinGirar: 1_200_000 });
    expect(g.conAtraso).toBe(false);
    expect(g.generadoSinGirar).toBe(1_200_000);
  });

  it('🔴 P-21: con la plata oculta (asesor) no afirma nada, ni cero ni «al día»', () => {
    const g = girosDelPropietario({
      pendingBalance: null as unknown as number,
      girosVencidos: null,
      giroVencidoDesde: null,
      generadoSinGirar: null,
      plataOculta: true,
    });
    expect(g.oculto).toBe(true);
    expect(g.conAtraso).toBe(false);
    expect(g.generadoSinGirar).toBeNull();
  });

  it('un back anterior (sin los campos nuevos) no inventa conteos ni generado', () => {
    const g = girosDelPropietario({ pendingBalance: 500_000 });
    expect(g.girosVencidos).toBeNull();
    expect(g.desde).toBeNull();
    expect(g.generadoSinGirar).toBeNull();
    expect(g.conAtraso).toBe(true);
  });
});

describe('detalleDelAtraso', () => {
  it('varios giros con fecha: «13 giros vencidos desde el 1 nov 2025»', () => {
    const g = girosDelPropietario({ pendingBalance: 1, girosVencidos: 13, giroVencidoDesde: '2025-11-01' });
    expect(detalleDelAtraso(g, t, HOY)).toBe('inmobiliaria.propietario.giros.variosDesde(13,1 nov 2025)');
  });

  it('uno solo, en singular y sin el año de hoy', () => {
    const g = girosDelPropietario({ pendingBalance: 1, girosVencidos: 1, giroVencidoDesde: '2026-10-01' });
    expect(detalleDelAtraso(g, t, HOY)).toBe('inmobiliaria.propietario.giros.unoDesde(1 oct)');
  });

  it('sin atraso no hay línea', () => {
    expect(detalleDelAtraso(girosDelPropietario({ pendingBalance: 0, girosVencidos: 0 }), t, HOY)).toBeNull();
  });

  it('un back anterior: sin conteo ni fecha no hay línea (no se inventa)', () => {
    expect(detalleDelAtraso(girosDelPropietario({ pendingBalance: 9 }), t, HOY)).toBeNull();
  });
});

describe('fechaCortaDelGiro', () => {
  it('el día civil no se corre al anterior en Bogotá', () => {
    expect(fechaCortaDelGiro('2026-08-01', HOY)).toBe('1 ago');
  });
});

describe('generadoSinGirarDeLaLista', () => {
  it('suma lo que traen; un back anterior (nadie lo trae) es «no sé», no cero', () => {
    expect(generadoSinGirarDeLaLista([{ pendingBalance: 0, generadoSinGirar: 100 }, { pendingBalance: 0, generadoSinGirar: 50 }])).toBe(150);
    expect(generadoSinGirarDeLaLista([{ pendingBalance: 0 }])).toBeNull();
  });

  it('con la plata oculta no suma nada', () => {
    expect(generadoSinGirarDeLaLista([{ pendingBalance: 0, generadoSinGirar: null, plataOculta: true }])).toBeNull();
  });
});
