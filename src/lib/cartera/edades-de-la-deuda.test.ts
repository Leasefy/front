/**
 * El lector de tramos de la cartera de propietarios.
 *
 * Son cuatro funciones cortas, y aun así tienen prueba: las tres pantallas que
 * las usan (la cartera, el pie de su tabla y la ficha del propietario) leen el
 * MISMO tramo por acá. Un cero devuelto donde había plata sería un $0 en tres
 * lugares a la vez.
 */

import { describe, it, expect } from 'vitest';

import { EDADES } from '@/lib/cartera/edades';
import {
  enElTramo,
  renglonesEnElTramo,
  sinEdades,
  tramosVacios,
} from '@/lib/cartera/edades-de-la-deuda';
import type { DeudaPorEdades } from '@/lib/types/deducciones';

const EJEMPLO: DeudaPorEdades = {
  tramos: [
    { tramo: '0-30', nombre: '0-30 días', debeCop: 80_000, renglones: 2 },
    { tramo: '31-60', nombre: '31-60 días', debeCop: 0, renglones: 0 },
    { tramo: '61-90', nombre: '61-90 días', debeCop: 0, renglones: 0 },
    { tramo: '90+', nombre: '+90 días', debeCop: 300_000, renglones: 1 },
  ],
  diasDelMasViejo: 200,
};

describe('los tramos de la cartera de propietarios', () => {
  it('busca por nombre de tramo, no por posición en el arreglo', () => {
    // Al revés: si indexara por posición, esto daría 300.000 en «0-30».
    const alReves: DeudaPorEdades = {
      ...EJEMPLO,
      tramos: [...EJEMPLO.tramos].reverse(),
    };
    expect(enElTramo(alReves, '0-30')).toBe(80_000);
    expect(enElTramo(alReves, '90+')).toBe(300_000);
  });

  it('devuelve cero —no undefined— cuando el back no mandó el informe', () => {
    expect(enElTramo(undefined, '0-30')).toBe(0);
    expect(renglonesEnElTramo(undefined, '90+')).toBe(0);
  });

  it('los cuatro tramos vacíos salen en orden y en cero', () => {
    expect(tramosVacios().map((t) => t.tramo)).toEqual(EDADES);
    expect(tramosVacios().every((t) => t.debeCop === 0)).toBe(true);
    expect(sinEdades().diasDelMasViejo).toBe(0);
  });

  it('cuenta los renglones de cada tramo', () => {
    expect(renglonesEnElTramo(EJEMPLO, '0-30')).toBe(2);
    expect(renglonesEnElTramo(EJEMPLO, '31-60')).toBe(0);
  });

  it('🔴 los cuatro tramos suman lo que se debe', () => {
    expect(EDADES.reduce((s, e) => s + enElTramo(EJEMPLO, e), 0)).toBe(380_000);
  });
});
