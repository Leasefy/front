/**
 * CB-16 (QA de Contabilidad, 03-10-2026): «Asiento manual» es un CAJÓN (como
 * «Hacer recibo de caja»), y una línea con débito Y crédito a la vez lo dice en
 * la línea apenas pasa — sin esperar a un envío que el botón apagado no deja.
 */
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CuentaPuc } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../SelectorDeCuenta', () => ({
  SelectorDeCuenta: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select data-testid="linea-cuenta" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      <option value="c1">c1</option>
      <option value="c2">c2</option>
    </select>
  ),
}));
vi.mock('@leasefy/cadence', async () => {
  const actual = await vi.importActual<typeof import('@leasefy/cadence')>('@leasefy/cadence');
  return {
    ...actual,
    CurrencyInput: ({
      value,
      onChange,
      invalid: _invalid,
      ...resto
    }: {
      value?: number;
      onChange: (v: number) => void;
      invalid?: boolean;
      [k: string]: unknown;
    }) => (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        {...resto}
      />
    ),
  };
});
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}` }),
}));

import { AsientoManual } from './AsientoManual';

let host: HTMLDivElement;
let root: Root;
const todos = (t: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${t}"]`));

function escribir(el: HTMLElement, valor: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function pintar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <AsientoManual
        abierto
        onCerrar={() => {}}
        onCreado={() => {}}
        cuentas={[{ id: 'c1' }, { id: 'c2' }] as unknown as CuentaPuc[]}
      />,
    );
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('<AsientoManual> · CB-16', () => {
  it('🔴 es un cajón (el Sheet de la casa), no un modal centrado', async () => {
    await pintar();
    const cajon = document.querySelector('[data-testid="asiento-manual"]')!;
    expect(cajon.getAttribute('role')).toBe('dialog');
    // El cajón de la casa: con su pie fijo y el botón de crear adentro.
    expect(cajon.querySelector('[data-testid="crear-asiento"]')).not.toBeNull();
    expect(cajon.className).toMatch(/rounded-\[24px\]/);
  });

  it('🔴 débito y crédito en la misma línea se dicen en la línea apenas pasa', async () => {
    await pintar();
    await act(async () => {
      escribir(todos('linea-debito')[0], '100000');
    });
    expect(document.body.textContent).not.toContain('no los dos');
    await act(async () => {
      escribir(todos('linea-credito')[0], '100000');
    });
    const credito = todos('linea-credito')[0];
    const error = document.getElementById(credito.getAttribute('aria-describedby')!);
    expect(error?.textContent).toBe('Una línea va por un solo lado: débito o crédito, no los dos.');
    // La otra línea, vacía, todavía no se regaña.
    expect(todos('linea-debito')[1].getAttribute('aria-describedby')).toBeNull();
  });
});
