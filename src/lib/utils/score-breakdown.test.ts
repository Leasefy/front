import { describe, it, expect } from 'vitest';
import { partitionScoreBreakdown } from './score-breakdown';
import type { ScoreBreakdown } from '@/lib/api/applications.types';

const factor = (value: number, weight: number, source = 'micro', weighted = 0) => ({
  value,
  weight,
  weighted,
  source,
});

// Real response shape from the 2026-06-10 evaluation (score 71):
// five real dimensions (weights sum 100) + two credit sub-components.
const FULL_BREAKDOWN: ScoreBreakdown = {
  bureau: factor(0, 15, 'experian_via_fianly_unavailable'),
  credito: factor(13, 30, 'bureau+asegurabilidad', 4),
  identidad: factor(100, 5, 'cedula', 5),
  solvencia: factor(100, 40, 'income', 40),
  asegurabilidad: factor(25, 15, 'fianly'),
  estabilidad_laboral: factor(93, 15, 'employment', 14),
  consistencia_cruzada: factor(79, 10, 'cross', 8),
};

describe('partitionScoreBreakdown', () => {
  it('excludes bureau and asegurabilidad from the main grid', () => {
    const { main } = partitionScoreBreakdown(FULL_BREAKDOWN);
    const keys = main.map(([k]) => k);
    expect(keys).not.toContain('bureau');
    expect(keys).not.toContain('asegurabilidad');
  });

  it('main dimension weights sum exactly 100', () => {
    const { main } = partitionScoreBreakdown(FULL_BREAKDOWN);
    const total = main.reduce((acc, [, f]) => acc + f.weight, 0);
    expect(total).toBe(100);
  });

  it('orders main dimensions by weight, heaviest first', () => {
    // Antes era un orden fijo que abría con `credito`: pesa 30 pero suele ser
    // el puntaje más bajo, así que la lista empezaba con lo peor.
    const { main } = partitionScoreBreakdown(FULL_BREAKDOWN);
    expect(main.map(([k]) => k)).toEqual([
      'solvencia', // 40
      'credito', // 30
      'estabilidad_laboral', // 15
      'consistencia_cruzada', // 10
      'identidad', // 5
    ]);
  });

  it('breaks weight ties with the known order, so nothing jumps between renders', () => {
    const empatadas: ScoreBreakdown = {
      consistencia_cruzada: factor(79, 10, 'cross', 8),
      identidad: factor(100, 10, 'cedula', 10),
      credito: factor(13, 10, 'bureau+asegurabilidad', 1),
    };
    expect(partitionScoreBreakdown(empatadas).main.map(([k]) => k)).toEqual([
      'credito',
      'identidad',
      'consistencia_cruzada',
    ]);
  });

  it('nests bureau and asegurabilidad as credit detail', () => {
    const { creditDetail } = partitionScoreBreakdown(FULL_BREAKDOWN);
    expect(creditDetail).not.toBeNull();
    expect(creditDetail!.bureau?.value).toBe(0);
    expect(creditDetail!.asegurabilidad?.value).toBe(25);
  });

  it('flags bureauUnavailable when source is experian_via_fianly_unavailable', () => {
    const { creditDetail } = partitionScoreBreakdown(FULL_BREAKDOWN);
    expect(creditDetail!.bureauUnavailable).toBe(true);
  });

  it('does not flag bureauUnavailable when the bureau responded', () => {
    const breakdown: ScoreBreakdown = {
      ...FULL_BREAKDOWN,
      bureau: factor(80, 15, 'experian_via_fianly'),
    };
    expect(partitionScoreBreakdown(breakdown).creditDetail!.bureauUnavailable).toBe(false);
  });

  it('returns null creditDetail when sub-components are absent (legacy payloads)', () => {
    const legacy: ScoreBreakdown = {
      solvencia: factor(70, 40),
      credito: factor(50, 30),
    };
    const { main, creditDetail } = partitionScoreBreakdown(legacy);
    expect(creditDetail).toBeNull();
    expect(main).toHaveLength(2);
  });

  it('keeps unknown future dimensions in the main grid, after the known ones', () => {
    const withUnknown: ScoreBreakdown = {
      ...FULL_BREAKDOWN,
      nueva_dimension: factor(50, 5),
    };
    const keys = partitionScoreBreakdown(withUnknown).main.map(([k]) => k);
    expect(keys[keys.length - 1]).toBe('nueva_dimension');
  });
});
