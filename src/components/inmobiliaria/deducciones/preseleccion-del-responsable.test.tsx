/**
 * 🔴 SO-11 (QA 04-10): al crear la solicitud se escoge «Responsable del pago»
 * y al aprobar la cotización se volvía a preguntar «¿A cargo de quién queda la
 * reparación?» sin nada marcado. Ahora llega marcado lo escogido (y se puede
 * cambiar).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ACargoDeDialog } from './ACargoDeDialog';

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

const marcada = (valor: string) =>
  document.body.querySelector(`[data-testid="a-cargo-de-${valor}"]`)!.className.includes('border-primary');

describe('🔴 SO-11 — el responsable escogido al crear llega marcado', () => {
  it.each([['INQUILINO'], ['PROPIETARIO'], ['INMOBILIARIA']] as const)('%s viene marcado', (valor) => {
    act(() => {
      root.render(
        <ACargoDeDialog
          abierto
          onOpenChange={vi.fn()}
          cotizacion={{ proveedor: 'Plomería QA Día S.A.S.', valorCop: 180_000 }}
          preseleccion={valor}
          onConfirmar={vi.fn().mockResolvedValue(undefined)}
        />,
      );
    });
    expect(marcada(valor)).toBe(true);
  });

  it('sin preselección no inventa nada', () => {
    act(() => {
      root.render(
        <ACargoDeDialog
          abierto
          onOpenChange={vi.fn()}
          cotizacion={{ proveedor: 'X', valorCop: 1 }}
          onConfirmar={vi.fn().mockResolvedValue(undefined)}
        />,
      );
    });
    expect(marcada('PROPIETARIO')).toBe(false);
    expect(marcada('INQUILINO')).toBe(false);
  });
});
