import { describe, expect, it } from 'vitest';
import { diaDeLaProximaAccion, proximaAccionVencida } from './proxima-accion';

describe('la próxima acción del interesado es un día (IMANA-5)', () => {
  it('lee el día tal cual, sin correrlo a la víspera', () => {
    expect(diaDeLaProximaAccion('2026-10-17T00:00:00.000Z')).toBe('2026-10-17');
    expect(diaDeLaProximaAccion('2026-10-19')).toBe('2026-10-19');
    expect(diaDeLaProximaAccion(null)).toBeNull();
    expect(diaDeLaProximaAccion('mañana')).toBeNull();
  });

  it('lo de hoy no está vencido; lo de ayer sí; la visita del lunes tampoco', () => {
    const hoy = '2026-10-17';
    expect(proximaAccionVencida('2026-10-17T00:00:00.000Z', hoy)).toBe(false);
    expect(proximaAccionVencida('2026-10-16T00:00:00.000Z', hoy)).toBe(true);
    expect(proximaAccionVencida('2026-10-19T00:00:00.000Z', hoy)).toBe(false);
    expect(proximaAccionVencida(undefined, hoy)).toBe(false);
  });
});
