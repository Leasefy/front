import { describe, it, expect, vi, beforeEach } from 'vitest';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('./client', () => ({ apiClient: api }));

import rutas from './rutas-del-back.json';
import { habeasDataApi } from './habeas-data.service';

/**
 * Qué pide la pantalla de Protección de datos. Espiar al cliente dice QUÉ se
 * pide; que esas rutas EXISTAN en el back lo dice `rutas-del-back.json`.
 */
beforeEach(() => {
  api.get.mockReset().mockResolvedValue({});
  api.post.mockReset().mockResolvedValue({});
});

describe('habeasDataApi', () => {
  it('lista, registra, responde y exporta en las rutas del back', async () => {
    await habeasDataApi.listar();
    await habeasDataApi.crear({
      tipo: 'CONSULTA',
      canal: 'CORREO',
      titularNombre: 'Ana',
      titularTipoDocumento: 'CC',
      titularDocumento: '123',
      descripcion: 'Quiere saber qué datos tenemos.',
    });
    await habeasDataApi.responder('s-1', { resultado: 'ATENDIDA', respuesta: 'Se le enviaron.' });
    await habeasDataApi.datosDelTitular('s-1');

    expect(api.get).toHaveBeenCalledWith('/inmobiliaria/habeas-data/solicitudes');
    expect(api.post.mock.calls[0][0]).toBe('/inmobiliaria/habeas-data/solicitudes');
    expect(api.post.mock.calls[1][0]).toBe('/inmobiliaria/habeas-data/solicitudes/s-1/responder');
    expect(api.get).toHaveBeenCalledWith(
      '/inmobiliaria/habeas-data/solicitudes/s-1/datos-del-titular',
    );
  });

  it('las cuatro rutas existen en el back', () => {
    const existentes = new Set(rutas.rutas);
    for (const r of [
      'GET /inmobiliaria/habeas-data/solicitudes',
      'POST /inmobiliaria/habeas-data/solicitudes',
      'POST /inmobiliaria/habeas-data/solicitudes/:id/responder',
      'GET /inmobiliaria/habeas-data/solicitudes/:id/datos-del-titular',
    ]) {
      expect(existentes.has(r)).toBe(true);
    }
  });
});
