import { beforeEach, describe, expect, it, vi } from 'vitest';

import { olvidarLosDominios, slugDelDominio } from './slug-del-dominio';

const respuesta = (status: number, cuerpo: unknown = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => cuerpo }) as Response;

describe('de qué inmobiliaria es un dominio (middleware)', () => {
  beforeEach(() => olvidarLosDominios());

  it('pregunta al back una vez y recuerda la respuesta 5 minutos', async () => {
    const pedir = vi.fn(async () => respuesta(200, { slug: 'inmobiliaria-loza' }));
    const o = { backend: 'https://api.leasefy.co/', pedir: pedir as unknown as typeof fetch, ahora: 1_000 };
    expect(await slugDelDominio('Inmuebles.Loza.co', o)).toBe('inmobiliaria-loza');
    expect(await slugDelDominio('inmuebles.loza.co', { ...o, ahora: 200_000 })).toBe('inmobiliaria-loza');
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(pedir.mock.calls[0][0]).toBe('https://api.leasefy.co/dominio-propio/inmuebles.loza.co');
  });

  it('un host que no es de nadie también se recuerda (no le pega al back en cada petición)', async () => {
    const pedir = vi.fn(async () => respuesta(404));
    const o = { backend: 'https://api.leasefy.co', pedir: pedir as unknown as typeof fetch, ahora: 1_000 };
    expect(await slugDelDominio('otro.com', o)).toBeNull();
    expect(await slugDelDominio('otro.com', o)).toBeNull();
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('con el back caído responde null (la página sigue como siempre) y vuelve a preguntar al minuto', async () => {
    const pedir = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const o = { backend: 'https://api.leasefy.co', pedir: pedir as unknown as typeof fetch, ahora: 1_000 };
    expect(await slugDelDominio('inmuebles.loza.co', o)).toBeNull();
    await slugDelDominio('inmuebles.loza.co', { ...o, ahora: 1_000 + 61_000 });
    expect(pedir).toHaveBeenCalledTimes(2);
  });
});
