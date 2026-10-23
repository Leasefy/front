/**
 * «Mis giros» del propietario de inmobiliaria (glow up 22-10): LA RESPUESTA —cuánto le han girado este año— en
 * grande; un giro devuelto (lo único urgente) va primero con su cuenta, y la cuenta sin novedades va al final.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ cuentaDeGiro: vi.fn(), giros: vi.fn(), bajarExtracto: vi.fn() }));
vi.mock('@/lib/api/portal-del-propietario.service', () => ({ portalDelPropietarioApi: api }));
vi.mock('@/lib/fechas/fecha-de-la-casa', async (original) => ({
  ...(await original<typeof import('@/lib/fechas/fecha-de-la-casa')>()),
  hoyEnColombia: () => '2026-10-22',
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import MisGirosPage from './page';

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
  vi.clearAllMocks();
});

async function montar() {
  act(() => root.render(<MisGirosPage />));
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

const ficha = (extra: Record<string, unknown> = {}) => ({
  propietarioId: 'p-1',
  banco: 'Bancolombia',
  tipo: 'AHORROS',
  cuenta: '•••• 1234',
  giroDevuelto: null,
  cambioEnCurso: null,
  ...extra,
});

describe('Mis giros', () => {
  it('lo girado en el año va en grande (sólo girados y vueltos a girar de este año)', async () => {
    api.cuentaDeGiro.mockResolvedValue({ fichas: [ficha()] });
    api.giros.mockResolvedValue({
      giros: [
        { id: 'g1', mes: '2026-09', valorCop: 1_200_000, estado: 'GIRADO', giradoEl: '2026-09-10' },
        { id: 'g2', mes: '2026-08', valorCop: 1_000_000, estado: 'REGIRADO', giradoEl: '2026-08-12' },
        { id: 'g3', mes: '2026-10', valorCop: 900_000, estado: 'EN_CAMINO', giradoEl: null },
        { id: 'g4', mes: '2025-12', valorCop: 700_000, estado: 'GIRADO', giradoEl: '2025-12-10' },
      ],
    });
    await montar();
    expect(host.querySelector('[data-testid="girado-en-el-anio"]')?.textContent).toMatch(/2\.200\.000/);
    expect(host.querySelector('[data-testid="lo-que-te-giraron"]')?.textContent).toContain('en 2 giros');
    // Revisora r27: la lista va por año (el más reciente primero); 2025 queda en su pestaña.
    expect(host.querySelectorAll('[data-testid="lista-de-giros"] li').length).toBe(3);
    expect(Array.from(host.querySelectorAll('button')).some((b) => b.textContent?.includes('2025'))).toBe(true);
    // La cuenta sin novedades va DESPUÉS de lo girado.
    const orden = Array.from(host.querySelectorAll('[data-testid="lo-que-te-giraron"], [data-testid^="cuenta-de-giro-"]')).map(
      (n) => n.getAttribute('data-testid'),
    );
    expect(orden).toEqual(['lo-que-te-giraron', 'cuenta-de-giro-p-1']);
  });

  it('un giro devuelto pone su cuenta PRIMERO, con el aviso', async () => {
    api.cuentaDeGiro.mockResolvedValue({
      fichas: [ficha({ giroDevuelto: { valorCop: 1_500_000, fecha: '2026-10-05', motivo: 'Cuenta cancelada', cuenta: '•••• 1234' } })],
    });
    api.giros.mockResolvedValue({ giros: [] });
    await montar();
    const orden = Array.from(host.querySelectorAll('[data-testid="lo-que-te-giraron"], [data-testid^="cuenta-de-giro-"]')).map(
      (n) => n.getAttribute('data-testid'),
    );
    expect(orden).toEqual(['cuenta-de-giro-p-1', 'lo-que-te-giraron']);
    expect(host.querySelector('[data-testid="giro-devuelto"]')).not.toBeNull();
    // Sin giros no se pinta una cifra en cero: lo dice.
    expect(host.querySelector('[data-testid="girado-en-el-anio"]')).toBeNull();
    expect(host.querySelector('[data-testid="sin-giros"]')).not.toBeNull();
  });
});
