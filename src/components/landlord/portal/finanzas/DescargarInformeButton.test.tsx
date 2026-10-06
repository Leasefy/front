/**
 * @vitest-environment happy-dom
 *
 * O2: la descarga del informe atrapa el fallo. Antes no había `catch`: un rechazo quedaba sin
 * atrapar y una caída se anunciaba como «Próximamente».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ getInformePdfConEstado: vi.fn() }));
const avisos = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
  return { toast };
});
vi.mock('@/lib/api/owner-finanzas.service', () => ({ ownerFinanzasApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: avisos.toast }));
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled }: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    React.createElement('button', { onClick, disabled }, children),
}));
vi.mock('@phosphor-icons/react', () => ({ DownloadSimple: () => null }));

import { DescargarInformeButton } from './DescargarInformeButton';
import { ApiError } from '@/lib/api/client';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  api.getInformePdfConEstado.mockReset();
  avisos.toast.mockClear();
  avisos.toast.error.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<DescargarInformeButton agencyId="ag-1" />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const apretar = async () => {
  await act(async () => {
    (container.querySelector('button') as HTMLButtonElement).click();
  });
};

describe('<DescargarInformeButton> (O2)', () => {
  it('🔴 un fallo del portal avisa con error, no «Próximamente»', async () => {
    api.getInformePdfConEstado.mockResolvedValue({ estado: 'fallo', status: 500, mensaje: 'x' });
    await apretar();
    expect(avisos.toast.error).toHaveBeenCalledWith('No pudimos generar el informe', expect.anything());
    expect(avisos.toast).not.toHaveBeenCalledWith('Próximamente', expect.anything());
  });

  it('🔴 un 5xx del portal dice «de nuestro lado» con la referencia, no «El portal no respondió» (02-10-2026)', async () => {
    const error = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      referencia: 'ab12cd34',
    });
    api.getInformePdfConEstado.mockResolvedValue({ estado: 'fallo', status: 500, mensaje: 'x', error });
    await apretar();
    const [, opciones] = avisos.toast.error.mock.calls[0] as [string, { description: string }];
    expect(opciones.description).toMatch(/^No pudimos generar el informe: algo falló de nuestro lado/);
    expect(opciones.description).toContain('ab12cd34');
    expect(opciones.description).not.toMatch(/no respondió|conexi[oó]n/i);
  });

  it('sólo sin respuesta (status 0) habla de la conexión', async () => {
    api.getInformePdfConEstado.mockResolvedValue({ estado: 'fallo', status: 0, mensaje: 'x', error: new ApiError(0, '') });
    await apretar();
    const [, opciones] = avisos.toast.error.mock.calls[0] as [string, { description: string }];
    expect(opciones.description).toMatch(/conexi[oó]n/i);
  });

  it('con el portal apagado sigue diciendo «Próximamente»', async () => {
    api.getInformePdfConEstado.mockResolvedValue({ estado: 'no-habilitado' });
    await apretar();
    expect(avisos.toast).toHaveBeenCalledWith('Próximamente', expect.anything());
    expect(avisos.toast.error).not.toHaveBeenCalled();
  });

  it('un rechazo inesperado se atrapa y el botón vuelve a estar disponible', async () => {
    api.getInformePdfConEstado.mockRejectedValue(new Error('boom'));
    await apretar();
    expect(avisos.toast.error).toHaveBeenCalledWith('No pudimos descargar el informe', expect.anything());
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
