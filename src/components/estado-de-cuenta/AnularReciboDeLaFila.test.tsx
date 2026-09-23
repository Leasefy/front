/**
 * Un recibo que abonó directo a la cuota se puede anular desde su fila.
 *
 * QA 22-09: esos recibos (sin cobro) no tenían botón de anular en ninguna
 * pantalla. Lo que se fija: que sólo aparece con el proveedor del panel y
 * habilitado (administrador), que anula el recibo de ESE número y no otro, y
 * que si no lo encuentra no anula nada.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listar = vi.fn();
const anular = vi.fn();
vi.mock('@/lib/api/recibos-de-caja.service', () => ({
  recibosDeCajaApi: { listar: (...a: unknown[]) => listar(...a), anular: (...a: unknown[]) => anular(...a) },
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { BotonAnularRecibo, mismoNumero, ProveedorDeAnularRecibo } from './AnularReciboDeLaFila';
import { fila } from './ejemplo-de-prueba';

const PAGADA = fila({
  estado: 'CANCELADA',
  fechaDePago: '2026-09-22',
  documentoDePago: { numero: 'RC-0011', tipo: 'INGRESO', descripcion: 'Abono' },
});

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(nodo);
  });
}

beforeEach(() => {
  listar.mockReset();
  anular.mockReset();
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function anularConMotivo(motivo: string) {
  await act(async () => {
    document.body.querySelector<HTMLElement>('[data-testid="anular-recibo-de-la-fila"]')!.click();
  });
  const area = document.body.querySelector<HTMLTextAreaElement>('#motivo-anular-recibo')!;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(area, motivo);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    document.body.querySelector<HTMLElement>('[data-testid="anular-recibo-confirmar"]')!.click();
  });
}

describe('mismoNumero', () => {
  it('compara los dígitos, sin prefijo ni ceros', () => {
    expect(mismoNumero('RC-0011', 11)).toBe(true);
    expect(mismoNumero('RC-0011', '111')).toBe(false);
    expect(mismoNumero('', '')).toBe(false);
  });
});

describe('BotonAnularRecibo', () => {
  it('sin el proveedor del panel (portal, enlace público) no se pinta', async () => {
    await montar(<BotonAnularRecibo fila={PAGADA} />);
    expect(host!.querySelector('[data-testid="anular-recibo-de-la-fila"]')).toBeNull();
  });

  it('con el proveedor pero sin ser administrador, tampoco', async () => {
    await montar(
      <ProveedorDeAnularRecibo habilitado={false} onAnulado={() => {}}>
        <BotonAnularRecibo fila={PAGADA} />
      </ProveedorDeAnularRecibo>,
    );
    expect(host!.querySelector('[data-testid="anular-recibo-de-la-fila"]')).toBeNull();
  });

  it('🔴 anula el recibo de ESE número, con el motivo, y relee el documento', async () => {
    listar.mockResolvedValue([
      { id: 'r-10', numero: 10, valorCop: 1, anuladoAt: null },
      { id: 'r-11', numero: 11, valorCop: 500_000, anuladoAt: null },
    ]);
    anular.mockResolvedValue({});
    const onAnulado = vi.fn();
    await montar(
      <ProveedorDeAnularRecibo habilitado onAnulado={onAnulado}>
        <BotonAnularRecibo fila={PAGADA} />
      </ProveedorDeAnularRecibo>,
    );
    await anularConMotivo('Se registró dos veces');
    expect(listar).toHaveBeenCalledWith({ desde: '2026-09-22', hasta: '2026-09-22' });
    expect(anular).toHaveBeenCalledWith('r-11', 'Se registró dos veces');
    expect(onAnulado).toHaveBeenCalled();
  });

  it('si el recibo no aparece, lo dice y NO anula otro', async () => {
    listar.mockResolvedValue([{ id: 'r-10', numero: 10, valorCop: 1, anuladoAt: null }]);
    await montar(
      <ProveedorDeAnularRecibo habilitado onAnulado={() => {}}>
        <BotonAnularRecibo fila={PAGADA} />
      </ProveedorDeAnularRecibo>,
    );
    await anularConMotivo('x');
    expect(anular).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('No encontramos el recibo RC-0011');
  });
});
