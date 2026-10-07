/**
 * `MoneyInput conSigno` (QA de Contabilidad, CB-30, 03-10-2026): el presupuesto
 * de un rubro puede ser negativo. Con la opción, el «-» del principio se
 * conserva y viaja; sin ella, el campo es el de siempre (sólo dígitos).
 */
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { MoneyInput } from './money-input';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function Campo({ conSigno, onChange }: { conSigno?: boolean; onChange: (v: string) => void }) {
  const [valor, setValor] = React.useState('');
  return (
    <MoneyInput
      aria-label="valor"
      conSigno={conSigno}
      value={valor}
      onChange={(v) => {
        setValor(v);
        onChange(v);
      }}
    />
  );
}

function escribir(el: HTMLInputElement, texto: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, texto);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function pintar(conSigno?: boolean) {
  const onChange = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Campo conSigno={conSigno} onChange={onChange} />));
  return { onChange, input: host.querySelector('input')! };
}

describe('<MoneyInput conSigno>', () => {
  it('conserva el «-» y agrupa', () => {
    const { onChange, input } = pintar(true);
    act(() => escribir(input, '-35000000'));
    expect(onChange).toHaveBeenLastCalledWith('-35000000');
    expect(input.value).toBe('-35.000.000');
  });

  it('sin la opción, como siempre: sólo dígitos', () => {
    const { onChange, input } = pintar();
    act(() => escribir(input, '-35000000'));
    expect(onChange).toHaveBeenLastCalledWith('35000000');
    expect(input.value).toBe('35.000.000');
  });
});
