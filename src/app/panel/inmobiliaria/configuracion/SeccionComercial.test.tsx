/**
 * Configuración → Comercial (Nico, 04-10-2026): la regla de comisión de los
 * asesores. Sin regla lo dice; el formulario valida como el back; guarda la
 * regla de todos con su forma.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: { reglas: vi.fn(), guardarRegla: vi.fn(), borrarRegla: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
vi.mock('@/lib/comercial/comercial', async (orig) => ({
  ...(await orig<typeof import('@/lib/comercial/comercial')>()),
  comercialApi: h.api,
}));

import { SeccionComercial, errorDelFormulario } from './SeccionComercial';

let contenedor: HTMLDivElement;
let raiz: Root;
const $ = (sel: string) => contenedor.querySelector(sel);

async function pintar() {
  await act(async () => {
    raiz.render(<SeccionComercial />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function escribir(input: HTMLInputElement, valor: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  set.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  h.api.reglas.mockReset().mockResolvedValue({
    reglas: [],
    asesores: [{ userId: 'sara', nombre: 'Sara Gómez' }],
    vigenteDeTodos: null,
  });
  h.api.guardarRegla.mockReset().mockResolvedValue({});
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('errorDelFormulario', () => {
  it('pide al menos un porcentaje mayor que 0, entre 0 y 100, con hasta dos decimales', () => {
    expect(errorDelFormulario({ forma: 'PORCENTAJE', pctCaptar: '', pctCerrar: '', fijo: undefined })).toMatch(/al menos uno/);
    expect(errorDelFormulario({ forma: 'PORCENTAJE', pctCaptar: '101', pctCerrar: '', fijo: undefined })).toMatch(/entre 0 % y 100 %/);
    expect(errorDelFormulario({ forma: 'PORCENTAJE', pctCaptar: '10,555', pctCerrar: '', fijo: undefined })).toMatch(/dos decimales/);
    expect(errorDelFormulario({ forma: 'PORCENTAJE', pctCaptar: '12,5', pctCerrar: '', fijo: undefined })).toBeNull();
    expect(errorDelFormulario({ forma: 'FIJO_POR_CIERRE', pctCaptar: '', pctCerrar: '', fijo: 0 })).toMatch(/valor fijo/);
    expect(errorDelFormulario({ forma: 'FIJO_POR_CIERRE', pctCaptar: '', pctCerrar: '', fijo: 300000 })).toBeNull();
  });
});

describe('SeccionComercial', () => {
  it('sin regla dice «Configura la comisión de tus asesores» y guarda la de todos', async () => {
    await pintar();
    expect($('[data-testid="configura-la-comision"]')?.textContent).toContain('Configura la comisión de tus asesores');
    expect($('[data-testid="texto-regla-de-todos"]')?.textContent).toBe('Sin regla');
    await act(async () => ($('[data-testid="editar-regla-de-todos"]') as HTMLButtonElement).click());
    const form = $('[data-testid="formulario-regla-todos"]')!;
    await act(async () => escribir(form.querySelector('[data-testid="pct-captar"]') as HTMLInputElement, '10'));
    await act(async () => escribir(form.querySelector('[data-testid="pct-cerrar"]') as HTMLInputElement, '12,5'));
    await act(async () => (form.querySelector('[data-testid="guardar-regla"]') as HTMLButtonElement).click());
    expect(h.api.guardarRegla).toHaveBeenCalledWith(
      expect.objectContaining({ asesorUserId: null, forma: 'PORCENTAJE', pctCaptar: 10, pctCerrar: 12.5, fijoPorCierreCop: null }),
    );
  });

  it('un formulario malo no llama al back y dice qué falta', async () => {
    await pintar();
    await act(async () => ($('[data-testid="editar-regla-de-todos"]') as HTMLButtonElement).click());
    const form = $('[data-testid="formulario-regla-todos"]')!;
    await act(async () => (form.querySelector('[data-testid="guardar-regla"]') as HTMLButtonElement).click());
    expect(h.api.guardarRegla).not.toHaveBeenCalled();
    expect($('[data-testid="error-regla"]')?.textContent).toMatch(/al menos uno/);
  });
});
