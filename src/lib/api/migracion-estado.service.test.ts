/**
 * El contrato del estado de migración, congelado.
 *
 * Este servicio es el que decide si una inmobiliaria entra o no al producto,
 * así que la ruta y el método no pueden derivar sin que algo se ponga rojo:
 * un `GET` que pega a la ruta equivocada devuelve 404 → el front falla
 * abierto → el muro nunca se levanta y nadie se entera.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken } from './client';
import { migracionEstadoApi } from './migracion-estado.service';

// `client.ts` lee `NEXT_PUBLIC_BACKEND_URL` en una constante de módulo, así
// que en test siempre pega al default.
const BACKEND_URL = 'http://localhost:3000';

const ESTADO = {
  bloquea: true,
  resuelta: null,
  pasos: [{ id: 'terceros', estado: 'pendiente', detalle: null, conteo: 0 }],
};

function mockFetch(body: unknown = ESTADO) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

beforeEach(() => {
  // `request()` espera al AuthProvider antes de salir, con un tope de 3 s.
  // Sin declarar la sesión resuelta cada test se come ese tope entero.
  setAccessToken(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('migracionEstadoApi.estado', () => {
  it('pega a GET /inmobiliaria/migracion/estado y devuelve el cuerpo tal cual', async () => {
    const fetchMock = mockFetch();

    const r = await migracionEstadoApi.estado();

    expect(r).toEqual(ESTADO);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/inmobiliaria/migracion/estado`,
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('migracionEstadoApi.terminar', () => {
  it('pega a POST /inmobiliaria/migracion/terminar', async () => {
    const fetchMock = mockFetch({ ...ESTADO, bloquea: false, resuelta: 'completada' });

    await migracionEstadoApi.terminar();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/inmobiliaria/migracion/terminar`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('migracionEstadoApi.omitir', () => {
  it('pega a POST /inmobiliaria/migracion/omitir y manda `motivo` cuando hay', async () => {
    const fetchMock = mockFetch({ ...ESTADO, bloquea: false, resuelta: 'omitida' });

    await migracionEstadoApi.omitir('Arrancamos de cero');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BACKEND_URL}/inmobiliaria/migracion/omitir`);
    expect(init.method).toBe('POST');
    // 🔴 El juego de claves EXACTO: el back monta el ValidationPipe con
    // `forbidNonWhitelisted`, así que una clave de más es un 400, no un
    // campo ignorado.
    expect(JSON.parse(init.body as string)).toEqual({ motivo: 'Arrancamos de cero' });
  });

  it('sin motivo manda un cuerpo vacío, no un `motivo: undefined` ni una cadena en blanco', async () => {
    const fetchMock = mockFetch({ ...ESTADO, bloquea: false, resuelta: 'omitida' });

    await migracionEstadoApi.omitir('   ');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({});
  });
});
