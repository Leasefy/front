/**
 * La tabla de Renovaciones con el patrón de Contratos.
 *
 * Nico (2026-09-02): «no tiene el diseño de todas las tablas y el empty por
 * ahí suelto». Lo que se prueba: la tarjeta, el vacío DENTRO de la tabla y
 * con los dos casos (nunca hubo / el filtro no encontró), la carga como
 * esqueleto y no como «no hay», el fallo antes que el vacío, y que lo que se
 * pinta sale de la fila real (días, fecha, cajón).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { RenovacionesTable } from './RenovacionesTable';
import type { Renovacion } from '@/lib/types/inmobiliaria';

function renovacion(overrides: Partial<Renovacion> = {}): Renovacion {
  return {
    id: 'r-1',
    consignacionId: 'c-1',
    propertyTitle: 'Local comercial en El Poblado',
    propertyAddress: 'Carrera 89 # 51-69 Local 20',
    tenantName: 'Camila Restrepo',
    tenantPhone: null,
    tenantEmail: null,
    propietarioName: 'victor ortiz',
    currentRent: 2_100_000,
    leaseStartDate: '2025-03-01T00:00:00.000Z',
    leaseEndDate: '2026-12-31T00:00:00.000Z',
    daysUntilExpiry: 45,
    urgencyBucket: '31-60',
    status: 'pending',
    history: [],
    ...overrides,
  } as Renovacion;
}

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

function render(props: Partial<React.ComponentProps<typeof RenovacionesTable>>) {
  act(() => {
    root.render(<RenovacionesTable data={[]} {...props} />);
  });
}

function chip(texto: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.startsWith(texto),
  )!;
}

describe('<RenovacionesTable>', () => {
  it('es una tarjeta con la tabla adentro y el vacío DENTRO de la tabla', () => {
    render({ data: [] });

    const tarjeta = container.querySelector('[data-testid="renovaciones-tabla"]')!;
    expect(tarjeta.className).toContain('rounded-xl');
    expect(tarjeta.className).toContain('bg-card');
    // El vacío es una fila de la tabla, no un cartel suelto debajo.
    const vacio = tarjeta.querySelector('tbody [data-testid="sin-datos"]');
    expect(vacio).not.toBeNull();
    expect(vacio!.getAttribute('data-caso')).toBe('vacio');
    expect(vacio!.textContent).toContain('Sin renovaciones en curso');
  });

  it('con filtros puestos el vacío dice «ningún resultado» y ofrece quitarlos', () => {
    render({ data: [renovacion()] });

    act(() => chip('Críticas').click());
    const vacio = container.querySelector('[data-testid="sin-datos"]')!;
    expect(vacio.getAttribute('data-caso')).toBe('filtros');

    act(() => (container.querySelector('[data-testid="limpiar-filtros"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull();
    expect(container.textContent).toContain('Camila Restrepo');
  });

  it('mientras carga pinta esqueleto, nunca «no hay renovaciones»', () => {
    render({ data: [], isLoading: true });

    expect(container.querySelectorAll('tbody tr.animate-pulse').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull();
  });

  it('un fallo se muestra antes que el vacío, adentro de la tabla', () => {
    render({ data: [], error: new Error('Se cayó el back') });

    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull();
    expect(container.querySelector('tbody')!.textContent).toContain('Se cayó');
  });

  it('cada fila muestra lo real: fecha sin corrimiento de zona, días y cajón del back', () => {
    render({ data: [renovacion()] });

    const fila = container.querySelector('[data-testid="renovacion-r-1"]')!;
    // 2026-12-31 (DATE, medianoche UTC) sigue siendo 31 dic en Bogotá.
    expect(fila.textContent).toContain('31 dic 2026');
    expect(fila.textContent).toContain('45 días');
    expect(fila.textContent).toContain('$2.100.000');
    expect(fila.textContent).toContain('Pendiente');
    // Sin propuesta no se pinta una: raya.
    expect(fila.textContent).toContain('—');
  });

  it('los conteos de los cajones se cuentan sobre la lista real', () => {
    render({
      data: [
        renovacion({ id: 'a', daysUntilExpiry: 10, urgencyBucket: '0-30' }),
        renovacion({ id: 'b', daysUntilExpiry: 45, urgencyBucket: '31-60' }),
        renovacion({ id: 'c', daysUntilExpiry: 80, urgencyBucket: '61-90' }),
      ],
    });

    expect(chip('Todas').textContent).toBe('Todas3');
    expect(chip('Críticas').textContent).toBe('Críticas1');
    expect(chip('Urgentes').textContent).toBe('Urgentes1');
    expect(chip('Próximas').textContent).toBe('Próximas1');

    act(() => chip('Próximas').click());
    expect(container.querySelectorAll('tbody tr').length).toBe(1);
    expect(container.querySelector('[data-testid="renovacion-c"]')).not.toBeNull();
  });

  it('tocar la fila abre el detalle', () => {
    const onViewDetails = vi.fn();
    render({ data: [renovacion()], onViewDetails });

    act(() => (container.querySelector('[data-testid="renovacion-r-1"]') as HTMLTableRowElement).click());
    expect(onViewDetails).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }));
  });
});
