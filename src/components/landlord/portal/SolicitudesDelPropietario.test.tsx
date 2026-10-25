/**
 * Solicitudes del propietario (glow up 22-10): lo que espera respuesta va primero y la línea del encabezado lo
 * dice; el estado con su punto y su palabra, sin flecha decorativa.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { listar } = vi.hoisted(() => ({ listar: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/panel/solicitudes',
}));
vi.mock('@/lib/api/pqrs.service', () => ({ pqrsApi: { listMineConDisponibilidad: listar } }));
vi.mock('@/components/tenant/NuevaSolicitudModal', () => ({ NuevaSolicitudModal: () => null }));

import { SolicitudesDelPropietario } from './SolicitudesDelPropietario';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  listar.mockReset();
});

const solicitud = (id: string, estado: string) => ({
  id,
  asunto: `Asunto ${id}`,
  estado,
  tipo: 'reparacion',
  radicado: `R-${id}`,
  createdAt: '2026-10-15T15:00:00.000Z',
});

describe('Solicitudes del propietario', () => {
  it('la abierta va primero y el encabezado dice cuántas esperan respuesta', async () => {
    listar.mockResolvedValue({
      items: [solicitud('cerrada', 'resuelta'), solicitud('abierta', 'en_proceso')],
      contratos: [{ id: 'c-1' }],
    });
    await act(async () => root.render(<SolicitudesDelPropietario />));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const enlaces = Array.from(host.querySelectorAll('[data-testid="propietario-solicitudes"] a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(enlaces).toEqual(['/panel/solicitudes/abierta', '/panel/solicitudes/cerrada']);
    expect(host.textContent).toContain('Tienes 1 solicitud abierta: va primero.');
    expect(host.textContent).toContain('En proceso');
    expect(host.textContent).toContain('Resuelta');
  });
});
