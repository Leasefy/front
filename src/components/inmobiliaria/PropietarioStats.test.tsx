/**
 * PropietarioStats — las alertas dicen qué pasó, qué hacer y traen el botón.
 *
 * Nico (2026-09-02 13:23): «Atención requerida · la ocupación está por
 * debajo del 70 %» sobre un propietario con CERO inmuebles. Ni se entiende
 * ni hay nada que hacer ahí.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion, Propietario } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
    locale: 'es',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}));

import { PropietarioStats } from './PropietarioStats';

const base: Propietario = {
  id: 'p1',
  name: 'Ana',
  email: null,
  phone: null,
  documentType: 'CC',
  documentNumber: '1',
  bankAccount: { bank: 'bancolombia', accountType: 'savings', accountNumber: '123', accountHolder: 'Ana' },
  propertyCount: 0,
  activeLeases: 0,
  totalMonthlyRent: 0,
  pendingBalance: 0,
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
};

const mandato = (over: Partial<Consignacion>): Consignacion =>
  ({ id: 'c1', propertyTitle: 'Apto 501', listingType: 'rent', availability: 'rented', ...over }) as Consignacion;

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

function render(props: Partial<React.ComponentProps<typeof PropietarioStats>>) {
  act(() => {
    root.render(React.createElement(PropietarioStats, { propietario: base, variant: 'full', ...props }));
  });
}

const alertas = () => Array.from(container.querySelectorAll('[role="alert"]')).map((a) => a.getAttribute('data-testid'));

describe('<PropietarioStats> — alertas', () => {
  it('con cero inmuebles no hay ninguna alerta (antes: «ocupación por debajo del 70 %»)', () => {
    render({ consignaciones: [] });
    expect(alertas()).toEqual([]);
    expect(container.textContent).not.toContain('lowOccupancy');
  });

  it('un inmueble sin arrendar: lo nombra y lleva a su ficha', () => {
    render({
      propietario: { ...base, propertyCount: 2, activeLeases: 1 },
      consignaciones: [mandato({ id: 'c1' }), mandato({ id: 'c2', propertyTitle: 'Local Provenza', availability: 'available' })],
    });
    const a = container.querySelector('[data-testid="alerta-sin-arrendar"]')!;
    expect(a.textContent).toContain('inmobiliaria.propietario.alertas.sinArrendar.tituloUno(Local Provenza)');
    expect(a.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/c2');
  });

  it('varios sin arrendar: dice cuántos de cuántos y lleva a la lista', () => {
    render({
      propietario: { ...base, propertyCount: 3, activeLeases: 1 },
      consignaciones: [mandato({ id: 'c1' }), mandato({ id: 'c2', availability: 'available' }), mandato({ id: 'c3', availability: 'available' })],
    });
    const a = container.querySelector('[data-testid="alerta-sin-arrendar"]')!;
    expect(a.textContent).toContain('inmobiliaria.propietario.alertas.sinArrendar.titulo(2,3)');
    expect(a.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles');
  });

  it('un mandato de VENTA disponible no es «sin arrendar»', () => {
    render({
      propietario: { ...base, propertyCount: 1 },
      consignaciones: [mandato({ listingType: 'sale', availability: 'available' })],
    });
    expect(alertas()).toEqual([]);
  });

  it('plata pendiente de girar: monto en el título y botón a dispersiones', () => {
    render({ propietario: { ...base, pendingBalance: 1_800_000 }, consignaciones: [] });
    const a = container.querySelector('[data-testid="alerta-pendiente-de-giro"]')!;
    expect(a.textContent).toContain('inmobiliaria.propietario.alertas.pendienteDeGiro.titulo($1.800.000)');
    expect(a.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/dispersiones');
  });

  it('arrendado y sin cuenta bancaria: alerta roja con el botón que abre el formulario', () => {
    const onCargarCuenta = vi.fn();
    render({
      propietario: { ...base, propertyCount: 1, activeLeases: 1, bankAccount: { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' } as unknown as Propietario['bankAccount'] },
      consignaciones: [mandato({})],
      onCargarCuenta,
    });
    const a = container.querySelector<HTMLElement>('[data-testid="alerta-sin-cuenta"]')!;
    expect(a.getAttribute('data-severidad')).toBe('danger');
    act(() => a.querySelector('button')!.click());
    expect(onCargarCuenta).toHaveBeenCalledTimes(1);
  });

  it('sin cuenta pero sin nada arrendado no molesta: no hay plata que girar todavía', () => {
    render({
      propietario: { ...base, bankAccount: { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' } as unknown as Propietario['bankAccount'] },
      consignaciones: [],
    });
    expect(alertas()).toEqual([]);
  });

  it('la comisión es la real del back, no un 10 % inventado', () => {
    render({ propietario: { ...base, totalMonthlyRent: 4_300_000, totalCommission: 517_000 }, consignaciones: [] });
    expect(container.textContent).toContain('$517.000 inmobiliaria.propietario.stats.commission');
    expect(container.textContent).not.toContain('~');
  });

  it('sin comisión del back no se estima nada', () => {
    render({ propietario: { ...base, totalMonthlyRent: 4_300_000 }, consignaciones: [] });
    expect(container.textContent).not.toContain('inmobiliaria.propietario.stats.commission');
  });
});
