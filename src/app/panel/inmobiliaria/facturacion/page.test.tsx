/**
 * page.test.tsx — Facturación.
 *
 * Nico (2026-09-03): «esas tabs ¿por qué están fuera de la tabla? sabés que
 * deben quedar dentro». Lo que fija esta prueba es la forma de la tarjeta:
 * las pestañas ADENTRO, el vacío en el cuerpo con los encabezados visibles, y
 * ningún control sin comportamiento (la leyenda de estados que no filtraba y
 * «Nueva factura», que sólo mostraba un toast).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

import FacturacionPage from './page';

const K = 'inmobiliaria.facturacion.';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<FacturacionPage />);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

const q = (s: string) => host.querySelector(s);
const qa = (s: string) => Array.from(host.querySelectorAll(s));

/** Radix Tabs cambia de pestaña en `mousedown`, no en `click`. */
async function activarPestana(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    (el as HTMLElement).click();
  });
}

describe('/panel/inmobiliaria/facturacion', () => {
  it('las pestañas viven dentro de la tarjeta de la tabla, antes de la tabla', () => {
    const tarjeta = q('[data-testid="facturacion-tarjeta"]');
    expect(tarjeta).not.toBeNull();

    const listas = qa('[role="tablist"]');
    expect(listas).toHaveLength(1);
    expect(tarjeta!.contains(listas[0])).toBe(true);

    const tabla = tarjeta!.querySelector('table');
    expect(tabla).not.toBeNull();
    // La lista de pestañas precede a la tabla dentro de la misma tarjeta.
    expect(listas[0].compareDocumentPosition(tabla!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(qa('[role="tab"]').map((t) => t.textContent)).toEqual([
      `${K}tab_ventas`,
      `${K}tab_compras`,
      `${K}tab_electronica`,
      `${K}tab_notas`,
    ]);
  });

  it('los encabezados se ven y el vacío va en el cuerpo, en una celda que los abarca', () => {
    expect(qa('thead th')).toHaveLength(9);

    const celda = q('tbody td');
    expect(celda).not.toBeNull();
    expect(celda!.getAttribute('colspan')).toBe('9');

    const vacio = celda!.querySelector('[data-testid="sin-datos"]');
    expect(vacio).not.toBeNull();
    // La descripción de la pestaña vive en el vacío, no en una franja aparte.
    expect(vacio!.textContent).toContain(`${K}desc_ventas`);
  });

  it('cambiar de pestaña cambia las columnas y el vacío', async () => {
    const compras = qa('[role="tab"]').find((t) => t.textContent === `${K}tab_compras`)!;
    await activarPestana(compras);

    expect(compras.getAttribute('aria-selected')).toBe('true');
    expect(qa('thead th')).toHaveLength(7);
    expect(q('tbody td')!.getAttribute('colspan')).toBe('7');
    expect(q('[data-testid="sin-datos"]')!.textContent).toContain(`${K}desc_compras`);
  });

  it('no queda ningún control sin comportamiento; el banner del M2 sigue', () => {
    const texto = host.textContent ?? '';
    // «Nueva factura» sólo mostraba un toast «llega con M2».
    expect(texto).not.toContain(`${K}new`);
    // La leyenda de estados no filtraba nada.
    expect(texto).not.toContain(`${K}estadosLabel`);
    expect(texto).not.toContain(`${K}estadoAceptada`);
    // Los únicos botones son las cuatro pestañas.
    expect(qa('button')).toHaveLength(4);
    expect(qa('button').every((b) => b.getAttribute('role') === 'tab')).toBe(true);

    expect(texto).toContain(`${K}m2BannerTitle`);
  });
});
