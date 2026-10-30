/**
 * Observaciones internas (Juan, 27-10-2026: «sólo las ve la inmobiliaria… humedad en el techo») y el estado con
 * color («disponible en verdecito»).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({ api: { leer: vi.fn(), guardarObservaciones: vi.fn() } }));
vi.mock('@/lib/api/apuntes-del-inmueble.service', () => ({ apuntesDelInmuebleApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ObservacionesInternas } from './ObservacionesInternas';
import { EstadoDelInmueble } from './EstadoDelInmueble';

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  vi.clearAllMocks();
});
const q = (id: string) => contenedor.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe('ObservacionesInternas', () => {
  it('dice que sólo las ve el equipo, trae lo guardado y guarda lo que cambió', async () => {
    api.leer.mockResolvedValue({ disponible: true, condiciones: null, observacionesInternas: 'Humedad en el techo' });
    api.guardarObservaciones.mockResolvedValue({ disponible: true, condiciones: null, observacionesInternas: 'Humedad en el techo del baño' });
    await act(async () => raiz.render(<ObservacionesInternas propertyId="p-1" />));
    expect(contenedor.textContent).toContain('Sólo las ve tu equipo');
    const campo = q('observaciones-internas-texto') as HTMLTextAreaElement;
    expect(campo.value).toBe('Humedad en el techo');
    expect((q('observaciones-internas-guardar') as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(campo, 'Humedad en el techo del baño');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => (q('observaciones-internas-guardar') as HTMLButtonElement).click());
    expect(api.guardarObservaciones).toHaveBeenCalledWith('p-1', 'Humedad en el techo del baño');
  });

  it('sin la migración del back, lo dice y no ofrece guardar', async () => {
    api.leer.mockResolvedValue({ disponible: false, condiciones: null, observacionesInternas: null });
    await act(async () => raiz.render(<ObservacionesInternas propertyId="p-1" />));
    expect(q('observaciones-internas-no-disponible')).not.toBeNull();
    expect(q('observaciones-internas-guardar')).toBeNull();
  });
});

describe('EstadoDelInmueble', () => {
  it('cada estado con su rótulo y su color: disponible en verde', () => {
    act(() => raiz.render(<EstadoDelInmueble estado="AVAILABLE" />));
    expect(q('estado-del-inmueble')?.textContent).toBe('Disponible');
    expect(q('estado-del-inmueble')?.className).toContain('text-success');
    act(() => raiz.render(<EstadoDelInmueble estado="draft" />));
    expect(q('estado-del-inmueble')?.textContent).toBe('Borrador');
  });
});
