/**
 * `dispersionesApi.getAll` — el filtro de estado sale con el nombre del BACK.
 *
 * La pestaña «Pendientes» de Dispersiones mandaba `status=pending` (el nombre
 * de la vista) y el back respondía 500 (referencia 500-1844): Prisma sólo
 * conoce `DISP_PENDING | PROCESSING | DISP_COMPLETED | FAILED`. El back ya
 * traduce los dos nombres (`filtro-por-estado.spec.ts`); este lado manda el
 * del enum para que la pantalla funcione también contra un back sin el arreglo.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();

vi.mock('./client', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  getAccessToken: () => 'TEST-TOKEN',
}));

import { dispersionesApi } from './inmobiliaria.service';

function consultaPedida(): URLSearchParams {
  const url = get.mock.calls[0][0] as string;
  return new URLSearchParams(url.split('?')[1] ?? '');
}

describe('dispersionesApi.getAll · status', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue([]);
  });

  it.each([
    ['pending', 'DISP_PENDING'],
    ['processing', 'PROCESSING'],
    ['completed', 'DISP_COMPLETED'],
    ['failed', 'FAILED'],
  ])('la pestaña «%s» pide status=%s', async (vista, back) => {
    await dispersionesApi.getAll({ month: '2026-09', status: vista });
    expect(consultaPedida().get('status')).toBe(back);
    expect(consultaPedida().get('month')).toBe('2026-09');
  });

  it('sin estado no manda el parámetro', async () => {
    await dispersionesApi.getAll({ month: '2026-09' });
    expect(consultaPedida().has('status')).toBe(false);
  });
});
