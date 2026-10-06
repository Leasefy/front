/**
 * 🔴 CB-R21 (04-10-2026) · Cuentas por pagar lee las facturas de Gastos y
 * «Pagar» crea el egreso de ESA factura. Nico: «Proveedores: Una sola, en Gastos».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { FacturaDeProveedor } from '@/lib/api/gastos.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { gastos, escrituraMock, toastMock } = vi.hoisted(() => ({
  gastos: { facturas: { listar: vi.fn(), pagar: vi.fn() } },
  escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/gastos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/gastos.service')>(
    '@/lib/api/gastos.service',
  );
  return { ...actual, gastosApi: gastos };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>('../use-puede-escribir');
  return { ...actual, usePuedeEscribir: () => escrituraMock };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { CuentasPorPagar } from './CuentasPorPagar';

function factura(id: string, extra: Partial<FacturaDeProveedor> = {}): FacturaDeProveedor {
  return {
    id,
    estado: 'CAUSADA',
    proveedorNombre: 'Ferretería El Tornillo',
    prefijoDelProveedor: 'FE',
    numeroDelProveedor: '77',
    concepto: 'Cerradura',
    fecha: '2026-09-20',
    fechaDeVencimiento: '2026-09-30',
    totalCop: 476_000,
    retefuenteCop: 10_000,
    reteivaCop: 0,
    reteicaCop: 3_040,
    netoCop: 462_960,
    egreso: null,
    ...extra,
  } as FacturaDeProveedor;
}

const pagina = (facturas: FacturaDeProveedor[]) => ({
  disponible: true,
  motivo: null,
  total: facturas.length,
  limite: 200,
  desplazamiento: 0,
  totales: { subtotalCop: 0, ivaCop: 0, retencionesCop: 0, totalCop: 0, netoCop: 0 },
  facturas,
});

let root: Root;
let host: HTMLDivElement;
const q = (s: string) => document.querySelector(s) as HTMLElement | null;
const listo = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('🔴 CB-R21 · Cuentas por pagar', () => {
  it('lee las causadas de Gastos y sólo ofrece «Pagar» a la que no tiene egreso', async () => {
    gastos.facturas.listar.mockResolvedValue(
      pagina([
        factura('f1'),
        factura('f2', { egreso: { id: 'e9', numero: null, estado: 'EN_LOTE', loteId: 'l1' } }),
      ]),
    );
    act(() => root.render(<CuentasPorPagar />));
    await listo();
    expect(gastos.facturas.listar).toHaveBeenCalledWith(expect.objectContaining({ estado: 'CAUSADA' }));
    expect(q('[data-testid="cxp-pagar-f1"]')).not.toBeNull();
    expect(q('[data-testid="cxp-pagar-f2"]')).toBeNull();
    expect(q('[data-testid="cxp-fila-f2"]')!.textContent).toContain('lote de egresos');
    // Vencida el 30 de septiembre y sin egreso: lo dice.
    expect(q('[data-testid="cxp-fila-f1"]')!.textContent).toContain('Vencida');
  });

  it('«Pagar» → el cajón → «Mandar a pagar» crea el egreso de ESA factura con la cuenta', async () => {
    gastos.facturas.listar.mockResolvedValue(pagina([factura('f1')]));
    gastos.facturas.pagar.mockResolvedValue({ id: 'e1' });
    act(() => root.render(<CuentasPorPagar />));
    await listo();
    act(() => q('[data-testid="cxp-pagar-f1"]')!.click());
    await listo();
    expect(q('[data-testid="pagar-neto"]')!.textContent).toMatch(/462\.960/);
    const numero = q('[data-testid="pagar-numero"]') as HTMLInputElement;
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(numero, '123-456 78');
      numero.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => (document.querySelectorAll('[data-testid="pagar-tipo"] [role="radio"]')[0] as HTMLElement).click());
    await act(async () => q('[data-testid="confirmar-pagar-factura"]')!.click());
    await listo();
    expect(gastos.facturas.pagar).toHaveBeenCalledWith('f1', {
      banco: '',
      tipoDeCuenta: 'AHORROS',
      numeroDeCuenta: '12345678',
    });
    expect(toastMock.success).toHaveBeenCalled();
    // Vuelve a leer: la factura ya trae su egreso.
    expect(gastos.facturas.listar).toHaveBeenCalledTimes(2);
  });

  it('«Vencidas» pide `vencidas` al back', async () => {
    gastos.facturas.listar.mockResolvedValue(pagina([]));
    act(() => root.render(<CuentasPorPagar />));
    await listo();
    const tab = q('[data-testid="cxp-vista-vencidas"]')!;
    act(() => {
      tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      tab.click();
    });
    await listo();
    expect(gastos.facturas.listar).toHaveBeenLastCalledWith(expect.objectContaining({ vencidas: true }));
  });
});
