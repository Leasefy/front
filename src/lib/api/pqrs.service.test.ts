import { describe, it, expect, vi, afterEach } from 'vitest';
import { pqrsApi, PqrsUnavailableError, type NuevaSolicitudInput } from './pqrs.service';
import type { SolicitudPqrs } from './pqrs.types';

// A fully-typed server row — proves listMine returns the array as-is and create
// returns the SERVER-assigned radicado (never a client-fabricated one).
const ROW: SolicitudPqrs = {
  id: 'pqrs-1',
  radicado: 'PQRS-2026-0001',
  tipo: 'reparacion',
  estado: 'recibida',
  prioridad: 'media',
  canal: 'web',
  asunto: 'Fuga en el baño',
  descripcion: 'El grifo del baño principal gotea.',
  solicitanteNombre: 'Inquilino Demo',
  solicitanteTipo: 'inquilino',
  createdAt: '2026-07-01T14:00:00.000Z',
  updatedAt: '2026-07-01T14:00:00.000Z',
};

const INPUT: NuevaSolicitudInput = {
  tipo: 'reparacion',
  asunto: 'Fuga en el baño',
  descripcion: 'El grifo del baño principal gotea.',
};

/**
 * Mock a resolved fetch Response. apiClient reads `res.text()` for success bodies
 * and `res.json()` for error bodies, so both are provided.
 */
function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
}

/** Mock fetch REJECTING (network failure) → apiClient wraps it as ApiError(0). */
function mockNetworkFailure() {
  return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
}

describe('pqrsApi.listMine', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the array as-is on 200', async () => {
    globalThis.fetch = mockFetch(200, [ROW]);
    const res = await pqrsApi.listMine();
    expect(res).toHaveLength(1);
    expect(res[0].radicado).toBe('PQRS-2026-0001');
  });

  it('degrades to [] on 404 (route absent) — never a fabricated row', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    expect(await pqrsApi.listMine()).toEqual([]);
  });

  it('degrades to [] on 403 (not wired for this tenant)', async () => {
    globalThis.fetch = mockFetch(403, { message: 'forbidden' });
    expect(await pqrsApi.listMine()).toEqual([]);
  });

  it('degrades to [] on network failure (ApiError status 0)', async () => {
    globalThis.fetch = mockNetworkFailure();
    expect(await pqrsApi.listMine()).toEqual([]);
  });

  it('rethrows any other status (e.g. 500) — does NOT swallow it', async () => {
    globalThis.fetch = mockFetch(500, { message: 'boom' });
    await expect(pqrsApi.listMine()).rejects.toThrow();
  });
});

describe('pqrsApi.getMine (resolve-from-list, anti-IDOR)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the matching own request from the /mine list', async () => {
    globalThis.fetch = mockFetch(200, [ROW]);
    const res = await pqrsApi.getMine('pqrs-1');
    expect(res?.id).toBe('pqrs-1');
  });

  it('returns null for an unknown id (no fabricated row)', async () => {
    globalThis.fetch = mockFetch(200, [ROW]);
    expect(await pqrsApi.getMine('pqrs-999')).toBeNull();
  });

  it('NEVER issues a fetch-by-id — only hits /pqrs/mine', async () => {
    const f = mockFetch(200, [ROW]);
    globalThis.fetch = f;
    await pqrsApi.getMine('pqrs-1');
    for (const call of f.mock.calls) {
      const url = String(call[0]);
      expect(url).toContain('/pqrs/mine');
      expect(url).not.toContain('/pqrs/pqrs-1');
    }
  });

  it('returns null when the endpoint is not live (list degraded to [])', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    expect(await pqrsApi.getMine('pqrs-1')).toBeNull();
  });
});

describe('pqrsApi.create', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the server SolicitudPqrs (with server-assigned radicado) on 200', async () => {
    globalThis.fetch = mockFetch(200, ROW);
    const res = await pqrsApi.create(INPUT);
    expect(res.radicado).toBe('PQRS-2026-0001');
    expect(res.id).toBe('pqrs-1');
  });

  it('POSTs to /pqrs with the input body', async () => {
    const f = mockFetch(200, ROW);
    globalThis.fetch = f;
    await pqrsApi.create(INPUT);
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain('/pqrs');
    expect(init?.method).toBe('POST');
  });

  it('throws PqrsUnavailableError on 404 (no fabricated radicado)', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    await expect(pqrsApi.create(INPUT)).rejects.toBeInstanceOf(PqrsUnavailableError);
  });

  it('throws PqrsUnavailableError on 403', async () => {
    globalThis.fetch = mockFetch(403, { message: 'forbidden' });
    await expect(pqrsApi.create(INPUT)).rejects.toBeInstanceOf(PqrsUnavailableError);
  });

  it('throws PqrsUnavailableError on network failure (status 0)', async () => {
    globalThis.fetch = mockNetworkFailure();
    await expect(pqrsApi.create(INPUT)).rejects.toBeInstanceOf(PqrsUnavailableError);
  });

  it('rethrows the raw ApiError on any other status (e.g. 500)', async () => {
    globalThis.fetch = mockFetch(500, { message: 'boom' });
    await expect(pqrsApi.create(INPUT)).rejects.not.toBeInstanceOf(PqrsUnavailableError);
    await expect(pqrsApi.create(INPUT)).rejects.toThrow();
  });
});

describe('pqrsApi.approveCotizacion', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the updated SolicitudPqrs on 200', async () => {
    const approved: SolicitudPqrs = { ...ROW, estado: 'en_proceso', cotizacionAprobadaAt: '2026-07-02T10:00:00.000Z' };
    globalThis.fetch = mockFetch(200, approved);
    const res = await pqrsApi.approveCotizacion('pqrs-1');
    expect(res.cotizacionAprobadaAt).toBe('2026-07-02T10:00:00.000Z');
  });

  it('throws PqrsUnavailableError on 404 (no fake "aprobado")', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    await expect(pqrsApi.approveCotizacion('pqrs-1')).rejects.toBeInstanceOf(PqrsUnavailableError);
  });

  it('throws PqrsUnavailableError on 403', async () => {
    globalThis.fetch = mockFetch(403, { message: 'forbidden' });
    await expect(pqrsApi.approveCotizacion('pqrs-1')).rejects.toBeInstanceOf(PqrsUnavailableError);
  });

  it('throws PqrsUnavailableError on network failure (status 0)', async () => {
    globalThis.fetch = mockNetworkFailure();
    await expect(pqrsApi.approveCotizacion('pqrs-1')).rejects.toBeInstanceOf(PqrsUnavailableError);
  });
});
