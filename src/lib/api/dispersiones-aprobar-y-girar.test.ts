/**
 * dispersiones — aprobar y girar, el contrato real con el back.
 *
 * El «Procesar» de la pantalla estaba MUERTO y encima festejaba:
 *
 *   - el front mandaba `PUT /dispersiones/:id/process` con body `{}` y el back
 *     exige `transferReference` no vacío (`ProcessDispersionDto`) → 400 del
 *     ValidationPipe, siempre;
 *   - además el back exige estado `PROCESSING`, y `approve` —el único que lo
 *     pone— NO EXISTÍA en el cliente: nadie lo llamaba. O sea que ninguna
 *     dispersión podía salir de `pending`;
 *   - y el cartel decía «Transferencia enviada», cuando el sistema no envía
 *     ninguna transferencia: anota una referencia.
 *
 * Lo que muerde acá es el cuerpo exacto de las dos llamadas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
  getAccessToken: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

import { dispersionesApi } from './inmobiliaria.service';

const ID = '11111111-1111-4111-8111-111111111111';

function delBack() {
  return {
    id: ID,
    agencyId: 'ag-1',
    propietarioId: 'p-1',
    propietarioName: 'Jorge Restrepo',
    month: '2026-02',
    totalCollected: 1_000_000,
    totalCommission: 100_000,
    netToPropietario: 900_000,
    status: 'PROCESSING',
    items: [],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  putMock.mockReset();
  putMock.mockResolvedValue(delBack());
});

describe('aprobar — el primer par de ojos', () => {
  it('existe y pega en PUT /dispersiones/:id/approve', async () => {
    await dispersionesApi.approve(ID);

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock.mock.calls[0][0]).toBe(
      `/inmobiliaria/dispersiones/${ID}/approve`,
    );
  });
});

describe('girar — el segundo par de ojos', () => {
  it('manda la referencia en el cuerpo', async () => {
    await dispersionesApi.process(ID, 'TRF-2026-02-001');

    expect(putMock).toHaveBeenCalledTimes(1);
    const [url, body] = putMock.mock.calls[0];
    expect(url).toBe(`/inmobiliaria/dispersiones/${ID}/process`);
    expect(body).toEqual({ transferReference: 'TRF-2026-02-001' });
  });

  it('AL REVÉS: el cuerpo vacío que el back rechazaba con 400 ya no se puede mandar', async () => {
    await dispersionesApi.process(ID, 'TRF-2026-02-001');

    const [, body] = putMock.mock.calls[0];
    // Lo que se mandaba antes: `{}`. El back respondía 400 y la pantalla
    // anunciaba que la transferencia se había enviado.
    expect(body).not.toEqual({});
    expect(Object.keys(body as object)).toEqual(['transferReference']);
    // `forbidNonWhitelisted` en el back: una clave de más también es 400.
    expect((body as { transferReference: string }).transferReference).toBe(
      'TRF-2026-02-001',
    );
  });
});
