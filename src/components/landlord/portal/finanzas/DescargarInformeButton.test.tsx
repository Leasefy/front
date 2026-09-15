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
