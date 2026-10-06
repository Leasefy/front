/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026): en el asiento manual, el inquilino sin
 * cuenta en el portal (`doc:901995004`) se podía elegir de tercero y el asiento
 * fallaba con «Este dato no tiene un valor válido». Sale apagado, con el porqué.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

const { propietariosMock, inquilinosMock } = vi.hoisted(() => ({
  propietariosMock: { getAll: vi.fn() },
  inquilinosMock: { listar: vi.fn() },
}));

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>(
    '@/lib/api/inmobiliaria.service',
  );
  return { ...actual, propietariosApi: { ...actual.propietariosApi, ...propietariosMock } };
});

vi.mock('@/lib/api/inquilinos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inquilinos.service')>(
    '@/lib/api/inquilinos.service',
  );
  return { ...actual, inquilinosApi: { ...actual.inquilinosApi, ...inquilinosMock } };
});

import { TerceroDeApertura } from './TerceroDeApertura';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  inquilinosMock.listar.mockResolvedValue([
    { tenantId: 'u-ana', nombre: 'Ana Pérez', email: 'ana@x.co', telefono: null },
  ]);
  propietariosMock.getAll.mockResolvedValue([
    { id: 'po-1', name: 'Jorge Restrepo', documentType: 'CC', documentNumber: '71234567', email: null },
  ]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function escribir(input: HTMLInputElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, texto);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('QA-FACT-CONTA-95 · el inquilino sin cuenta no se elige de tercero', () => {
  it('🔴 sale apagado con el porqué y no se elige', async () => {
    inquilinosMock.listar.mockResolvedValue([
      { tenantId: 'doc:901995004', nombre: 'QA-FACT-CONTA E4 Inquilino', email: 'e4@x.co', telefono: null, tieneCuentaDelPortal: false },
      { tenantId: 'u-ana', nombre: 'Ana Pérez', email: 'ana@x.co', telefono: null, tieneCuentaDelPortal: true },
    ]);
    const onCambio = vi.fn();
    await act(async () => {
      root.render(<TerceroDeApertura valor={null} onCambio={onCambio} testId="t" />);
    });
    await act(async () => {
      escribir(document.querySelector('[data-testid="t-buscar"]') as HTMLInputElement, 'qa');
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});
    const sinCuenta = document.querySelector('[data-testid="t-opcion-doc:901995004"]') as HTMLButtonElement;
    expect(sinCuenta.disabled).toBe(true);
    expect(sinCuenta.textContent).toContain('Sin cuenta en el portal');
    await act(async () => {
      sinCuenta.click();
    });
    expect(onCambio).not.toHaveBeenCalled();
    const conCuenta = document.querySelector('[data-testid="t-opcion-u-ana"]') as HTMLButtonElement;
    expect(conCuenta.disabled).toBe(false);
  });
});
