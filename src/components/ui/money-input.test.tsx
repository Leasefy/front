/**
 * El campo de plata agrupa mientras se escribe.
 *
 * Lo que se protege: que hacia AFUERA siga siendo un número pelado. Si
 * `onChange` empezara a entregar `"3.000.000"`, cada formulario que hace
 * `Number(form.canon)` mandaría `NaN` al back sin que nada falle en rojo.
 */

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { MoneyInput, agrupar, soloNumero } from './money-input';

void React;

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('agrupar', () => {
  it('pone los puntos de miles en COP', () => {
    expect(agrupar('3000000')).toBe('3.000.000');
    expect(agrupar('1500000')).toBe('1.500.000');
    expect(agrupar('350000')).toBe('350.000');
    expect(agrupar('999')).toBe('999');
  });

  it('deja vacío lo vacío — cero no es lo mismo que nada', () => {
    expect(agrupar('')).toBe('');
  });

  it('usa comas y decimales en USD', () => {
    expect(agrupar('1500', 'USD')).toBe('1,500');
    expect(agrupar('1500.5', 'USD')).toBe('1,500.5');
  });
});

describe('soloNumero', () => {
  it('descarta todo lo que no sea dígito en COP', () => {
    expect(soloNumero('3.000.000')).toBe('3000000');
    expect(soloNumero('$ 2.500.000 COP')).toBe('2500000');
  });

  it('en COP no deja decimales — el peso no tiene centavos en la práctica', () => {
    expect(soloNumero('1500,75')).toBe('150075');
  });

  it('en USD la coma agrupa y el punto separa decimales', () => {
    expect(soloNumero('1,500.75', 'USD')).toBe('1500.75');
    expect(soloNumero('1500.756', 'USD')).toBe('1500.75');
    // `1,500` es mil quinientos, no uno con cinco: la coma se descarta.
    expect(soloNumero('1,500', 'USD')).toBe('1500');
  });
});

describe('MoneyInput', () => {
  const montar = async (inicial: string) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    const onChange = vi.fn();
    await act(async () => {
      root.render(<MoneyInput value={inicial} onChange={onChange} aria-label="Canon" />);
    });
    const input = host.querySelector('input') as HTMLInputElement;
    return { host, root, input, onChange };
  };

  it('muestra el valor agrupado aunque reciba dígitos pelados', async () => {
    const { input, root, host } = await montar('3000000');
    expect(input.value).toBe('3.000.000');
    await act(async () => root.unmount());
    host.remove();
  });

  it('entrega dígitos pelados, no el texto formateado', async () => {
    const { input, onChange, root, host } = await montar('');
    await act(async () => {
      // React lleva su propio rastreador del valor: asignar `.value` a secas no
      // dispara `onChange`. Hay que pasar por el setter nativo del prototipo.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, '3.000.000');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('3000000');
    await act(async () => root.unmount());
    host.remove();
  });

  it('es de texto, no de número: `type=number` no admite separadores', async () => {
    const { input, root, host } = await montar('1500000');
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('numeric');
    await act(async () => root.unmount());
    host.remove();
  });
});
