/**
 * 🔴 CE-04 (QA-PAGOS-95, 05-10-2026): el monto del recibo de caja (y todo
 * `CampoDePlata` con la llave apagada) es el `CurrencyInput` de Cadence, que
 * borra la coma: «1.000.000,50» quedaba en $ 100.000.050 (cien veces más), en
 * el navegador del lab. Los centavos se frenan —quedan los pesos— y se dice.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/plata/use-plata-con-centavos', () => ({ usePlataConCentavos: () => false }));

import { CampoDePlata } from './campo-de-plata';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

function escribir(input: HTMLInputElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, texto);
  input.setSelectionRange(texto.length, texto.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function Controlado({ alCambiar }: { alCambiar: (n: number) => void }) {
  const [valor, setValor] = React.useState<number>(NaN);
  return (
    <CampoDePlata
      id="monto"
      areas={['contratos_y_cuotas', 'cobros_recibos_y_cartera']}
      value={Number.isFinite(valor) ? valor : undefined}
      onChange={(v) => {
        alCambiar(v);
        setValor(v);
      }}
    />
  );
}

async function montar() {
  const alCambiar = vi.fn();
  await act(async () => root.render(<Controlado alCambiar={alCambiar} />));
  const input = host.querySelector('input') as HTMLInputElement;
  input.focus();
  return { input, alCambiar };
}

describe('CE-04 · CampoDePlata con la llave apagada', () => {
  it('🔴 pegado «1.000.000,50»: un millón (antes 100.000.050) y la pista', async () => {
    const { input, alCambiar } = await montar();
    await act(async () => escribir(input, '1.000.000,50'));
    expect(alCambiar).toHaveBeenLastCalledWith(1_000_000);
    expect(host.querySelector('[data-testid="pista-sin-centavos"]')).not.toBeNull();
  });

  it('🔴 tecleado: la coma y lo que sigue no caen en los pesos', async () => {
    const { input, alCambiar } = await montar();
    for (const c of '1500') await act(async () => escribir(input, input.value + c));
    await act(async () => escribir(input, input.value + ','));
    for (const c of '75') await act(async () => escribir(input, input.value + c));
    expect(alCambiar).toHaveBeenLastCalledWith(1500);
    expect(host.querySelector('[data-testid="pista-sin-centavos"]')).not.toBeNull();
  });

  it('sin coma, el campo de siempre', async () => {
    const { input, alCambiar } = await montar();
    await act(async () => escribir(input, '2350000'));
    expect(alCambiar).toHaveBeenLastCalledWith(2_350_000);
    expect(host.querySelector('[data-testid="pista-sin-centavos"]')).toBeNull();
  });
});
