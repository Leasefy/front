/**
 * `dispersionesApi.generate` — que la selección de propietarios SALGA del
 * navegador.
 *
 * El asistente deja destildar propietarios. Esa decisión se quedaba acá: se
 * posteaba sólo el mes, el back generaba el mes entero, y destildar a alguien
 * no lo excluía de nada. La contraparte está probada en el back
 * (`generar-a-quien.spec.ts`); esto prueba el lado que manda.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const post = vi.fn();

vi.mock('./client', () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  getAccessToken: () => 'TEST-TOKEN',
}));

import { dispersionesApi } from './inmobiliaria.service';

const RESPUESTA = {
  month: '2026-07',
  totalPropietarios: 2,
  created: 2,
  skipped: 0,
  noElegidos: 1,
};

describe('dispersionesApi.generate', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue(RESPUESTA);
  });

  it('manda los propietarios elegidos', async () => {
    await dispersionesApi.generate('2026-07', ['prop-1', 'prop-2']);

    const [, cuerpo] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(cuerpo).toEqual({
      month: '2026-07',
      propietarioIds: ['prop-1', 'prop-2'],
    });
  });

  it('sin lista no manda el campo: eso significa «el mes entero»', async () => {
    await dispersionesApi.generate('2026-07');

    const [, cuerpo] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(cuerpo).toEqual({ month: '2026-07' });
    expect('propietarioIds' in cuerpo).toBe(false);
  });

  /*
   * Una lista vacía se manda vacía. El back la trata como «ninguno» y su DTO la
   * rechaza; lo que NO puede pasar es que se omita el campo y termine
   * generando el mes completo — el error más caro de este flujo.
   */
  it('una lista vacía viaja vacía, no se omite', async () => {
    await dispersionesApi.generate('2026-07', []);

    const [, cuerpo] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(cuerpo).toEqual({ month: '2026-07', propietarioIds: [] });
  });

  it('pega contra la ruta del back y devuelve lo que quedó fuera', async () => {
    const r = await dispersionesApi.generate('2026-07', ['prop-1']);

    const [ruta] = post.mock.calls[0] as [string];
    expect(ruta).toContain('/dispersiones/generate');
    expect(r.noElegidos).toBe(1);
  });
});
