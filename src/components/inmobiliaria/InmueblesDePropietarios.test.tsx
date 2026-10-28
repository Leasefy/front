/**
 * «De tus propietarios» (Nico, 27-10-2026): sólo los inmuebles que un propietario independiente le asignó al
 * agente (sin `agencyId`), con el contacto del dueño; sin ninguno, no se pinta.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: { get } }));

import { InmueblesDePropietarios } from './InmueblesDePropietarios';

let c: HTMLDivElement;
let r: Root;
beforeEach(() => {
  get.mockReset();
  c = document.createElement('div');
  document.body.appendChild(c);
  r = createRoot(c);
});
afterEach(() => {
  act(() => r.unmount());
  c.remove();
});
async function montar() {
  await act(async () => {
    r.render(<InmueblesDePropietarios />);
  });
  await act(async () => {
    await new Promise((s) => setTimeout(s, 0));
  });
}

describe('InmueblesDePropietarios', () => {
  it('muestra sólo los de propietarios independientes, con su dueño y WhatsApp', async () => {
    get.mockImplementation((ruta: string) => {
      if (ruta === '/properties/assigned') {
        return Promise.resolve([
          { id: 'a', title: 'Apto en Laureles', agencyId: null, monthlyRent: 2_000_000, city: 'Medellín', neighborhood: 'Laureles' },
          { id: 'b', title: 'De la inmobiliaria', agencyId: 'ag1', monthlyRent: 1_000_000 },
        ]);
      }
      return Promise.resolve({ firstName: 'Gloria', lastName: 'Pérez', phone: '3001234567' });
    });
    await montar();
    const bloque = c.querySelector('[data-testid="inmuebles-de-propietarios"]')!;
    expect(bloque.textContent).toContain('Apto en Laureles');
    expect(bloque.textContent).not.toContain('De la inmobiliaria');
    expect(bloque.textContent).toContain('Gloria Pérez');
    expect(bloque.querySelector('a[href="https://wa.me/573001234567"]')).not.toBeNull();
  });

  it('sin inmuebles de propietarios (o sin la ruta) no pinta nada', async () => {
    get.mockRejectedValue(new Error('403'));
    await montar();
    expect(c.innerHTML).toBe('');
  });
});
