/**
 * QA-FACT-CONTA-95 r2 · FA-E-14: el portal del propietario dice de frente lo que
 * todavía no muestra (la certificación del mandatario y las facturas de la
 * comisión) y a quién pedírselas, también cuando no tiene certificados.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({ api: { misCertificados: vi.fn() } }));
vi.mock('@/lib/api/tesoreria.service', () => ({ tesoreriaApi: api }));

import MisCertificadosPage from './page';

let container: HTMLDivElement;
let root: Root | null = null;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MisCertificadosPage />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('FA-E-14 · el portal del propietario dice lo que no muestra', () => {
  it('nombra la certificación del mandatario y las facturas de comisión y dice a quién pedirlas', async () => {
    api.misCertificados.mockResolvedValue({ certificados: [], motivo: null });
    await pintar();
    const nota = document.querySelector('[data-testid="portal-sin-certificacion-ni-facturas"]');
    expect(nota).not.toBeNull();
    expect(nota!.textContent).toContain('certificación del mandatario');
    expect(nota!.textContent).toContain('facturas de la comisión');
    expect(nota!.textContent).toContain('pídeselas a tu inmobiliaria');
  });
});
