/**
 * RegistrosContables.test.tsx — el paso 5 cuando las cosas fallan.
 *
 * Los dos silencios peligrosos que este archivo congela:
 *
 *  1. La lectura del PUC caída se pintaba como «Primero el plan de cuentas»
 *     — y mandaba al paso 4 a quien ya tiene plan.
 *  2. La lectura de «lo ya cargado» caída no decía nada — y esa franja es el
 *     guard contra registrar la apertura dos veces.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CuentaPuc } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

const { api } = vi.hoisted(() => ({
  api: {
    puc: { listar: vi.fn() },
    asientos: { listar: vi.fn(), crear: vi.fn() },
    migracion: { revisar: vi.fn(), aplicar: vi.fn() },
  },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, ...api } };
});

import { RegistrosContables } from './RegistrosContables';

const CUENTA: CuentaPuc = {
  id: 'c-1',
  agencyId: 'ag-1',
  codigo: '110505',
  nombre: 'Caja general',
  naturaleza: 'DEBITO',
  padreId: null,
  imputable: true,
  activa: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const SIN_ASIENTOS = { total: 0, limite: 200, desplazamiento: 0, asientos: [] };

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<RegistrosContables />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

async function click(el: Element | null) {
  if (!el) throw new Error('no está el elemento a clickear');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.puc.listar.mockResolvedValue([CUENTA]);
  api.asientos.listar.mockResolvedValue(SIN_ASIENTOS);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('la lectura del plan caída', () => {
  it('🔴 no se disfraza de «sin PUC»: cartel con reintentar, sin mandar al paso 4', async () => {
    api.puc.listar.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));

    await pintar();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('servidor');
    expect(q('contables-reintentar')).not.toBeNull();
    expect(q('contables-sin-puc')).toBeNull();
    // Tampoco los caminos: un selector de cuentas vacío no es un camino.
    expect(q('asiento-de-apertura')).toBeNull();
  });

  it('reintentar relee y, con respuesta, aparecen los caminos', async () => {
    api.puc.listar
      .mockRejectedValueOnce(new Error('se cayó'))
      .mockResolvedValue([CUENTA]);

    await pintar();
    await click(q('contables-reintentar'));

    expect(q('contables-reintentar')).toBeNull();
    expect(q('asiento-de-apertura')).not.toBeNull();
  });

  it('con el PUC de verdad vacío sí manda al paso 4', async () => {
    api.puc.listar.mockResolvedValue([]);

    await pintar();

    expect(q('contables-sin-puc')).not.toBeNull();
    expect(q('contables-reintentar')).toBeNull();
  });
});

describe('la lectura de lo ya cargado caída', () => {
  it('🔴 no es silencio: se avisa que el guard anti-doble-apertura está ciego', async () => {
    api.asientos.listar.mockRejectedValue(new Error('timeout'));

    await pintar();

    const aviso = q('contables-cargado-fallo');
    expect(aviso).not.toBeNull();
    expect(aviso?.textContent).toContain('dos veces');
    // Y el resumen viejo (acá inexistente) no se muestra como si fuera actual.
    expect(q('contables-resumen')).toBeNull();
    // Los caminos sí están: el PUC se leyó bien.
    expect(q('asiento-de-apertura')).not.toBeNull();
  });

  it('su reintentar relee y el aviso se va', async () => {
    api.asientos.listar
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(SIN_ASIENTOS);

    await pintar();
    const boton = [...(q('contables-cargado-fallo')?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.includes('Reintentar'),
    );
    await click(boton ?? null);

    expect(q('contables-cargado-fallo')).toBeNull();
    expect(q('contables-resumen')).not.toBeNull();
  });
});
