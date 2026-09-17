/**
 * La aritmética del editor de deterioro: la misma del back, hecha acá para que
 * el contador vea el efecto de bajar un porcentaje en el mismo gesto.
 */

import { describe, it, expect } from 'vitest';

import type { TramoCalculado } from '@/lib/api/finanzas.types';
import {
  hayCambios,
  movimientoDelMes,
  porcentajesFueraDeRango,
  provisionDelTramo,
  queSeAsienta,
  recalcularTramos,
  totalProvisionado,
  tramosParaGuardar,
} from './deterioro';

const TRAMOS: TramoCalculado[] = [
  {
    nombre: 'Hasta 90 días',
    desdeDias: 0,
    hastaDias: 90,
    porcentaje: 0,
    porcentajeSugerido: 0,
    carteraCop: 400_000_000,
    provisionCop: 0,
    cuotas: 300,
  },
  {
    nombre: 'Más de 180 días',
    desdeDias: 180,
    hastaDias: null,
    porcentaje: 100,
    porcentajeSugerido: 100,
    carteraCop: 30_000_000,
    provisionCop: 30_000_000,
    cuotas: 12,
  },
];

describe('recalcular', () => {
  it('la provisión de un tramo es el porcentaje de su cartera, al peso', () => {
    expect(provisionDelTramo(30_000_000, 60)).toBe(18_000_000);
    expect(provisionDelTramo(1_000_001, 33.33)).toBe(333_300);
    expect(provisionDelTramo(0, 100)).toBe(0);
  });

  it('un porcentaje editado sólo mueve su tramo', () => {
    const r = recalcularTramos(TRAMOS, { 'Más de 180 días': 60 });
    expect(r[0].provisionCop).toBe(0);
    expect(r[1].porcentaje).toBe(60);
    expect(r[1].provisionCop).toBe(18_000_000);
    expect(totalProvisionado(r)).toBe(18_000_000);
  });

  it('sin ediciones, el resultado es el que trajo el back', () => {
    expect(totalProvisionado(recalcularTramos(TRAMOS, {}))).toBe(30_000_000);
    expect(hayCambios(TRAMOS, {})).toBe(false);
    expect(hayCambios(TRAMOS, { 'Más de 180 días': 100 })).toBe(false);
    expect(hayCambios(TRAMOS, { 'Más de 180 días': 60 })).toBe(true);
  });
});

describe('🔴 lo que se asienta es el movimiento', () => {
  it('positivo es gasto, negativo es recuperación, cero no asienta nada', () => {
    expect(movimientoDelMes(80_000_000, 60_000_000)).toBe(20_000_000);
    expect(movimientoDelMes(50_000_000, 60_000_000)).toBe(-10_000_000);
    expect(movimientoDelMes(60_000_000, 60_000_000)).toBe(0);
  });

  it('cada signo se explica con palabras, no con un signo', () => {
    expect(queSeAsienta(1)).toContain('GASTO');
    expect(queSeAsienta(-1)).toContain('RECUPERACIÓN');
    expect(queSeAsienta(0)).toContain('No hay asiento');
  });
});

describe('validación y forma de guardado', () => {
  it('nombra los tramos con un porcentaje imposible', () => {
    expect(porcentajesFueraDeRango(recalcularTramos(TRAMOS, { 'Hasta 90 días': 140 }))).toEqual([
      'Hasta 90 días',
    ]);
    expect(porcentajesFueraDeRango(TRAMOS)).toEqual([]);
  });

  it('a guardar van los porcentajes, nunca los pesos', () => {
    expect(tramosParaGuardar(recalcularTramos(TRAMOS, { 'Más de 180 días': 60 }))).toEqual([
      { nombre: 'Hasta 90 días', desdeDias: 0, hastaDias: 90, porcentaje: 0 },
      { nombre: 'Más de 180 días', desdeDias: 180, hastaDias: null, porcentaje: 60 },
    ]);
  });
});
