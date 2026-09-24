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

  it('🔴 el tope de la garantía en PERÍODOS de facturación (17-09): 2 por defecto', async () => {
    const onSave = await montar({
      garantiaServiciosMomento: 'ENTREGA',
      garantiaServiciosTopePeriodos: null,
    });
    // Vacío = los 2 por defecto, y el marcador lo dice.
    expect($('garantia-tope-periodos')!.placeholder).toBe('2');
    await escribir($('garantia-tope-periodos')!, '3');
    await guardar();
    expect(onSave).toHaveBeenCalledWith({ garantiaServiciosTopePeriodos: 3 });
  });

  it('el tope en períodos va de 1 a 12', async () => {
    const onSave = await montar({ garantiaServiciosMomento: 'ENTREGA' });
    await escribir($('garantia-tope-periodos')!, '13');
    await guardar();
    expect(onSave).not.toHaveBeenCalled();
    expect(container!.textContent).toContain('de 1 a 12');
  });

  it('sin ninguno de los dos topes, el aviso de validar con abogado', async () => {
    await montar({
      garantiaServiciosMomento: 'ENTREGA',
      garantiaServiciosTopeCop: null,
      garantiaServiciosTopePeriodos: null,
    });
    expect($('garantia-sin-tope')).toBeTruthy();
    // Con el de períodos puesto, ya no hace falta el aviso.
    await escribir($('garantia-tope-periodos')!, '2');
    expect($('garantia-sin-tope')).toBeNull();
  });

  it('🔴 la vigencia del estudio son 60 días, y se puede cambiar', async () => {
    const onSave = await montar({ vigenciaEstudioDias: null });
    expect($('vigencia-estudio')!.placeholder).toBe('60');
    await escribir($('vigencia-estudio')!, '90');
    await guardar();
    expect(onSave).toHaveBeenCalledWith({ vigenciaEstudioDias: 90 });
  });

  it('🔴 el seguro opcional se configura como % del canon, por plan', async () => {
    const onSave = await montar({ seguroOpcionalPctPorPlan: null });
    await escribir($('seguro-pct-BASIC')!, '1.5');
    await escribir($('seguro-pct-PREMIUM')!, '3');
    await guardar();
    expect(onSave).toHaveBeenCalledWith({
      seguroOpcionalPctPorPlan: { BASIC: 1.5, PREMIUM: 3 },
    });
  });

  it('quitar el % de un plan lo manda SIN esa clave (el mapa se reemplaza entero)', async () => {
    const onSave = await montar({ seguroOpcionalPctPorPlan: { BASIC: 1.5, PREMIUM: 3 } });
    await escribir($('seguro-pct-PREMIUM')!, '');
    await guardar();
    expect(onSave).toHaveBeenCalledWith({ seguroOpcionalPctPorPlan: { BASIC: 1.5 } });
  });

  it('el % del seguro va entre 0 y 100', async () => {
    const onSave = await montar({});
    await escribir($('seguro-pct-BASIC')!, '120');
    await guardar();
    expect(onSave).not.toHaveBeenCalled();
    expect(container!.textContent).toContain('entre 0 y 100');
  });

  it('D9: la pantalla sugiere «sí, por defecto» para quien ya los pacta', async () => {
    await montar({ pactaGastosDeCobranza: null });
    expect(container!.textContent).toContain('Sugerido: «sí, por defecto»');
  });
});
