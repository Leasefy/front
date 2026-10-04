/**
 * PropietarioTable — 🔴 P-10 y P-06 (SEGUIMIENTO-FRONT, back 5731a4e2): debajo
 * del giro atrasado, cuántos giros y desde cuándo; lo generado en Dispersiones
 * aparte y con su nombre (antes ERA el número de la columna); y el NIT con su
 * dígito de verificación en las tarjetas del celular. Preparación copiada de
 * `PropietarioTable.qa-prop.test.tsx`.
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

describe('P-10 — la columna «Giro atrasado»', () => {
  it('🔴 con atraso: el monto, cuántos giros y desde cuándo, y lo generado aparte', () => {
    render([{ ...JOHN, pendingBalance: 1_500_000, girosVencidos: 3, giroVencidoDesde: '2026-08-01', generadoSinGirar: 400_000 }]);
    const lineas = container.querySelector('[data-testid="lineas-del-giro"]')!;
    expect(lineas.textContent).toMatch(/inmobiliaria\.propietario\.giros\.variosDesde\(3,1 ago/);
    expect(container.querySelector('[data-testid="generado-sin-girar"]')!.textContent).toBe(
      'inmobiliaria.propietario.giros.generado($\u00a0400.000)',
    );
  });

  it('🔴 al día pero con algo generado: «Al día» y lo generado, sin llamarlo atraso', () => {
    render([{ ...PAULA, pendingBalance: 0, girosVencidos: 0, generadoSinGirar: 1_200_000 }]);
    const celda = container.querySelector('[data-testid="generado-sin-girar"]')!;
    expect(celda.textContent).toBe('inmobiliaria.propietario.giros.generado($\u00a01.200.000)');
    expect(container.textContent).toContain('inmobiliaria.propietario.table.upToDate');
  });

  it('con la plata oculta no dice nada de giros', () => {
    render([{ ...OCULTA(JOHN), generadoSinGirar: null }]);
    expect(container.querySelector('[data-testid="lineas-del-giro"]')).toBeNull();
  });
});

describe('P-06 — el NIT con su DV en las tarjetas del celular', () => {
  it('🔴 «NIT: 900555006-0»', () => {
    pantalla.celular = true;
    render([{ ...PAULA, id: 'nandu', name: 'Constructora Ñandú', documentType: 'NIT', documentNumber: '900555006', digitoDeVerificacion: 0 }]);
    expect(container.querySelector('[data-testid="propietario-tarjeta"]')!.textContent).toContain('900555006-0');
  });
});
