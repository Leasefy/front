/**
 * Un cambio masivo por filtro que se corta a mitad (02-10-2026).
 *
 * `resolverPorFiltro` (inmuebles y terceros) da vueltas por cursor y, si una
 * vuelta falla después de haber aplicado algo, devuelve lo hecho con
 * `interrumpida.motivo`. Ese motivo era `e.message` crudo («Error interno del
 * servidor.», «Failed to fetch») con «Se cortó la conexión a mitad» por
 * defecto: culpaba a la conexión aunque hubiera sido el servidor. Ahora pasa
 * por el traductor (la regla de oro).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const patchMock = vi.fn();
vi.mock('./client', async () => {
  const real = await vi.importActual<typeof import('./client')>('./client');
  return { ...real, apiClient: { ...real.apiClient, patch: (...a: unknown[]) => patchMock(...a) } };
});

import { ApiError } from './client';
import { inmueblesImportacionApi } from './inmuebles-importacion.service';
import { migracionTercerosApi } from './migracion-terceros.service';

const primeraVuelta = {
  lote: 'l1',
  totalCoincidentes: 400,
  procesadas: 200,
  aplicadas: 200,
  sinCambios: 0,
  listasAhora: 200,
  siguiente: 'cursor-1',
  fallidas: [],
};

function error500() {
  return new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor.',
    referencia: 'beef5678',
  });
}

describe.each([
  ['inmuebles', () => inmueblesImportacionApi.resolverPorFiltro('l1', {} as never, { campos: { city: 'Medellín' } } as never)],
  ['terceros', () => migracionTercerosApi.resolverPorFiltro('l1', {} as never, { campos: { city: 'Medellín' } } as never)],
])('resolverPorFiltro de %s — el corte a mitad', (_area, resolver) => {
  beforeEach(() => patchMock.mockReset());

  it('🔴 un 5xx en la segunda vuelta dice «de nuestro lado» con la referencia, no la conexión', async () => {
    patchMock.mockResolvedValueOnce(primeraVuelta).mockRejectedValueOnce(error500());
    const r = await resolver();
    expect(r.procesadas).toBe(200);
    expect(r.interrumpida?.motivo).toMatch(/de nuestro lado/);
    expect(r.interrumpida?.motivo).toContain('beef5678');
    expect(r.interrumpida?.motivo).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta en la segunda vuelta: ahí sí la conexión, sin el «Failed to fetch» del navegador', async () => {
    patchMock.mockResolvedValueOnce(primeraVuelta).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const r = await resolver();
    expect(r.interrumpida?.motivo).toMatch(/conexión/);
    expect(r.interrumpida?.motivo).not.toContain('Failed to fetch');
  });
});
