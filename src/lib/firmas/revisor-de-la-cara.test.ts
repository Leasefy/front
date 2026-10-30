/**
 * Qué le dice la cámara del firmante a la persona antes de dejarla tomar la foto (Nico, 28-10-2026: «cámara propia +
 * revisar la cara»). Cuadro de 640 × 480: la cara tiene que medir al menos 22 % de 480 ≈ 106 px.
 */
import { describe, expect, it } from 'vitest';

import { encuadreDeLaFoto, type CaraVista } from './revisor-de-la-cara';

const cara = (o: Partial<CaraVista> = {}): CaraVista => ({ x: 240, y: 140, ancho: 160, alto: 190, puntaje: 0.9, ...o });

describe('encuadreDeLaFoto', () => {
  it('una cara grande y centrada: lista', () => {
    expect(encuadreDeLaFoto([cara()], 640, 480)).toBe('lista');
  });

  it('sin cara, o un cuadro sin tamaño todavía: pide ponerla en el óvalo', () => {
    expect(encuadreDeLaFoto([], 640, 480)).toBe('sin-cara');
    expect(encuadreDeLaFoto([cara()], 0, 0)).toBe('sin-cara');
  });

  it('dos personas de cerca: que salga sólo una; una cara chiquita al fondo no cuenta', () => {
    expect(encuadreDeLaFoto([cara(), cara({ x: 60, ancho: 120 })], 640, 480)).toBe('varias');
    expect(encuadreDeLaFoto([cara(), cara({ x: 20, y: 20, ancho: 40, alto: 48 })], 640, 480)).toBe('lista');
  });

  it('lejos de la cámara: acércate', () => {
    expect(encuadreDeLaFoto([cara({ x: 290, y: 190, ancho: 90, alto: 100 })], 640, 480)).toBe('lejos');
  });

  it('pegada a un borde: céntrala', () => {
    expect(encuadreDeLaFoto([cara({ x: 0, y: 140 })], 640, 480)).toBe('fuera');
    expect(encuadreDeLaFoto([cara({ x: 240, y: 340, alto: 140 })], 640, 480)).toBe('fuera');
  });
});
