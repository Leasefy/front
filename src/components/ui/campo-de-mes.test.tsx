import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampoDeMes, mesParaElBoton } from './campo-de-mes';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  document.body.innerHTML = '';
  root = null;
  container = null;
});

async function montar(props: Partial<React.ComponentProps<typeof CampoDeMes>> = {}) {
  const onChange = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<CampoDeMes id="mes" value="" onChange={onChange} {...props} />);
  });
  return onChange;
}

describe('CampoDeMes', () => {
  it('el botón dice el mes en español, con mayúscula', () => {
    expect(mesParaElBoton('2026-10')).toBe('Octubre de 2026');
  });

  it('abre los doce meses del año y entrega AAAA-MM al elegir', async () => {
    const onChange = await montar({ value: '2026-03' });
    expect(document.getElementById('mes')!.textContent).toMatch(/Marzo de 2026/);
    await act(async () => {
      document.getElementById('mes')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const octubre = document.querySelector('[aria-label="octubre de 2026"]') as HTMLButtonElement;
    expect(octubre).not.toBeNull();
    await act(async () => {
      octubre.click();
    });
    expect(onChange).toHaveBeenCalledWith('2026-10');
  });

  it('los meses fuera de [min, max] no se pueden elegir', async () => {
    await montar({ value: '2026-06', min: '2026-03', max: '2026-08' });
    await act(async () => {
      document.getElementById('mes')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect((document.querySelector('[aria-label="febrero de 2026"]') as HTMLButtonElement).disabled).toBe(true);
    expect((document.querySelector('[aria-label="septiembre de 2026"]') as HTMLButtonElement).disabled).toBe(true);
    expect((document.querySelector('[aria-label="mayo de 2026"]') as HTMLButtonElement).disabled).toBe(false);
  });
});
