/**
 * @vitest-environment happy-dom
 *
 * La liquidación de entrada como la hoja de Portofino (29-10-2026): factura de octubre = consumo del 15 ago al 15 sep
 * (32 días) por $ 115.260; el anterior hasta el 7 sep → $ 86.445; el nuevo desde el 8 sep → $ 28.815.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/facturacion/CampoDeFecha', () => ({
  CampoDeFecha: (p: { id: string; value: string; onChange: (v: string) => void; testid?: string }) => (
    <input id={p.id} data-testid={p.testid} value={p.value} onChange={(e) => p.onChange(e.target.value)} />
  ),
}));
vi.mock('@/components/ui/money-input', () => ({
  MoneyInput: (p: { id?: string; value: string; onChange: (v: string) => void; 'data-testid'?: string }) => (
    <input id={p.id} data-testid={p['data-testid']} value={p.value} onChange={(e) => p.onChange(e.target.value)} />
  ),
}));
vi.mock('@/lib/api/servicios-publicos.service', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/servicios-publicos.service')>()),
  serviciosPublicosApi: { entradaDeLaFactura: vi.fn(), simularEntrada: vi.fn() },
}));

import { ApiError } from '@/lib/api/client';
import { serviciosPublicosApi, type LiquidacionDeEntradaEnHoja } from '@/lib/api/servicios-publicos.service';
import { LiquidacionDeEntrada } from './LiquidacionDeEntrada';

const api = serviciosPublicosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const HOJA: LiquidacionDeEntradaEnHoja = {
  mesFacturado: '2026-10',
  corteDesde: '2026-08-15',
  corteHasta: '2026-09-15',
  diasDelCorte: 32,
  fechaEntrega: '2026-09-08',
  anterior: { desde: '2026-08-15', hasta: '2026-09-07', dias: 24, valorCop: 86_445 },
  nuevo: { desde: '2026-09-08', hasta: '2026-09-15', dias: 8, valorCop: 28_815 },
  totalCop: 115_260,
  frase: 'De la factura del 15 ago 2026 al 15 sep 2026 (32 días, $ 115.260): 24 días son del propietario…',
};

let root: Root;
let caja: HTMLDivElement;
const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const esperar = () => act(async () => new Promise((r) => setTimeout(r, 400)));
const escribir = async (el: HTMLElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  caja = document.createElement('div');
  document.body.appendChild(caja);
  root = createRoot(caja);
});
afterEach(async () => {
  await act(async () => root.unmount());
  caja.remove();
});

describe('Liquidación de entrada (anterior vs nuevo)', () => {
  it('🔴 desde la factura: la pide al back y la pinta como la hoja de Portofino', async () => {
    api.entradaDeLaFactura.mockResolvedValue(HOJA);
    await act(async () =>
      root.render(<LiquidacionDeEntrada factura={{ id: 'f1', periodoDesde: '2026-08-15', periodoHasta: '2026-09-15', valorCop: 115_260 }} />),
    );
    await esperar();
    expect(api.entradaDeLaFactura).toHaveBeenCalledWith('f1', undefined);
    expect($('hoja-de-la-entrada')!.textContent).toContain('Factura de octubre de 2026');
    expect($('entrada-anterior')!.textContent).toContain('15 ago – 7 sep');
    expect($('entrada-anterior')!.textContent).toContain('$ 86.445');
    expect($('entrada-nuevo')!.textContent).toContain('8 sep – 15 sep');
    expect($('entrada-nuevo')!.textContent).toContain('$ 28.815');
    // La entrega que usó el back (el inicio del contrato) se ve en el campo.
    expect(($('entrada-entrega') as HTMLInputElement).value).toBe('2026-09-08');
  });

  it('cambiar el valor es una simulación: la factura no cambia', async () => {
    api.entradaDeLaFactura.mockResolvedValue(HOJA);
    api.simularEntrada.mockResolvedValue({ ...HOJA, totalCop: 120_000 });
    await act(async () =>
      root.render(<LiquidacionDeEntrada factura={{ id: 'f1', periodoDesde: '2026-08-15', periodoHasta: '2026-09-15', valorCop: 115_260 }} entrega="2026-09-08" />),
    );
    await esperar();
    await escribir($('entrada-valor')!, '120000');
    await esperar();
    expect(api.simularEntrada).toHaveBeenCalledWith({ periodoDesde: '2026-08-15', periodoHasta: '2026-09-15', valorCop: 120_000, entrega: '2026-09-08' });
    expect($('entrada-es-simulacion')).not.toBeNull();
  });

  it('el simulador pide los cuatro datos antes de calcular y dice el problema del back', async () => {
    api.simularEntrada.mockRejectedValue(new ApiError(400, 'La entrega no cae dentro del corte de la factura.', 'FACTURA_DE_ENTRADA_INVALIDA'));
    await act(async () => root.render(<LiquidacionDeEntrada />));
    expect(document.body.textContent).toContain('Escribe el corte de la factura: desde y hasta.');
    await escribir($('entrada-desde')!, '2026-08-15');
    await escribir($('entrada-hasta')!, '2026-09-15');
    expect(document.body.textContent).toContain('32 días de consumo');
    await escribir($('entrada-valor')!, '115260');
    await escribir($('entrada-entrega')!, '2026-10-20');
    await esperar();
    expect(api.simularEntrada).toHaveBeenCalledTimes(1);
    expect($('entrada-problema')!.textContent).toContain('La entrega no cae dentro del corte de la factura.');
  });
});
