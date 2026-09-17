/**
 * «Anular cobro» (Nico, 2026-09-16): con motivo, nunca borrarlo.
 *
 * Lo que fija:
 * - sin motivo no se llama al back, y se dice al lado del campo;
 * - lo que se manda es el motivo sin espacios;
 * - el error se dice DENTRO del diálogo con la causa real (recibos vigentes,
 *   falta la migración…), no un genérico;
 * - tras anular, el aviso dice que la deuda no cambió y qué pasó con la factura.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast }));

const api = vi.hoisted(() => ({ anular: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ cobrosApi: api }));

import { ApiError } from '@/lib/api/client';
import { AnularCobroDialog, claveDelErrorAlAnular } from './AnularCobroDialog';

const COBRO = {
  id: 'cobro-1',
  propertyTitle: 'Apto 301',
  tenantName: 'Ana Pérez',
  month: '2026-10',
} as Cobro;

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  api.anular.mockReset();
  toast.success.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function montar(onAnulado = vi.fn()) {
  await act(async () => {
    raiz.render(<AnularCobroDialog cobro={COBRO} onOpenChange={() => undefined} onAnulado={onAnulado} />);
  });
  return onAnulado;
}

async function escribir(valor: string) {
  const el = contenedor.querySelector<HTMLInputElement>('#anular-cobro-motivo')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function confirmar() {
  const boton = [...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Anular cobro')!;
  await act(async () => {
    boton.click();
  });
}

describe('<AnularCobroDialog>', () => {
  it('sin motivo no llama al back y lo dice', async () => {
    await montar();
    await confirmar();
    expect(api.anular).not.toHaveBeenCalled();
    expect(contenedor.textContent).toContain('Escribe por qué lo anulas');
  });

  it('manda el motivo sin espacios y avisa que la deuda no cambió y la nota generada', async () => {
    api.anular.mockResolvedValue({
      cobroId: 'cobro-1',
      anuladoAt: '2026-09-16T12:00:00.000Z',
      motivo: 'Se generó por error',
      cuotasDesvinculadas: 1,
      factura: { facturaId: 'f-1', estado: 'GENERADA', notaCreditoId: 'nc-1', notaCreditoGenerada: true },
    });
    const onAnulado = await montar();
    await escribir('  Se generó por error ');
    await confirmar();

    expect(api.anular).toHaveBeenCalledWith('cobro-1', 'Se generó por error');
    expect(onAnulado).toHaveBeenCalledTimes(1);
    const [titulo, opciones] = toast.success.mock.calls[0] as [string, { description?: string }];
    expect(titulo).toContain('no cambió');
    expect(opciones.description).toContain('sin número');
  });

  it('un cobro con recibos vigentes dice qué hacer, dentro del diálogo', async () => {
    api.anular.mockRejectedValue(new ApiError(409, 'x', 'COBRO_CON_RECIBOS'));
    const onAnulado = await montar();
    await escribir('Se generó por error');
    await confirmar();
    expect(onAnulado).not.toHaveBeenCalled();
    expect(contenedor.querySelector('[role="alert"]')?.textContent).toContain('Anula primero los recibos');
  });

  it('sin la migración dice que no está disponible y que no cambió nada', async () => {
    api.anular.mockRejectedValue(new ApiError(503, 'x', 'ANULAR_COBRO_NO_DISPONIBLE'));
    await montar();
    await escribir('Se generó por error');
    await confirmar();
    expect(contenedor.querySelector('[role="alert"]')?.textContent).toContain('No se cambió nada');
  });

  it('un código que no conocemos cae al genérico', () => {
    expect(claveDelErrorAlAnular(new ApiError(500, 'x', 'OTRA_COSA'))).toBe(
      'inmobiliaria.cobros.anular.errores.generico',
    );
    expect(claveDelErrorAlAnular(new Error('red'))).toBe('inmobiliaria.cobros.anular.errores.generico');
  });
});
