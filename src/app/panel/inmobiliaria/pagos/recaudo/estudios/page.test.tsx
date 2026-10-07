/**
 * Estudios pagados — anular, con los errores en palabras (tanda 2 del sistema
 * de errores, 02-10-2026): un 400 del motivo va DEBAJO del motivo con el foco;
 * un 5xx dice «de nuestro lado» con la referencia.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { listar: vi.fn(), anular: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/estudios.service', () => ({ estudiosApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ isAdmin: true, agencyRole: 'ADMIN', canAccess: () => true, isLoading: false }),
}));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import EstudiosPagadosPage from './page';

const PAGO = {
  id: 'pe-1',
  numeroRecibo: 77,
  fecha: '2026-09-20',
  valorCop: 120_000,
  medio: 'PSE',
  referencia: null,
  solicitante: { userId: 'u-1', nombre: 'Ana Pérez', documento: '1020', correo: null },
  applicationId: null,
  vigenteHasta: '2026-12-20T00:00:00.000Z',
  vigente: true,
  diasQueLeQuedan: 80,
  factura: { estado: 'GENERADA', numero: null, totalCop: 120_000, lineas: [] },
  anulado: false,
  motivoDeAnulacion: null,
  registradoAt: '2026-09-20T00:00:00.000Z',
};

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

async function anularConMotivo(motivo: string) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<EstudiosPagadosPage />);
  });
  await esperar();
  await act(async () => {
    $('[data-testid="anular-pe-1"]').click();
  });
  await esperar();
  const area = $('#motivo-anular-estudio') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(area, motivo);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    $('[data-testid="confirmar-anular-estudio"]').click();
  });
  await esperar();
}

beforeEach(() => {
  api.listar.mockReset().mockResolvedValue([PAGO]);
  api.anular.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('anular un pago de estudio — los errores en palabras', () => {
  it('🔴 un 400 del motivo va debajo del motivo, con el foco', async () => {
    const frase = 'El motivo no puede tener más de 300 caracteres.';
    api.anular.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'motivo', regla: 'longitud_maxima', mensaje: frase }],
      }),
    );
    await anularConMotivo('Se registró dos veces el mismo pago.');
    expect($('#motivo-anular-estudio-error').textContent).toBe(frase);
    expect(document.activeElement?.id).toBe('motivo-anular-estudio');
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    api.anular.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    );
    await anularConMotivo('Se registró dos veces el mismo pago.');
    const descripcion = String(toastMock.error.mock.calls[0]![1]?.description);
    expect(descripcion).toContain('No pudimos anular el recibo: algo falló de nuestro lado');
    expect(descripcion).toContain('ab12cd34');
  });
});
