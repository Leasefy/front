import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { guardarArriendoEnCurso, leerArriendoEnCurso, olvidarArriendoEnCurso, nombreDelTipo } from './arriendo-en-curso';

const base = {
  propertyId: 'p-1',
  titulo: 'Apartamento en Bello',
  ciudad: 'Bello',
  tipo: 'apartamento' as const,
  foto: null,
  canon: 1_100_000,
  ingresoTotal: 3_100_000,
  canonMaximo: 2_066_666,
};

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe('arriendo en curso', () => {
  it('guarda y lee el inmueble del recorrido', () => {
    guardarArriendoEnCurso(base);
    expect(leerArriendoEnCurso('p-1')?.titulo).toBe('Apartamento en Bello');
  });

  it('otro inmueble no se confunde con éste', () => {
    guardarArriendoEnCurso(base);
    expect(leerArriendoEnCurso('p-2')).toBeNull();
  });

  it('vence a las 24 horas y se puede olvidar', () => {
    vi.useFakeTimers();
    guardarArriendoEnCurso(base);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(leerArriendoEnCurso()).toBeNull();
    vi.useRealTimers();
    guardarArriendoEnCurso(base);
    olvidarArriendoEnCurso();
    expect(leerArriendoEnCurso()).toBeNull();
  });

  it('nombra el tipo para la felicitación', () => {
    expect(nombreDelTipo('casa')).toBe('casa');
    expect(nombreDelTipo(null)).toBe('inmueble');
  });
});
