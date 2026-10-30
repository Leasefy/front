/**
 * @vitest-environment happy-dom
 *
 * Varios servicios en una factura (Portofino, 28-10-2026: «estos 4 vienen en uno solo… nos interesa el valor total»).
 * El corte y el mes en que se facturó (Portofino, 29-10-2026: «esas facturas llegan con un corte atrasado»).
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/campo-de-mes', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'));
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

import { FormularioDeFactura, MES_ANTES_DEL_CORTE } from './FormularioDeFactura';

const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLInputElement | null;
const escribir = async (el: HTMLElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  document.body.innerHTML = '';
});

describe('FormularioDeFactura — varios servicios', () => {
  it('se marcan varios, se desmarcan, y el primero va como servicio', async () => {
    const onCambio = vi.fn();
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    raiz = createRoot(caja);
    await act(async () => raiz!.render(<FormularioDeFactura modo="inmobiliaria" onCambio={onCambio} />));
    const clic = (s: string) =>
      act(async () => document.querySelector<HTMLButtonElement>(`[data-testid="factura-servicio-${s}"]`)!.click());
    await clic('ENERGIA');
    await clic('AGUA');
    await clic('GAS');
    await clic('AGUA');
    expect(document.querySelector('[data-testid="factura-servicio-ENERGIA"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-testid="factura-servicio-AGUA"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.body.textContent).toContain('Valor total de la factura');
    // Sin fechas ni valor todavía: no se puede mandar.
    expect(onCambio).toHaveBeenLastCalledWith(null);
  });
});

describe('FormularioDeFactura — el corte y el mes en que se facturó', () => {
  async function llenar(onCambio: Parameters<typeof FormularioDeFactura>[0]['onCambio']) {
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    raiz = createRoot(caja);
    await act(async () => raiz!.render(<FormularioDeFactura modo="inquilino" onCambio={onCambio} />));
    await act(async () => document.querySelector<HTMLButtonElement>('[data-testid="factura-servicio-ENERGIA"]')!.click());
    await escribir($('factura-desde')!, '2026-08-15');
    await escribir($('factura-hasta')!, '2026-09-15');
    await escribir($('factura-valor')!, '115260');
  }

  it('las fechas son el corte (el período de consumo) y dice sus días y el mes al que cuenta', async () => {
    await llenar(vi.fn());
    expect(document.body.textContent).toContain('Corte desde (período de consumo)');
    expect(document.body.textContent).toContain('Corte hasta (período de consumo)');
    expect(document.body.textContent).toContain('32 días de consumo: cuenta para septiembre de 2026.');
  });

  it('el mes en que se facturó es opcional y viaja si se elige', async () => {
    const onCambio = vi.fn();
    await llenar(onCambio);
    expect(onCambio).toHaveBeenLastCalledWith(expect.objectContaining({ periodoDesde: '2026-08-15', periodoHasta: '2026-09-15', mesFacturado: undefined }));
    await escribir($('factura-mes-facturado')!, '2026-10');
    expect(onCambio).toHaveBeenLastCalledWith(expect.objectContaining({ mesFacturado: '2026-10' }));
  });

  it('🔴 un mes facturado anterior al corte es un error del campo y no se manda', async () => {
    const onCambio = vi.fn();
    await llenar(onCambio);
    await escribir($('factura-mes-facturado')!, '2026-08');
    expect(document.body.textContent).toContain(MES_ANTES_DEL_CORTE);
    expect(onCambio).toHaveBeenLastCalledWith(null);
  });
});
