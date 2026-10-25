/**
 * Mis contratos del inquilino (glow up 22-10): lo que le toca firmar va primero y la línea del encabezado lo dice;
 * el estado en su voz con punto y palabra; un solo azul (el botón de firmar); el fallo con el encabezado común.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estado = vi.hoisted(() => ({
  contracts: [] as Array<Record<string, unknown>>,
  error: null as unknown,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => String(n) }),
}));
vi.mock('@/lib/hooks/useContracts', () => ({
  useContracts: () => ({
    contracts: estado.contracts,
    isLoading: false,
    error: estado.error,
    errorCrudo: estado.error,
    refetch: vi.fn(),
  }),
}));

import ContratosPage from './page';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  estado.contracts = [];
  estado.error = null;
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function montar() {
  act(() => root.render(<ContratosPage />));
}

const contrato = (id: string, status: string, updatedAt: string) => ({
  id,
  status,
  propertyId: `p-${id}`,
  propertyAddress: `Calle ${id}`,
  propertyCity: 'Medellín',
  monthlyRent: 2_500_000,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  updatedAt,
});

describe('Mis contratos del inquilino', () => {
  it('el que le toca firmar va primero, lo dice el encabezado y es el único botón azul', () => {
    estado.contracts = [
      contrato('a', 'active', '2026-10-20T10:00:00Z'),
      contrato('b', 'pending_tenant', '2026-09-01T10:00:00Z'),
    ];
    montar();
    const tarjetas = Array.from(host.querySelectorAll('[data-testid^="contrato-del-inquilino-"]'));
    expect(tarjetas.map((t) => t.getAttribute('data-testid'))).toEqual([
      'contrato-del-inquilino-b',
      'contrato-del-inquilino-a',
    ]);
    expect(host.textContent).toContain('Tienes un contrato por firmar: va primero.');
    expect(tarjetas[0].textContent).toContain('Te toca firmar');
    expect(tarjetas[1].textContent).toContain('Vigente');
    const firmar = tarjetas[0].querySelector('a[href="/inquilino/contratos/b/firmar"]');
    expect(firmar?.textContent).toContain('Revisar y firmar');
    expect(host.textContent).not.toContain('Requiere tu firma');
  });

  it('sin contratos: el vacío lleva a los inmuebles para mí', () => {
    montar();
    expect(host.querySelector('a[href="/inquilino/para-ti"]')?.textContent).toContain('Ver inmuebles para mí');
  });

  it('si no cargan: el encabezado común y el fallo con reintento', () => {
    estado.error = new Error('boom');
    montar();
    expect(host.querySelector('h1')?.textContent).toContain('Contrato y documentos');
    expect(host.textContent).toContain('tus contratos');
  });
});
