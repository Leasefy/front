/** El sello «Gestionado por Leasefy» (Nico, 31-10-2026): sólo si el back dice que Leasefy gestiona sus inmuebles. */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({ gestionDeLeasefy: vi.fn() }));
vi.mock('@/lib/api/landlord.service', () => ({ landlordApi: { gestionDeLeasefy: m.gestionDeLeasefy } }));

import { SelloGestionadoPorLeasefy, useGestionadoPorLeasefy } from './SelloGestionadoPorLeasefy';

function Prueba({ preguntar }: { preguntar: boolean }) {
  return useGestionadoPorLeasefy(preguntar) ? <SelloGestionadoPorLeasefy /> : null;
}

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

async function montar(preguntar: boolean) {
  await act(async () => root.render(<Prueba preguntar={preguntar} />));
  await act(async () => new Promise((r) => setTimeout(r, 0)));
}
const sello = () => host.querySelector('[data-testid="sello-gestionado-por-leasefy"]');

describe('el sello «Gestionado por Leasefy»', () => {
  it('sale cuando Leasefy le gestiona inmuebles', async () => {
    m.gestionDeLeasefy.mockResolvedValue({ gestionado: true });
    await montar(true);
    expect(sello()?.textContent).toContain('Gestionado por Leasefy');
  });

  it('no sale si no lo gestiona, si el back falla o si no se pregunta (propietario de inmobiliaria)', async () => {
    m.gestionDeLeasefy.mockResolvedValue({ gestionado: false });
    await montar(true);
    expect(sello()).toBeNull();
    m.gestionDeLeasefy.mockRejectedValue(new Error('caído'));
    await montar(true);
    expect(sello()).toBeNull();
    m.gestionDeLeasefy.mockClear();
    await montar(false);
    expect(m.gestionDeLeasefy).not.toHaveBeenCalled();
  });
});
