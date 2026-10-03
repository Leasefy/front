/**
 * La lista de Propietarios — QA de Propietarios (03-10-2026).
 *
 * P-08 · «1 arrendada», no «1 arrendadas»; «Pasaporte», no «PASSPORT».
 * P-09 · las cabeceras ordenables dicen por cuál va ordenada (`aria-sort`).
 * P-21 · a quien no ve la plata (el asesor), ni «$0», ni «Al día», ni
 *        «Con saldo pendiente 0»: «—» con «Sin acceso a la plata».
 * P-22 · en el celular, una tarjeta por propietario con lo esencial.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { FILTROS_INICIALES, type FiltrosDePropietarios } from '@/lib/propietarios/filtrar-propietarios';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { pantalla } = vi.hoisted(() => ({ pantalla: { celular: false } }));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
    locale: 'es',
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => pantalla.celular }));

import { PropietarioTable } from './PropietarioTable';
import { PropietarioCard } from './PropietarioCard';

const PAULA: Propietario = {
  id: 'paula',
  name: 'Paula Andrea Gómez',
  email: 'paula@example.test',
  phone: '3001234567',
  documentType: 'CC',
  documentNumber: '52123456',
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 2_650_000,
  pendingBalance: 0,
  bankAccount: { bank: 'bancolombia', accountType: 'savings', accountNumber: '', accountHolder: '' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const JOHN: Propietario = {
  ...PAULA,
  id: 'john',
  name: 'John Smith Foreign Owner',
  documentType: 'PASSPORT',
  documentNumber: 'AB998877',
  propertyCount: 3,
  activeLeases: 2,
  pendingBalance: 1_500_000,
};

/** Lo que manda el back al asesor: los montos en null (la normalización los deja en 0) y la marca. */
const OCULTA = (p: Propietario): Propietario => ({
  ...p,
  totalMonthlyRent: 0,
  pendingBalance: 0,
  lastPaymentDate: null,
  plataOculta: true,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  pantalla.celular = false;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

function render(
  propietarios: Propietario[],
  extra: { filtros?: FiltrosDePropietarios; plataOculta?: boolean } = {},
) {
  const props = { onView: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onFiltros: vi.fn() };
  act(() => {
    root.render(
      <PropietarioTable
        propietarios={propietarios}
        totalFiltrado={propietarios.length}
        total={propietarios.length}
        filtros={extra.filtros ?? FILTROS_INICIALES}
        conteos={{ todos: propietarios.length, persona: propietarios.length, empresa: 0, conSaldo: 0 }}
        plataOculta={extra.plataOculta}
        {...props}
      />,
    );
  });
  return props;
}

const cabecera = (texto: string) =>
  Array.from(container.querySelectorAll('th')).find((th) => th.textContent?.includes(texto)) ?? null;

describe('P-09 — `aria-sort` en las cabeceras ordenables', () => {
  it('la columna del orden dice su sentido y las demás «none»', () => {
    render([PAULA]);
    expect(cabecera('inmobiliaria.propietario.table.owner')?.getAttribute('aria-sort')).toBe('ascending');
    expect(cabecera('inmobiliaria.propietario.table.monthlyRent')?.getAttribute('aria-sort')).toBe('none');
    expect(cabecera('inmobiliaria.propietario.table.pending')?.getAttribute('aria-sort')).toBe('none');
  });

  it('ordenada por canon de mayor a menor, lo dice esa columna', () => {
    render([PAULA], { filtros: { ...FILTROS_INICIALES, campo: 'totalMonthlyRent', sentido: 'desc' } });
    expect(cabecera('inmobiliaria.propietario.table.monthlyRent')?.getAttribute('aria-sort')).toBe('descending');
    expect(cabecera('inmobiliaria.propietario.table.owner')?.getAttribute('aria-sort')).toBe('none');
  });
});

describe('P-08 — número gramatical', () => {
  it('«(1 arrendada)» en singular y «(2 arrendadas)» en plural', () => {
    render([PAULA, JOHN]);
    const texto = container.textContent ?? '';
    expect(texto).toContain('(1 inmobiliaria.propietario.table.rentedOne)');
    expect(texto).toContain('(2 inmobiliaria.propietario.table.rented)');
  });
});

describe('P-21 — sin acceso a la plata, nada de «$0» ni «Al día»', () => {
  it('🔴 canon, pendiente y último pago dicen «—» con el porqué; nunca «$0» ni «Al día»', () => {
    render([OCULTA(PAULA), OCULTA(JOHN)], { plataOculta: true });
    const texto = container.textContent ?? '';
    expect(texto).not.toContain('$0');
    expect(texto).not.toContain('inmobiliaria.propietario.table.upToDate');
    expect(container.querySelectorAll('[data-testid="sin-acceso-a-la-plata"]')).toHaveLength(6);
    expect(container.querySelector('[data-testid="plata-oculta-por-rol"]')?.textContent).toContain(
      'inmobiliaria.propietario.table.plataOculta',
    );
  });

  it('no ofrece «Con saldo pendiente» ni ordenar por plata', () => {
    render([OCULTA(PAULA)], { plataOculta: true });
    expect(container.textContent).not.toContain('inmobiliaria.propietario.table.withPendingBalance');
    expect(cabecera('inmobiliaria.propietario.table.monthlyRent')?.querySelector('button')).toBeNull();
    expect(cabecera('inmobiliaria.propietario.table.owner')?.querySelector('button')).not.toBeNull();
  });

  it('a quien sí la ve, los montos de siempre', () => {
    render([PAULA]);
    expect(container.textContent).toContain('2.650.000');
    expect(container.querySelector('[data-testid="sin-acceso-a-la-plata"]')).toBeNull();
    expect(container.querySelector('[data-testid="plata-oculta-por-rol"]')).toBeNull();
  });
});

describe('P-22 — en el celular, tarjetas con lo esencial', () => {
  it('🔴 una tarjeta por propietario con nombre, documento en palabras, inmuebles, canon y pendiente', () => {
    pantalla.celular = true;
    render([PAULA, JOHN]);
    const tarjetas = container.querySelectorAll('[data-testid="propietario-tarjeta"]');
    expect(tarjetas).toHaveLength(2);
    const john = tarjetas[1].textContent ?? '';
    expect(john).toContain('John Smith Foreign Owner');
    expect(john).toContain('inmobiliaria.propietario.form.docCorto.PASSPORT: AB998877');
    // El código crudo del enum no sale solo (el `t` de la prueba devuelve la clave, que lo lleva adentro).
    expect(john).not.toMatch(/(^|[^.])PASSPORT:/);
    expect(john).toContain('3');
    expect(john).toContain('2.650.000');
    expect(john).toContain('1.500.000');
    // La tabla ancha no se ve en el celular.
    expect(container.querySelector('table')?.className).toContain('hidden');
  });

  it('tocar la tarjeta abre la ficha; el «…» trae el mismo menú de la fila', () => {
    pantalla.celular = true;
    const { onView } = render([PAULA]);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="propietario-tarjeta"] > button')!.click();
    });
    expect(onView).toHaveBeenCalledWith(PAULA);
    expect(container.querySelectorAll('[data-testid="propietario-tarjeta"] [aria-label="Acciones"]')).toHaveLength(1);
  });

  it('sin la plata, la tarjeta también dice «—»', () => {
    pantalla.celular = true;
    render([OCULTA(PAULA)], { plataOculta: true });
    const tarjeta = container.querySelector('[data-testid="propietario-tarjeta"]')!;
    expect(tarjeta.textContent).not.toContain('$0');
    expect(tarjeta.querySelector('[data-testid="sin-acceso-a-la-plata"]')).not.toBeNull();
  });
});

describe('PropietarioCard (vista «Tarjetas») — P-08 y P-21', () => {
  it('«Pasaporte: AB998877» y «1 arrendada»', () => {
    act(() => {
      root.render(<PropietarioCard propietario={{ ...JOHN, activeLeases: 1 }} />);
    });
    const texto = container.textContent ?? '';
    expect(texto).toContain('inmobiliaria.propietario.form.docCorto.PASSPORT: AB998877');
    expect(texto).not.toMatch(/(^|[^.])PASSPORT:/);
    expect(texto).toContain('1 inmobiliaria.propietarios.card.rentedOne');
  });

  it('🔴 sin la plata, ni «$0» ni la marca de «Pendiente»', () => {
    act(() => {
      root.render(<PropietarioCard propietario={OCULTA(JOHN)} />);
    });
    const texto = container.textContent ?? '';
    expect(texto).not.toContain('$0');
    expect(texto).not.toContain('inmobiliaria.propietarios.card.pendingBadge');
    expect(texto).toContain('inmobiliaria.propietario.table.sinAccesoALaPlata');
  });
});
