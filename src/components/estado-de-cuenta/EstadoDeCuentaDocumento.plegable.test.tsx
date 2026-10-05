/**
 * QA-INQ-95 (E-30, R-04 de Nico 16-09): con varios contratos, cada bloque se
 * pliega a su encabezado y su total; con uno solo no hay botón; al imprimir
 * (`sinPaginar`) todo va abierto.
 *
 * (Cabecera copiada de EstadoDeCuentaDocumento.test.tsx.)
 * El documento en pantalla.
 *
 * Lo que se fija: que agrupe por contrato, que la fila partida por un abono
 * parcial se lea como saldo, que el punto de quiebre aparezca fechado, que los
 * totales salgan, que «Sistema anterior» se diga con esas palabras, y que un
 * cliente sin contratos reciba un vacío honesto en vez de un documento con
 * ceros.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// El documento no usa `useI18n`: sus palabras viven en `textos.ts` (ver el
// porqué allá). Sólo las secciones del panel que leen la API (el anticipo y el
// saldo a favor al terminar) se cambian por una marca.
vi.mock('./AnticipoDelContrato', () => ({
  AnticipoDelContratoSeccion: ({ contractId }: { contractId: string }) => (
    <div data-testid={`anticipo-${contractId}`} />
  ),
}));
vi.mock('./SaldoAFavorAlTerminar', () => ({
  SaldoAFavorAlTerminarSeccion: ({ contractId }: { contractId: string }) => (
    <div data-testid={`saldo-al-terminar-${contractId}`} />
  ),
}));
import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import { contrato, contratoConImpuestos, estadoDeCuenta, fila } from './ejemplo-de-prueba';

const HOY = '2026-09-13';

let host: HTMLDivElement;
let root: Root;

function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(nodo);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('E-30 · un bloque plegable por contrato', () => {
  it('con dos contratos cada uno se pliega y se despliega; el total del contrato queda a la vista', async () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta()} hoy={HOY} />);
    const boton = host.querySelector('[data-testid="plegar-contrato-1298"]') as HTMLButtonElement;
    expect(boton).not.toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('[data-testid="arriendos-1298"]')).not.toBeNull();
    await act(async () => { boton.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 600)); });
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(boton.textContent).toContain('Desplegar');
    expect(host.querySelector('[data-testid="arriendos-1298"]')).toBeNull();
    // El otro contrato sigue abierto y el total del plegado se sigue leyendo.
    expect(host.querySelector('[data-testid="contrato-1298"]')?.textContent).toContain('Total del contrato');
    await act(async () => { boton.click(); });
    expect(boton.getAttribute('aria-expanded')).toBe('true');
  });

  it('con un solo contrato no hay nada que plegar', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contrato()] })} hoy={HOY} />);
    expect(host.querySelector('[data-testid^="plegar-contrato-"]')).toBeNull();
  });

  it('al imprimir (sinPaginar) va todo abierto', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta()} hoy={HOY} sinPaginar />);
    const boton = host.querySelector('[data-testid="plegar-contrato-1298"]') as HTMLButtonElement;
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('[data-testid="arriendos-1298"]')).not.toBeNull();
  });
});
