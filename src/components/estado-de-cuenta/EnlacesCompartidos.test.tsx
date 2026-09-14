/**
 * «Enlaces compartidos» (auditoría de casos de error 13-09, E3).
 *
 * Lo que se protege: que la lista salga del back al abrir, que un fallo se
 * diga con reintento (no como «no hay enlaces»), que revocar llame al back,
 * saque la fila y avise al menú para que no vuelva a copiar ese enlace, y que
 * un fallo al revocar deje la fila donde está.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { enlaces: vi.fn(), revocarEnlace: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { EnlacesCompartidos } from './EnlacesCompartidos';

const VIVOS = [
  { id: 'e-1', venceEl: '2026-10-13T00:00:00.000Z', aperturas: 3, creadoEl: '2026-09-13T15:00:00.000Z' },
  { id: 'e-2', venceEl: '2026-10-01T00:00:00.000Z', aperturas: 1, creadoEl: '2026-09-01T15:00:00.000Z' },
];

let host: HTMLDivElement;
let root: Root;
const onRevocado = vi.fn();
const onCerrar = vi.fn();

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <EnlacesCompartidos
        abierto
        onCerrar={onCerrar}
        tipo="propietario"
        id="prop-1"
        onRevocado={onRevocado}
      />,
    );
  });
  await esperar();
}

const $ = (s: string) => document.querySelector<HTMLElement>(s);

beforeEach(() => {
  api.enlaces.mockReset().mockResolvedValue(VIVOS);
  api.revocarEnlace.mockReset().mockResolvedValue({ revocado: true });
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  onRevocado.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('<EnlacesCompartidos>', () => {
  it('al abrir lista los enlaces vivos del cliente, con vencimiento y aperturas', async () => {
    await montar();
    expect(api.enlaces).toHaveBeenCalledWith('propietario', 'prop-1');
    const fila = $('[data-testid="enlace-e-1"]')!;
    expect(fila.textContent).toContain('13 oct 2026');
    expect(fila.textContent).toContain('3 aperturas');
    expect($('[data-testid="enlace-e-2"]')!.textContent).toContain('1 apertura');
  });

  it('🔴 revocar llama al back, saca la fila y avisa para no volver a copiar ese enlace', async () => {
    await montar();
    await act(async () => {
      $('[data-testid="revocar-e-1"]')!.click();
    });
    await esperar();

    expect(api.revocarEnlace).toHaveBeenCalledWith('e-1');
    expect($('[data-testid="enlace-e-1"]')).toBeNull();
    expect($('[data-testid="enlace-e-2"]')).not.toBeNull();
    expect(onRevocado).toHaveBeenCalledWith('e-1');
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('si revocar falla, lo dice con su motivo y la fila se queda', async () => {
    api.revocarEnlace.mockRejectedValue(new ApiError(403, 'Forbidden resource'));
    await montar();
    await act(async () => {
      $('[data-testid="revocar-e-1"]')!.click();
    });
    await esperar();

    expect(String(toastMock.error.mock.calls[0]![0])).toContain('Tu rol no puede compartir');
    expect($('[data-testid="enlace-e-1"]')).not.toBeNull();
    expect(onRevocado).not.toHaveBeenCalled();
  });

  it('🔴 si la lista no carga, se dice con reintento — no «no hay enlaces»', async () => {
    api.enlaces.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await montar();

    expect($('[data-testid="fallo-de-carga"]')).not.toBeNull();
    expect($('[data-testid="sin-datos"]')).toBeNull();

    await act(async () => {
      $('[data-testid="reintentar"]')!.click();
    });
    await esperar();
    await esperar();
    expect(api.enlaces).toHaveBeenCalledTimes(2);
    expect($('[data-testid="enlace-e-1"]')).not.toBeNull();
  });

  it('sin enlaces abiertos dice que no hay y cuándo aparecen', async () => {
    api.enlaces.mockResolvedValue([]);
    await montar();
    const vacio = $('[data-testid="sin-datos"]')!;
    expect(vacio.textContent).toContain('No hay enlaces abiertos');
  });
});
