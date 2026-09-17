import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ConfigPenalidadDeTerminacion } from './ConfigPenalidadDeTerminacion';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

async function montar(agency: Partial<AgencyProfile>, onSave = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<ConfigPenalidadDeTerminacion agency={agency as AgencyProfile} onSave={onSave} />);
  });
  return onSave;
}

describe('<ConfigPenalidadDeTerminacion> (17-09)', () => {
  it('muestra la guardada y guarda los cánones', async () => {
    const onSave = await montar({ penalidadTerminacionCanones: 3 });
    const input = container!.querySelector('[data-testid="penalidad-por-defecto"]') as HTMLInputElement;
    expect(input.value).toBe('3');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '2,5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const boton = [...container!.querySelectorAll('button')].find((b) => b.textContent === 'Guardar')!;
    await act(async () => boton.click());
    expect(onSave).toHaveBeenCalledWith({ penalidadTerminacionCanones: 2.5 });
  });

  it('vacío guarda `null`: la inmobiliaria no tiene penalidad por defecto', async () => {
    const onSave = await montar({ penalidadTerminacionCanones: null });
    const boton = [...container!.querySelectorAll('button')].find((b) => b.textContent === 'Guardar')!;
    await act(async () => boton.click());
    expect(onSave).toHaveBeenCalledWith({ penalidadTerminacionCanones: null });
  });
});
