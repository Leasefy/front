/**
 * 🔴 SO-10 (QA 04-10): el Inicio del propietario dice que tiene una reparación
 * por aprobar (antes no lo mencionaba: sólo la veía si entraba a «Aprobar
 * reparaciones»).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ delPortal: vi.fn() }));
vi.mock('@/lib/api/aprobaciones-de-reparacion.service', () => ({ aprobacionesDeReparacionApi: api }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

import { ReparacionesPorAprobar } from './ReparacionesPorAprobar';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  api.delPortal.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function montar() {
  await act(async () => {
    root.render(<ReparacionesPorAprobar />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe('🔴 SO-10 — el Inicio avisa la reparación por aprobar', () => {
  it('con una pendiente: el aviso con el valor y el enlace a «Aprobar reparaciones»', async () => {
    api.delPortal.mockResolvedValue({
      pendientes: [
        {
          id: 'a-1',
          valorCop: 180_000,
          estado: 'PENDIENTE',
          reparacion: { titulo: 'Fuga en el lavamanos', descripcion: '' },
        },
      ],
      historial: [],
    });
    await montar();
    const aviso = document.body.querySelector('[data-testid="reparaciones-por-aprobar"]')!;
    expect(aviso.getAttribute('href')).toBe('/panel/aprobaciones');
    expect(aviso.textContent).toContain('Tienes una reparación por aprobar');
    expect(aviso.textContent).toMatch(/180\.000/);
    expect(aviso.textContent).toContain('Fuga en el lavamanos');
  });

  it('sin pendientes (o sin respuesta) no dibuja nada', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [], historial: [] });
    await montar();
    expect(document.body.querySelector('[data-testid="reparaciones-por-aprobar"]')).toBeNull();
    api.delPortal.mockRejectedValue(new Error('caído'));
    await montar();
    expect(document.body.querySelector('[data-testid="reparaciones-por-aprobar"]')).toBeNull();
  });
});
