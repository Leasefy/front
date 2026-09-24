/**
 * La configuración de los medios de recibo: lo que se ve es lo que el back
 * devolvió, y apagar un medio manda la lista de APAGADOS (no la de prendidos).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { MediosDeRecibo } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ medios: vi.fn(), guardar: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { medios: h.medios, guardarMedios: h.guardar },
  codigoSinMigrar: () => null,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { SeccionMediosDeRecibo } from './SeccionMediosDeRecibo';

function datos(extra: Partial<MediosDeRecibo> = {}): MediosDeRecibo {
  return {
    medios: [
      { medio: 'TRANSFERENCIA', nombre: 'Transferencia bancaria', familia: 'TRANSFERENCIA', habilitado: true },
      { medio: 'PSE', nombre: 'PSE', familia: 'PASARELA', habilitado: true },
      { medio: 'EFECTIVO', nombre: 'Efectivo', familia: 'CAJA', habilitado: false },
      { medio: 'CHEQUE', nombre: 'Cheque', familia: 'CAJA', habilitado: false },
    ],
    apagados: ['EFECTIVO', 'CHEQUE'],
    esElPreset: true,
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.medios.mockReset().mockResolvedValue(datos());
  h.guardar.mockReset().mockImplementation(async (apagados: string[]) => datos({ apagados, esElPreset: false }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<SeccionMediosDeRecibo />);
  });
}

function interruptor(medio: string): HTMLButtonElement {
  const el = document.body.querySelector(`[data-testid="interruptor-${medio}"]`);
  if (!el) throw new Error(`No hay interruptor de ${medio}`);
  return el as HTMLButtonElement;
}

describe('medios de recibo', () => {
  it('🔴 efectivo y cheque llegan apagados, y se ve que no se ofrecen', async () => {
    await pintar();
    expect(interruptor('EFECTIVO').getAttribute('aria-checked')).toBe('false');
    expect(interruptor('CHEQUE').getAttribute('aria-checked')).toBe('false');
    expect(interruptor('TRANSFERENCIA').getAttribute('aria-checked')).toBe('true');
    expect(document.body.querySelector('[data-testid="medio-EFECTIVO"]')?.textContent).toContain(
      'No se ofrece',
    );
  });

  it('dice cuándo rige el ajuste de fábrica y no lo esconde', async () => {
    await pintar();
    expect(document.body.querySelector('[data-testid="es-el-preset"]')?.textContent).toContain(
      'ajuste de fábrica',
    );
  });

  it('con una decisión tomada no habla de fábrica', async () => {
    h.medios.mockResolvedValue(datos({ esElPreset: false }));
    await pintar();
    expect(document.body.querySelector('[data-testid="es-el-preset"]')).toBeNull();
  });

  it('agrupa por familia y explica qué es cada una', async () => {
    await pintar();
    expect(document.body.querySelector('[data-testid="familia-CAJA"]')?.textContent).toContain(
      'sin efectivo no hay caja física',
    );
  });

  it('guardar manda la lista de APAGADOS, no la de prendidos', async () => {
    await pintar();
    const guardar = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Guardar',
    ) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);

    await act(async () => {
      interruptor('EFECTIVO').click();
    });
    await act(async () => {
      guardar.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.guardar).toHaveBeenCalledWith(['CHEQUE']);
  });
});
