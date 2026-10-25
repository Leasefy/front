/**
 * @vitest-environment happy-dom
 *
 * Ronda 28 (revisora r27): Contratos del propietario dice LA RESPUESTA en una cifra
 * («N por firmar», con su botón) y lo demás en pestañas con conteo dentro de la lista.
 * Antes: cuatro conteos del mismo peso y «Por firmar» dicho dos veces.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hook = vi.hoisted(() => ({ contratos: [] as { id: string; status: string }[] }));
vi.mock('@/lib/hooks/useContracts', () => ({
  useContracts: () => ({ contracts: hook.contratos, isLoading: false, error: null, errorCrudo: null, refetch: vi.fn() }),
}));
vi.mock('@/components/landlord/ContratosConLaInmobiliaria', () => ({
  ContratosConLaInmobiliaria: () => null,
  useContratosAdministrados: () => ({ cargando: false, doc: null }),
}));
vi.mock('@/components/contract/ContractExpandableItem', () => ({
  ContractExpandableItem: ({ contract }: { contract: { id: string; status: string } }) =>
    React.createElement('div', { 'data-testid': 'fila-contrato', 'data-status': contract.status }),
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import ContratosPage from './page';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const pintar = () => act(() => root.render(<ContratosPage />));

describe('Contratos del propietario — la respuesta arriba', () => {
  it('«N por firmar» una vez, con su botón que deja ver sólo esos', () => {
    hook.contratos = [
      { id: '1', status: 'pending_landlord' },
      { id: '2', status: 'pending_landlord' },
      { id: '3', status: 'pending_tenant' },
      { id: '4', status: 'active' },
    ];
    pintar();
    const cifra = container.querySelector('[data-testid="cifras-de-contratos"]');
    expect(cifra?.textContent).toContain('contratos esperan tu firma');
    // Sin el aviso amarillo que repetía la cifra.
    expect(container.querySelector('.bg-warning-soft')).toBeNull();
    expect(container.querySelectorAll('[data-testid="fila-contrato"]')).toHaveLength(4);
    act(() => (container.querySelector('[data-testid="ver-por-firmar"]') as HTMLButtonElement).click());
    const filas = [...container.querySelectorAll('[data-testid="fila-contrato"]')];
    expect(filas).toHaveLength(2);
    expect(filas.every((f) => f.getAttribute('data-status') === 'pending_landlord')).toBe(true);
  });

  it('sin nada por firmar lo dice en una línea, sin botón', () => {
    hook.contratos = [{ id: '4', status: 'active' }];
    pintar();
    expect(container.textContent).toContain('Ningún contrato espera tu firma.');
    expect(container.querySelector('[data-testid="ver-por-firmar"]')).toBeNull();
  });
});
