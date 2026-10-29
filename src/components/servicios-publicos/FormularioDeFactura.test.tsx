/**
 * @vitest-environment happy-dom
 *
 * Varios servicios en una factura (Portofino, 28-10-2026: «estos 4 vienen en uno solo… nos interesa el valor total»).
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FormularioDeFactura } from './FormularioDeFactura';

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
