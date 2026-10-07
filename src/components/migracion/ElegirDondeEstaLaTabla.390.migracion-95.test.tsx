/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — TE-20: Terceros a 390 px.
 * El desplegable «Los encabezados están en la fila…» tenía un mínimo fijo de
 * 12rem y se salía 11 px de la tarjeta (scroll horizontal de la página). En
 * pantallas chicas ocupa el ancho disponible; el mínimo sólo rige desde `sm`.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ElegirDondeEstaLaTabla } from './ElegirDondeEstaLaTabla';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('el desplegable de la fila de encabezados a 390 px (TE-20)', () => {
  it('🔴 no impone un ancho mínimo fijo en el celular', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() =>
      root.render(
        <ElegirDondeEstaLaTabla
          donde={{ hojas: ['Propietarios'], hoja: 'Propietarios', fila: 0, primerasFilas: [['Tipo de documento', 'Número de documento', 'Nombre completo'], ['CC', '1', 'Ana']] }}
          onElegirHoja={() => {}}
          onElegirFila={() => {}}
        />,
      ),
    );
    const clases = (host.querySelector('[data-testid="elegir-fila-de-encabezado"]')?.getAttribute('class') ?? '').split(/\s+/);
    expect(clases).toContain('max-w-full');
    expect(clases).not.toContain('min-w-[12rem]');
    expect(clases).toContain('sm:min-w-[12rem]');
  });
});
