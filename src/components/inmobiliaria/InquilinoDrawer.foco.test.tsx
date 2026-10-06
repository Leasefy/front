/**
 * QA-INQ-95 (L-06, 04-10-2026) · Con el teclado: Tab al nombre → Enter abre la
 * ficha; Esc la cierra y el foco tiene que volver al nombre. Caía al principio
 * de la página («Saltar al contenido principal»): el cajón se abre por estado,
 * no por un `Trigger` de Radix.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/hooks/use-inquilino-detalle', () => ({ useInquilinoDetalle: () => null }));

import { InquilinoDrawer } from './InquilinoDrawer';
import type { Inquilino } from '@/lib/api/inquilinos.service';

const IVAN = { tenantId: 'ivan', nombre: 'Iván Inquilino', email: null, telefono: null, documento: null, arriendos: [] } as unknown as Inquilino;

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function Pantalla({ abierto }: { abierto: boolean }) {
  return (
    <>
      <button type="button" data-testid="nombre">Iván Inquilino</button>
      <InquilinoDrawer persona={abierto ? IVAN : null} onCerrar={() => {}} />
    </>
  );
}

describe('el foco al cerrar la ficha', () => {
  it('vuelve a lo que lo tenía al abrirla', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<Pantalla abierto={false} />));
    const nombre = host.querySelector('[data-testid="nombre"]') as HTMLButtonElement;
    nombre.focus();
    expect(document.activeElement).toBe(nombre);
    await act(async () => root.render(<Pantalla abierto />));
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(document.activeElement).not.toBe(nombre);
    await act(async () => root.render(<Pantalla abierto={false} />));
    await act(async () => { await new Promise((r) => setTimeout(r, 600)); });
    expect(document.activeElement).toBe(nombre);
  });
});
