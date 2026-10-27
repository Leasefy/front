import { afterEach, describe, expect, it, vi } from 'vitest';
import { calentarLaVistaPrevia } from './calentar-la-vista-previa';

afterEach(() => vi.unstubAllGlobals());

describe('calentarLaVistaPrevia (Nico, 27-10-2026: la ficha salía sin foto en WhatsApp)', () => {
  it('pide la MISMA dirección de la imagen que va en la página (con ?v= del último cambio)', () => {
    const fetch = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal('fetch', fetch);
    calentarLaVistaPrevia({ id: 'abc', updatedAt: '2026-10-27T15:00:00.000Z' });
    const v = Date.parse('2026-10-27T15:00:00.000Z').toString(36);
    expect(fetch).toHaveBeenCalledWith(`/api/og/inmueble/abc?v=${v}`, expect.objectContaining({ keepalive: true }));
  });

  it('si falla, no pasa nada', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sin red'))));
    expect(() => calentarLaVistaPrevia({ id: 'abc' })).not.toThrow();
  });
});
