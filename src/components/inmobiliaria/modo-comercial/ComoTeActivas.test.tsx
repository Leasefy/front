/** «¿Cómo te activas?» (Nico, 27-10-2026): empresa o persona natural (el agente), con sus impuestos dichos por él. */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { push, updateAgency } = vi.hoisted(() => ({ push: vi.fn(), updateAgency: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ agencyApi: { updateAgency } }));

import { ComoTeActivas } from './ComoTeActivas';

let c: HTMLDivElement;
let r: Root;
beforeEach(() => {
  push.mockReset();
  updateAgency.mockReset();
  updateAgency.mockResolvedValue({});
  c = document.createElement('div');
  document.body.appendChild(c);
  r = createRoot(c);
  act(() => r.render(<ComoTeActivas destino="/onboarding/inmobiliaria" />));
});
afterEach(() => {
  act(() => r.unmount());
  c.remove();
});
const tocar = async (id: string) =>
  act(async () => {
    c.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!.click();
  });

describe('ComoTeActivas', () => {
  it('como empresa sigue al asistente sin tocar los impuestos', async () => {
    await tocar('activar-mi-cuenta');
    expect(updateAgency).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/onboarding/inmobiliaria');
  });

  it('como persona natural: por defecto todo en NO, se guarda y sigue', async () => {
    await tocar('activar-como-persona');
    expect(c.querySelector('[data-testid="preguntas-de-persona-natural"]')).not.toBeNull();
    await tocar('activar-mi-cuenta');
    expect(updateAgency).toHaveBeenCalledWith({
      responsableIva: false,
      agenteRetenedorRenta: false,
      agenteRetenedorIva: false,
      agenteRetenedorIca: false,
    });
    expect(push).toHaveBeenCalledWith('/onboarding/inmobiliaria');
  });

  it('lo que responde es lo que se guarda; si falla, no sigue y lo dice', async () => {
    updateAgency.mockRejectedValueOnce(new Error('caída'));
    await tocar('activar-como-persona');
    await tocar('iva-si');
    await tocar('retencion-si');
    await tocar('activar-mi-cuenta');
    expect(updateAgency).toHaveBeenCalledWith({
      responsableIva: true,
      agenteRetenedorRenta: true,
      agenteRetenedorIva: true,
      agenteRetenedorIca: true,
    });
    expect(push).not.toHaveBeenCalled();
    expect(c.textContent).toContain('caída');
  });
});
