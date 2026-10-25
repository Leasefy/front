/**
 * R1 (revisora r27, 23-10-2026): a 390 el pie de las tablas se partía en dos
 * renglones y dejaba «293 ›» solo abajo (Inmuebles, Renovaciones, Cartas,
 * Rentabilidad, Cuentas del PUC). Bajo `sm` va UN renglón, «Filas [25]» y
 * «‹ 1 de 293 ›»; el DOM del DS no cambia: mismos botones y mismos nombres.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { TablePagination } from './pagination';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function montar(props: Partial<React.ComponentProps<typeof TablePagination>> = {}) {
  act(() => {
    root.render(
      <TablePagination
        total={7320}
        page={1}
        pageSize={25}
        pageSizeOptions={[25, 50, 100]}
        data-testid="paginador"
        {...props}
      />,
    );
  });
  return container.querySelector('[data-testid="paginador"]') as HTMLElement;
}

describe('la paginación en el celular', () => {
  it('dice cuántas páginas hay («de 293») para el «1 de 293» de 390', () => {
    const pie = montar();
    expect(pie.style.getPropertyValue('--de-cuantas-paginas')).toBe('"de 293"');
  });

  it('con miles, el número lleva su punto', () => {
    const pie = montar({ total: 250_000, pageSize: 25 });
    expect(pie.style.getPropertyValue('--de-cuantas-paginas')).toBe('"de 10.000"');
  });

  it('bajo sm: un renglón, sin «Mostrando…» ni los números que no son la página actual', () => {
    const clases = montar().className;
    expect(clases).toContain('max-sm:flex-nowrap');
    expect(clases).toContain('max-sm:[&>span]:hidden');
    expect(clases).toContain('max-sm:[&>div]:flex-nowrap');
    expect(clases).toContain('max-sm:[&>div>button:not([aria-label]):not([aria-current])]:hidden');
    expect(clases).toContain('max-sm:[&>div>button[aria-current]]:after:content-[var(--de-cuantas-paginas)]');
    // Desde sm, el grupo de la derecha se sigue pudiendo partir.
    expect(clases).toContain('sm:[&>div]:flex-wrap');
  });

  it('no cambia la API ni el DOM: mismas flechas, mismos números, mismo selector, mismo data-testid', () => {
    const pie = montar({ page: 5 });
    expect(pie.querySelector('[aria-label="Página anterior"]')).not.toBeNull();
    expect(pie.querySelector('[aria-label="Página siguiente"]')).not.toBeNull();
    expect(pie.querySelector('[aria-current="page"]')!.textContent).toBe('5');
    expect(pie.querySelectorAll('select')).toHaveLength(1);
    expect(pie.textContent).toContain('Mostrando');
  });

  it('respeta el style que le pasen', () => {
    const pie = montar({ style: { marginTop: '4px' } });
    expect(pie.style.marginTop).toBe('4px');
    expect(pie.style.getPropertyValue('--de-cuantas-paginas')).toBe('"de 293"');
  });
});
