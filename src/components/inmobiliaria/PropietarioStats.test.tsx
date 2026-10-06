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
    expect(a.textContent).toContain('inmobiliaria.propietario.alertas.pendienteDeGiro.titulo($\u00a01.800.000)');
    expect(a.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/dispersiones');
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
    expect(container.textContent).toContain('$\u00a0517.000 inmobiliaria.propietario.stats.commission');
    expect(container.textContent).not.toContain('~');
  });

  it('sin comisión del back no se estima nada', () => {
    render({ propietario: { ...base, totalMonthlyRent: 4_300_000 }, consignaciones: [] });
    expect(container.textContent).not.toContain('inmobiliaria.propietario.stats.commission');
  });
});

/**
 * 🔴 QA-PROP (03-10): P-17 (lo que no es tendencia no lleva flecha ni rojo),
 * P-21 (sin acceso a la plata no hay $0 ni «Al día» ni «no tiene cuenta»),
 * P-22 (a 390 px la franja no corre la página) y P-26 (plurales).
 */
describe('<PropietarioStats> — QA de Propietarios', () => {
  const SIN_CUENTA = { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' } as unknown as Propietario['bankAccount'];
  const celdas = () => Array.from(container.querySelectorAll('[data-testid="resumen-del-propietario"] > *')) as HTMLElement[];

  it('🔴 P-17: «7 de 8 arrendados» y «Último giro» van en texto neutro, sin flecha ni rojo', () => {
    render({
      propietario: { ...base, propertyCount: 8, activeLeases: 7, copropiedadesCount: 1, pendingBalance: 3_656_150, lastPaymentDate: '2026-10-03T12:00:00Z' },
      consignaciones: [],
    });
    const franja = container.querySelector('[data-testid="resumen-del-propietario"]')!;
    expect(franja.textContent).toContain('inmobiliaria.propietario.stats.ofTotalRented');
    expect(franja.textContent).toContain('inmobiliaria.propietario.stats.lastPayment');
    expect(franja.querySelectorAll('.text-danger, .text-success')).toHaveLength(0);
    expect(franja.querySelectorAll('svg')).toHaveLength(0);
  });

  it('🔴 P-21: con la plata oculta (asesor) dice «—» y «sin acceso a la plata», nunca $0 ni «Al día»', () => {
    render({
      propietario: {
        ...base,
        propertyCount: 8,
        activeLeases: 7,
        plataOculta: true,
        datosBancariosOcultos: true,
        bankAccount: SIN_CUENTA,
      },
      consignaciones: [mandato({})],
    });
    const franja = container.querySelector('[data-testid="resumen-del-propietario"]')!.textContent ?? '';
    expect(franja).not.toContain('$0');
    expect(franja).not.toContain('inmobiliaria.propietario.stats.upToDate');
    expect(franja.match(/—/g)).toHaveLength(3);
    expect(franja.match(/inmobiliaria\.propietario\.stats\.sinAccesoALaPlata/g)).toHaveLength(3);
  });

  it('🔴 P-21: la cuenta oculta por rol no es «no tiene cuenta»: ni la alerta roja ni la de giros pendientes', () => {
    render({
      propietario: { ...base, propertyCount: 8, activeLeases: 7, plataOculta: true, datosBancariosOcultos: true, bankAccount: SIN_CUENTA },
      consignaciones: [],
      onCargarCuenta: () => {},
    });
    expect(alertas()).toEqual([]);
  });

  it('sólo la cuenta oculta (ve la plata pero no los datos bancarios): tampoco dice «no tiene cuenta»', () => {
    render({
      propietario: { ...base, propertyCount: 1, activeLeases: 1, datosBancariosOcultos: true, bankAccount: SIN_CUENTA },
      consignaciones: [],
    });
    expect(container.querySelector('[data-testid="alerta-sin-cuenta"]')).toBeNull();
  });

  it('🔴 P-22: la franja es una rejilla bajo `xl` (una columna en el celular, dos en tableta) y una fila desde `xl`', () => {
    render({ propietario: { ...base, propertyCount: 2, activeLeases: 1 }, consignaciones: [] });
    const franja = container.querySelector('[data-testid="resumen-del-propietario"]')!;
    expect(franja.className).toMatch(/\bgrid\b/);
    expect(franja.className).toMatch(/\bgrid-cols-1\b/);
    expect(franja.className).toMatch(/\bsm:grid-cols-2\b/);
    expect(franja.className).toMatch(/\bxl:flex\b/);
    // En una columna, cada celda menos la primera se separa por arriba, no por el lado.
    const [, segunda, tercera] = celdas();
    expect(segunda.className).toMatch(/max-sm:border-l-0/);
    expect(segunda.className).toMatch(/max-sm:border-t/);
    expect(tercera.className).toMatch(/sm:max-xl:border-l-0/);
  });

  it('🔴 P-26: con un solo inmueble arrendado y sin cuenta, el aviso va en singular', () => {
    render({
      propietario: { ...base, propertyCount: 1, activeLeases: 1, bankAccount: SIN_CUENTA },
      consignaciones: [mandato({})],
    });
    const a = container.querySelector('[data-testid="alerta-sin-cuenta"]')!.textContent ?? '';
    expect(a).toContain('inmobiliaria.propietario.alertas.sinCuenta.detalleUno');
    expect(a).not.toContain('inmobiliaria.propietario.alertas.sinCuenta.detalle(');
  });
});
