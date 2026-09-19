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

/** Escribir en el buscador de la tabla (input controlado por React). */
function escribir(texto: string) {
  const input = container.querySelector('[data-testid="buscar-renovaciones"]') as HTMLInputElement;
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
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
    expect(tarjeta.className).toContain('rounded-lg');
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
    const onAbrir = vi.fn();
    render({ data: [renovacion()], onAbrir });

    act(() => (container.querySelector('[data-testid="renovacion-r-1"]') as HTMLTableRowElement).click());
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }));
  });
});

/**
 * 🔴 Los tres arreglos del 19-09-2026, y por qué cada uno es un defecto y no
 * una preferencia.
 */
describe('<RenovacionesTable> — lo que se arregló el 19-09', () => {
  it('🔴 NO hay un menú de cinco puertas a la misma habitación', () => {
    // La última celda tenía «Ver detalle», «Notificar al inquilino», «Iniciar
    // negociación», «Calcular IPC» y «Ver historial»: cinco rótulos, cinco
    // `onSelect`, y la página cableaba los cinco al MISMO `openWorkflow`.
    // Encima de una fila que ya abría ese cajón sola. Un menú que ofrece cinco
    // cosas y hace una enseña que los rótulos de esta pantalla no significan
    // nada.
    const onAbrir = vi.fn();
    render({ data: [renovacion()], onAbrir });
    expect(container.querySelector('[aria-label="Acciones"]')).toBeNull();
    for (const texto of ['Notificar', 'Calcular', 'historial', 'negociación']) {
      expect(container.textContent, texto).not.toContain(texto);
    }
    // Queda lo único cierto: esta fila se abre.
    expect(container.querySelector('[data-testid="abrir-r-1"]')).not.toBeNull();
  });

  it('🔴 se puede buscar, y por el NÚMERO DE CONTRATO', () => {
    // 183 renovaciones en la agencia migrada. Sin buscador, llegar a una es
    // pasar páginas — y el número del contrato, que es como la inmobiliaria
    // nombra las cosas, ni siquiera se mostraba.
    render({
      data: [
        renovacion({ id: 'r-1', contractNumero: '1686', tenantName: 'Ana Gómez' }),
        renovacion({ id: 'r-2', contractNumero: '4120', tenantName: 'Beto Ruiz' }),
      ],
    });
    expect(container.querySelectorAll('[data-testid^="renovacion-r-"]')).toHaveLength(2);
    escribir('1686');
    expect(container.querySelector('[data-testid="renovacion-r-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="renovacion-r-2"]')).toBeNull();
    // Y el número se VE en la fila, no sólo se busca.
    expect(container.querySelector('[data-testid="renovacion-r-1"]')!.textContent).toContain(
      'Contrato 1686',
    );
  });

  it('busca por inquilino y propietario, sin tildes', () => {
    render({
      data: [
        renovacion({ id: 'r-1', tenantName: 'Ana Gómez' }),
        renovacion({ id: 'r-2', tenantName: 'Beto Ruiz' }),
      ],
    });
    escribir('gomez');
    expect(container.querySelector('[data-testid="renovacion-r-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="renovacion-r-2"]')).toBeNull();
  });

  it('🔴 los filtros están todos en UNA franja, no repartidos en dos', () => {
    // El `Select` de estado vivía en el encabezado de la tarjeta, arriba a la
    // derecha, y los cajones de urgencia en otra franja: dos controles que
    // hacen lo mismo, con dos formas, en dos lugares.
    render({ data: [renovacion()] });
    const franja = container.querySelector('[data-testid="filtro-estado"]')!.closest('div.flex.flex-col.gap-3')!;
    expect(franja.querySelector('[data-testid="buscar-renovaciones"]')).not.toBeNull();
    expect(franja.textContent).toContain('Críticas');
  });

  it('con la búsqueda puesta dice el alcance y deja quitarlo', () => {
    render({
      data: [
        renovacion({ id: 'r-1', tenantName: 'Ana Gómez' }),
        renovacion({ id: 'r-2', tenantName: 'Beto Ruiz' }),
      ],
    });
    expect(container.querySelector('[data-testid="alcance-de-renovaciones"]')).toBeNull();
    escribir('gomez');
    expect(container.querySelector('[data-testid="alcance-de-renovaciones"]')!.textContent).toContain(
      '1 de 2 renovaciones',
    );
    act(() =>
      (container.querySelector('[data-testid="limpiar-filtros-renovaciones"]') as HTMLButtonElement).click(),
    );
    expect(container.querySelectorAll('[data-testid^="renovacion-r-"]')).toHaveLength(2);
  });
});
