/**
 * La pantalla: carga, filtros y el vacío que NO miente.
 *
 * El caso que más importa acá es el último: filtrar hasta dejar cero filas no
 * es «este cliente no tiene contratos». Decirlo así sería afirmar algo falso
 * sobre una persona, y encima deja sin salida a quien puso el filtro.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { PantallaDelEstadoDeCuenta } from './PantallaDelEstadoDeCuenta';
import { contrato, estadoDeCuenta } from './ejemplo-de-prueba';

const HOY = '2026-09-13';

let host: HTMLDivElement;
let root: Root;

async function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(nodo);
  });
}

function clic(el: Element | null) {
  if (!el) throw new Error('no encontré el control');
  act(() => {
    (el as HTMLElement).click();
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

describe('PantallaDelEstadoDeCuenta', () => {
  it('pide el documento y lo pinta', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="estado-de-cuenta"]')).not.toBeNull();
    expect(host.textContent).toContain('J Y C PAPAS S.A.S');
  });

  it('si el back falla, ofrece reintentar en vez de un documento en blanco', async () => {
    const cargar = vi.fn().mockRejectedValue(new Error('caído'));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    expect(host.querySelector('[data-testid="estado-de-cuenta"]')).toBeNull();
    expect(host.textContent?.length).toBeGreaterThan(0);
  });

  it('«sólo lo pendiente» recorta las filas y avisa que los totales son de lo visible', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta({ contratos: [contrato()] }));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    expect(host.textContent).toContain('Cancelada');
    clic(host.querySelector('[data-testid="filtro-pendientes"]'));
    expect(host.textContent).not.toContain('Cancelada');
    expect(host.textContent).toContain(
      'Los totales son de lo que estás viendo',
    );
  });

  it('filtrar hasta cero filas NO dice «este cliente no tiene contratos»', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    // El par desde/hasta vive dentro del popover del período: se abre primero.
    // Radix monta el contenido en un portal sobre `document.body`, no en `host`.
    clic(host.querySelector('[data-testid="filtro-periodo"]'));
    const desde = document.body.querySelector<HTMLInputElement>('[data-testid="filtro-desde"]');
    expect(desde).not.toBeNull();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(desde, '2030-01-01');
      desde?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(host.querySelector('[data-testid="estado-sin-resultados"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Este cliente no tiene contratos');
    // Y ofrece la salida: quitar los filtros.
    expect(host.textContent).toContain('Quitar filtros');
  });

  it('los atajos del período filtran por mes calendario y dicen cuántas filas quedan', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta({ contratos: [contrato()] }));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    const total = host.querySelectorAll('tbody tr').length;

    clic(host.querySelector('[data-testid="filtro-periodo"]'));
    clic(document.body.querySelector('[data-testid="periodo-esteMes"]'));

    // El popover se cierra solo al elegir un atajo y la píldora dice el rango.
    expect(document.body.querySelector('[data-testid="filtro-desde"]')).toBeNull();
    expect(host.textContent).toContain('1 sep 2026 – 30 sep 2026');
    const conteo = host.querySelector('[data-testid="filtro-conteo"]');
    expect(conteo?.textContent).toMatch(/^Viendo \d+ de \d+ filas$/);
    expect(host.querySelectorAll('tbody tr').length).toBeLessThan(total);

    clic(host.querySelector('[data-testid="filtro-limpiar"]'));
    expect(host.querySelector('[data-testid="filtro-conteo"]')).toBeNull();
    expect(host.querySelectorAll('tbody tr').length).toBe(total);
  });

  it('el enlace de regreso dice A DÓNDE vuelve, leído de la ruta', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    await montar(
      <PantallaDelEstadoDeCuenta
        cargar={cargar}
        hoy={HOY}
        volverA={{ href: '/panel/inmobiliaria/contratos/abc-123' }}
      />,
    );
    // El doble de `next/link` de arriba sólo conserva `href` y los hijos.
    const volver = host.querySelector('a[href="/panel/inmobiliaria/contratos/abc-123"]');
    expect(volver).not.toBeNull();
    expect(volver?.textContent).toContain('Volver al contrato');
    // Y el título dice qué pantalla es, con el cliente en una línea.
    expect(host.querySelector('h1')?.textContent).toBe('Estado de cuenta');
    expect(host.querySelector('[data-testid="estado-subtitulo"]')?.textContent).toContain(
      'J Y C PAPAS S.A.S',
    );
  });

  it('el enlace público no lleva filtros: el cliente recibe su cuenta completa', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} sinFiltros />);
    expect(host.querySelector('[data-testid="estado-filtros"]')).toBeNull();
  });

  it('las acciones reciben el documento FILTRADO: se comparte lo que se está viendo', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    const acciones = vi.fn().mockReturnValue(<span data-testid="acciones" />);
    await montar(
      <PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} acciones={acciones} />,
    );
    expect(host.querySelector('[data-testid="acciones"]')).not.toBeNull();
    expect(acciones.mock.calls[0]![0].contratos).toHaveLength(2);
    expect(acciones.mock.calls[0]![1]).toBeUndefined();

    clic(host.querySelector('[data-testid="filtro-pendientes"]'));
    const ultima = acciones.mock.calls[acciones.mock.calls.length - 1]!;
    expect(ultima[1]).toContain('Los totales son de lo que estás viendo');
  });

  it('«Imprimir» apaga la paginación antes de abrir el diálogo', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    const print = vi.fn();
    vi.stubGlobal('print', print);
    const cuadros: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cuadros.push(cb);
      return cuadros.length;
    });

    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    clic(host.querySelector('[data-testid="imprimir-estado"]'));

    // Dos cuadros: pintar las filas escondidas, medirlas, y recién ahí imprimir.
    expect(print).not.toHaveBeenCalled();
    act(() => cuadros[0]!(0));
    expect(print).not.toHaveBeenCalled();
    act(() => cuadros[1]!(0));
    expect(print).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
