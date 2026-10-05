import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({ cicloDeVidaApi: {} }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: {} }));

import { pistaDeLaFechaDeCesion } from './CesionDelInmueble';

describe('QA-CONT-95 · E-10 la cesión a mitad de mes lo dice', () => {
  it('🔴 desde el 16 de noviembre: noviembre queda completo del dueño de hoy, y se dice', () => {
    expect(pistaDeLaFechaDeCesion('2026-11-16', 'Pedro')).toContain('noviembre de 2026 queda completo de Pedro');
  });
  it('desde el 1.º no hay nada que advertir', () => {
    expect(pistaDeLaFechaDeCesion('2026-11-01', 'Pedro')).toBe('Tiene que ser posterior al último período ya cobrado.');
  });
});
