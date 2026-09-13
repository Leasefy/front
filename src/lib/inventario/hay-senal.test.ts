import { describe, it, expect, vi } from 'vitest';
import { haySenal } from './hay-senal';

const ok = (_u: RequestInfo | URL, _o?: RequestInit) =>
  Promise.resolve(new Response('{}', { status: 200 }));

describe('haySenal', () => {
  it('sin red no le pregunta a nadie', async () => {
    const fetchImpl = vi.fn(ok);
    expect(await haySenal({ enLinea: () => false, fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  /**
   * El caso de Nico: el teléfono está pegado al wifi del edificio o marca una
   * barra de datos, así que `navigator.onLine` dice `true`, pero no sale ni un
   * paquete. Un botón que se habilita con `onLine` manda a la persona a un
   * spinner eterno.
   */
  it('con red pero sin salida, es NO — aunque el navegador diga que sí', async () => {
    const fetchImpl = vi.fn((_u: RequestInfo | URL, _o?: RequestInit) =>
      Promise.reject(new TypeError('Failed to fetch')),
    );
    expect(await haySenal({ enLinea: () => true, fetchImpl })).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('con el back contestando, es SÍ', async () => {
    const fetchImpl = vi.fn(ok);
    expect(await haySenal({ enLinea: () => true, fetchImpl })).toBe(true);
    const [url, opciones] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/health$/);
    expect(opciones.cache).toBe('no-store');
  });

  /**
   * `/health` devuelve 503 cuando la base está caída. Para subir un inventario
   * alcanza con que el back conteste: lo que se mide acá es si hay camino.
   */
  it('un 503 del back sigue siendo señal', async () => {
    const fetchImpl = vi.fn((_u: RequestInfo | URL, _o?: RequestInit) =>
      Promise.resolve(new Response('{}', { status: 503 })),
    );
    expect(await haySenal({ enLinea: () => true, fetchImpl })).toBe(true);
  });

  it('un 500 no es señal utilizable', async () => {
    const fetchImpl = vi.fn((_u: RequestInfo | URL, _o?: RequestInit) =>
      Promise.resolve(new Response('', { status: 500 })),
    );
    expect(await haySenal({ enLinea: () => true, fetchImpl })).toBe(false);
  });

  it('si el pedido se cuelga, corta por reloj y dice que no', async () => {
    const fetchImpl = vi.fn(
      (_u: RequestInfo | URL, o?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          o?.signal?.addEventListener('abort', () => rej(new Error('AbortError')));
        }),
    );
    expect(
      await haySenal({ enLinea: () => true, fetchImpl: fetchImpl as typeof fetch, topeMs: 10 }),
    ).toBe(false);
  });
});
