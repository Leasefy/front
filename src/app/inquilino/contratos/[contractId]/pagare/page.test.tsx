/**
 * T-0109 contract.md §3.1.E9 — pantalla "mi firma" del inquilino. Coverage:
 *   (1) hides the pagaré (empty state) on a 404 (back sin WU-4)
 *   (2) no pagareId → "no tienes un pagaré pendiente"
 *   (3) miEstado PENDIENTE + urlDeFirma → external "Ir a firmar" link
 *   (4) miEstado FIRMADO → signed state, no link
 *   (5) esSandbox → sandbox banner
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { MiFirmaDelPagareResponse } from '@/lib/api/pagare.types';

void React;

const miFirma = vi.fn();
vi.mock('@/lib/api/pagare.service', () => ({
  pagareApi: {
    miFirma: (...a: unknown[]) => miFirma(...a),
  },
}));

import MiFirmaDelPagarePage from './page';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  miFirma.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function montar() {
  await act(async () => {
    root.render(<MiFirmaDelPagarePage params={Promise.resolve({ contractId: 'c-1' })} />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function datos(overrides: Partial<MiFirmaDelPagareResponse> = {}): MiFirmaDelPagareResponse {
  return {
    pagareId: 'p-1',
    estado: 'PENDIENTE_DE_FIRMA',
    miEstado: 'PENDIENTE',
    urlDeFirma: 'https://provider.test/firmar/abc',
    esSandbox: false,
    ...overrides,
  };
}

describe('<MiFirmaDelPagarePage>', () => {
  it('shows the "no disponible" empty state on a 404', async () => {
    miFirma.mockRejectedValueOnce(new ApiError(404, 'not found'));
    await montar();
    expect(container.textContent).toContain('no está disponible todavía');
  });

  it('shows "no tienes un pagaré pendiente" when pagareId is null', async () => {
    miFirma.mockResolvedValueOnce(datos({ pagareId: null, estado: null, miEstado: null, urlDeFirma: null }));
    await montar();
    expect(container.textContent).toContain('No tienes un pagaré pendiente');
  });

  it('shows "Ir a firmar" pointing at urlDeFirma while PENDIENTE', async () => {
    miFirma.mockResolvedValueOnce(datos());
    await montar();
    const link = container.querySelector('[data-testid="ir-a-firmar-pagare"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('https://provider.test/firmar/abc');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('shows the signed state once miEstado is FIRMADO, no link', async () => {
    miFirma.mockResolvedValueOnce(datos({ miEstado: 'FIRMADO', urlDeFirma: null }));
    await montar();
    expect(container.querySelector('[data-testid="mi-firma-firmado"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ir-a-firmar-pagare"]')).toBeNull();
  });

  it('shows the sandbox banner when esSandbox', async () => {
    miFirma.mockResolvedValueOnce(datos({ esSandbox: true }));
    await montar();
    expect(container.querySelector('[data-testid="pagare-sandbox-banner"]')?.textContent).toContain('Sandbox');
  });
});
