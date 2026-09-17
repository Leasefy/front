import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ConfigCicloDeVidaDelContrato } from './ConfigCicloDeVidaDelContrato';
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
    root!.render(<ConfigCicloDeVidaDelContrato agency={agency as AgencyProfile} onSave={onSave} />);
  });
  return onSave;
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLInputElement | null;

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function guardar() {
  const boton = [...container!.querySelectorAll('button')].find((b) => b.textContent === 'Guardar')!;
  await act(async () => boton.click());
}

describe('<ConfigCicloDeVidaDelContrato> (17-09)', () => {
  it('D6: guarda los días antes de la carta y SÓLO eso', async () => {
    const onSave = await montar({ diasAntesCartaIncremento: null, pactaGastosDeCobranza: null });
    await escribir($('dias-antes-carta')!, '45');
    await guardar();
    expect(onSave).toHaveBeenCalledWith({ diasAntesCartaIncremento: 45 });
  });

  it('fuera de 1-120 no llega al back', async () => {
    const onSave = await montar({});
    await escribir($('dias-antes-carta')!, '200');
    await guardar();
    expect(onSave).not.toHaveBeenCalled();
    expect(container!.textContent).toContain('de 1 a 120');
  });

  it('D9: elegir «No, por defecto» manda pactaGastosDeCobranza: false', async () => {
    const onSave = await montar({ pactaGastosDeCobranza: null });
    await act(async () => $('gastos-NO')!.click());
    await guardar();
    expect(onSave).toHaveBeenCalledWith({ pactaGastosDeCobranza: false });
  });

  it('🔴 D10: a la entrega sin tope avisa que un abogado debe validar el tope', async () => {
    const onSave = await montar({ garantiaServiciosMomento: null, garantiaServiciosTopeCop: null });
    expect($('garantia-sin-tope')).toBeNull();
    await act(async () => $('garantia-momento-ENTREGA')!.click());
    expect($('garantia-sin-tope')?.textContent).toContain('abogado');
    await guardar();
    expect(onSave).toHaveBeenCalledWith({ garantiaServiciosMomento: 'ENTREGA' });
  });

  it('D10: con tope no avisa y guarda el tope en pesos', async () => {
    const onSave = await montar({ garantiaServiciosMomento: 'INICIO', garantiaServiciosTopeCop: null });
    await escribir($('garantia-tope')!, '1.500.000');
    expect($('garantia-sin-tope')).toBeNull();
    await guardar();
    expect(onSave).toHaveBeenCalledWith({ garantiaServiciosTopeCop: 1500000 });
  });

  it('sin cambios no manda nada (sin migración el back diría 503)', async () => {
    const onSave = await montar({ diasAntesCartaIncremento: 30, pactaGastosDeCobranza: true });
    await guardar();
    expect(onSave).not.toHaveBeenCalled();
  });
});
