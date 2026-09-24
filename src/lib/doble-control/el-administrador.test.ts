/**
 * P-4 aclarado (Nico, 24-09): el administrador no se confirma a sí mismo. La
 * pantalla lo LEE de lo que el back escribió (quien aprobó = quien armó), no
 * lo adivina.
 */

import { describe, it, expect } from 'vitest';

import {
  APROBADO_POR_LA_MISMA_PERSONA,
  APROBADO_POR_TI,
  aprobadoPorQuienLoArmo,
  castigadoPorUnaSolaPersona,
  loApruebaElQueLoArmo,
  notaDelCastigo,
  notaDelLote,
} from './el-administrador';

describe('el lote que armó y aprobó la misma persona', () => {
  it('🔴 quien mira es quien lo armó y aprobó: «aprobado por ti como administrador (P-4)»', () => {
    const nota = notaDelLote({ creadoPorUserId: 'u-nico', aprobadoPorUserId: 'u-nico' }, 'u-nico');
    expect(nota?.titulo).toBe(APROBADO_POR_TI);
    expect(APROBADO_POR_TI).toBe('Aprobado por ti como administrador (P-4)');
    expect(nota?.detalle).toMatch(/mismo paso, sin código/);
  });

  it('lo mira otra persona: lo dice sin «ti»', () => {
    expect(notaDelLote({ creadoPorUserId: 'u-nico', aprobadoPorUserId: 'u-nico' }, 'u-ana')?.titulo).toBe(
      APROBADO_POR_LA_MISMA_PERSONA,
    );
  });

  it('aprobado por otra persona, o sin aprobar: ninguna nota', () => {
    expect(notaDelLote({ creadoPorUserId: 'u-ana', aprobadoPorUserId: 'u-nico' }, 'u-nico')).toBeNull();
    expect(notaDelLote({ creadoPorUserId: 'u-nico', aprobadoPorUserId: null }, 'u-nico')).toBeNull();
    expect(aprobadoPorQuienLoArmo({ creadoPorUserId: null, aprobadoPorUserId: null })).toBe(false);
  });
});

describe('el castigo firmado por los dos lados por la misma persona', () => {
  it('🔴 lo dice, y sólo cuando la firma es la misma', () => {
    const suyo = { admin: { userId: 'u-nico' }, contador: { userId: 'u-nico' } };
    expect(castigadoPorUnaSolaPersona(suyo)).toBe(true);
    expect(notaDelCastigo(suyo, 'u-nico')?.titulo).toBe('Castigado por ti como administrador (P-4)');
    expect(notaDelCastigo({ admin: { userId: 'u-nico' }, contador: { userId: 'u-beto' } }, 'u-nico')).toBeNull();
    expect(notaDelCastigo({ admin: { userId: 'u-nico' }, contador: null }, 'u-nico')).toBeNull();
  });
});

describe('¿el que mira es el administrador que lo armó?', () => {
  it('sólo administrador y quien lo armó', () => {
    expect(loApruebaElQueLoArmo({ creadoPorUserId: 'u-nico' }, 'u-nico', true)).toBe(true);
    expect(loApruebaElQueLoArmo({ creadoPorUserId: 'u-nico' }, 'u-nico', false)).toBe(false);
    expect(loApruebaElQueLoArmo({ creadoPorUserId: 'u-ana' }, 'u-nico', true)).toBe(false);
    expect(loApruebaElQueLoArmo({ creadoPorUserId: 'u-nico' }, null, true)).toBe(false);
  });
});
