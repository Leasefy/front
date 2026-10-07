/**
 * «Tienes una carga a medias»: Reintentar y Descartar dicen la verdad cuando
 * fallan (02-10-2026). Los códigos del lote conservan su frase («espera a que
 * termine»); lo demás pasa por el traductor: un 5xx dice «de nuestro lado» con
 * la referencia, y la conexión sólo sale cuando no hubo respuesta.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

const { api } = vi.hoisted(() => ({ api: { reintentar: vi.fn(), descartarLote: vi.fn() } }));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmuebles-importacion.service')>(
    '@/lib/api/inmuebles-importacion.service',
  );
  return { ...actual, inmueblesImportacionApi: api };
});

import { CargasAMedias } from './CargasAMedias';
import { ApiError } from '@/lib/api/client';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

const FALLIDA: EstadoDeLoteInmuebles = {
  lote: 'lote-1',
  estado: 'FALLIDO',
  total: 10,
  procesadas: 4,
  pendientes: 0,
  listos: 0,
  activados: 0,
  descartados: 0,
  jobId: null,
  error: 'El proceso se detuvo.',
  creadoEn: '2026-10-02T15:00:00.000Z',
  fase: 'REVISANDO',
  puedeReintentar: true,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00-05:00') });
  Object.values(toastMock).forEach((f) => f.mockClear());
  api.reintentar.mockReset();
  api.descartarLote.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <CargasAMedias lotes={[FALLIDA]} onRetomar={() => {}} onDescartada={() => {}} onCambio={() => {}} />,
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

async function reintentar() {
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-testid="reintentar-lote-1"]')!.click();
  });
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe('CargasAMedias — Reintentar cuando falla', () => {
  it('🔴 un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    api.reintentar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'a1b2c3d4',
      }),
    );
    await reintentar();
    const texto = String(toastMock.error.mock.calls[0]?.[0] ?? '');
    expect(texto).toContain('No pudimos reintentar esta carga: algo falló de nuestro lado');
    expect(texto).toContain('a1b2c3d4');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });

  it('un código del lote conserva su frase', async () => {
    api.reintentar.mockRejectedValue(new ApiError(409, 'job vivo', 'LOTE_EN_PROCESO'));
    await reintentar();
    expect(toastMock.error).toHaveBeenCalledWith(
      'Esta carga se está procesando en este momento. Espera a que termine y vuelve a intentarlo.',
    );
  });

  it('sin respuesta: ahí sí la conexión', async () => {
    api.reintentar.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await reintentar();
    expect(String(toastMock.error.mock.calls[0]?.[0])).toMatch(/conexión/);
  });
});
