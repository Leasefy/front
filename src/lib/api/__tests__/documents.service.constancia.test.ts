/**
 * 30-10-2026 (R17): el documento que la inmobiliaria subió EN NOMBRE del
 * postulante (desde el chat) llega con su constancia (quién y cuándo); el que
 * subió el postulante, sin ella.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { documentsApi } from '../documents.service';

function fetchQueResponde(body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
}

afterEach(() => vi.restoreAllMocks());

describe('documentsApi.getByApplication — la constancia del documento subido en nombre del postulante', () => {
  it('la trae cuando viene, y no la inventa cuando no', async () => {
    globalThis.fetch = fetchQueResponde([
      { id: 'd1', type: 'PAY_STUB', originalName: 'colilla.pdf', size: 100, createdAt: '2026-10-20T10:00:00.000Z' },
      {
        id: 'd2',
        type: 'ID_DOCUMENT',
        originalName: 'cedula.pdf',
        size: 100,
        createdAt: '2026-10-30T15:00:00.000Z',
        subidoEnNombreDelPostulante: { por: 'Carolina Mejía', el: '2026-10-30T15:00:00.000Z', desde: 'chat' },
      },
    ]) as typeof globalThis.fetch;
    const docs = await documentsApi.getByApplication('app-1');
    expect(docs[0]!.subidoEnNombreDelPostulante).toBeNull();
    expect(docs[1]!.subidoEnNombreDelPostulante).toEqual({ por: 'Carolina Mejía', el: '2026-10-30T15:00:00.000Z' });
  });
});
