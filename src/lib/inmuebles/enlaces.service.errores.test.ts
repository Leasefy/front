/**
 * `leerEnlaces` — qué se dice cuando un enlace no se puede leer (02-10-2026).
 *
 * Antes cualquier fallo («la ruta respondió una página de error», «el JSON no
 * se pudo leer») salía como «No se pudo conectar para leer el enlace.»: culpaba
 * a la conexión aunque la conexión estuviera perfecta. Regla de oro: conexión
 * SÓLO si el pedido no salió; un 5xx es nuestro.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchConSesionMock = vi.fn();
vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...real, fetchConSesion: (...a: unknown[]) => fetchConSesionMock(...a) };
});

import { leerEnlaces } from './enlaces.service';

const URL_DE_PRUEBA = 'https://portal.example.com/inmueble/1';

describe('leerEnlaces — el motivo de un enlace que no se leyó', () => {
  beforeEach(() => fetchConSesionMock.mockReset());

  it('🔴 un 500 sin JSON (página de error) dice «de nuestro lado», no la conexión', async () => {
    fetchConSesionMock.mockResolvedValue(new Response('<html>500</html>', { status: 500 }));
    const [r] = await leerEnlaces([URL_DE_PRUEBA]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.mensaje).toMatch(/de nuestro lado/);
    expect(r.mensaje).not.toMatch(/conect/);
  });

  it('el pedido que no sale (sin red): ahí sí la conexión', async () => {
    fetchConSesionMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')));
    const [r] = await leerEnlaces([URL_DE_PRUEBA]);
    if (r.ok) throw new Error('no debía leerse');
    expect(r.mensaje).toMatch(/conexión/);
    expect(r.mensaje).not.toContain('Failed to fetch');
  });

  it('el motivo que manda la ruta se respeta tal cual', async () => {
    fetchConSesionMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, motivo: 'bloqueado', mensaje: 'El portal no deja leer este enlace.' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const [r] = await leerEnlaces([URL_DE_PRUEBA]);
    if (r.ok) throw new Error('no debía leerse');
    expect(r.mensaje).toBe('El portal no deja leer este enlace.');
  });
});
