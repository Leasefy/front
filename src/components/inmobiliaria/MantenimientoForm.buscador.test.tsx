/**
 * El buscador de inmuebles del cajón «Nueva solicitud» de mantenimientos.
 *
 * 🔴 EL DEFECTO QUE CIERRA (pasada de QA del 2026-09-12): al abrir el
 * desplegable se montaba un `<div className="fixed inset-0">` invisible que
 * tapaba TODA la ventana —el propio buscador incluido—. El primer clic abría
 * la lista; el segundo clic sobre el mismo input lo comía ese manto y la lista
 * se cerraba, así que no se podía volver al buscador a seguir escribiendo.
 *
 * Las dos pruebas de acá son las dos caras del arreglo:
 *   1. no queda NINGÚN elemento de pantalla completa montado sobre el input
 *      (es el defecto, literal: si vuelve el manto, vuelve el error);
 *   2. el clic de afuera —que es para lo que estaba el manto— sigue cerrando,
 *      ahora por el listener de `document` que usa el resto del producto.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

/**
 * `AnimatePresence` se reemplaza por un pasamanos. El de verdad mantiene el
 * nodo MONTADO mientras corre la animación de salida, y en happy-dom esa
 * animación no termina nunca: la lista «cerrada» seguía en el DOM y ninguna
 * prueba de abierto/cerrado podía distinguir nada. `motion.div` queda como
 * está — lo que se prueba es quién decide montar, no cómo se anima.
 */
vi.mock('framer-motion', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { MantenimientoForm } from './MantenimientoForm';

function consignacion(overrides: Partial<Consignacion> = {}): Consignacion {
  return {
    id: 'cons-1',
    propertyId: 'prop-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    propertyZone: 'Laureles',
    ...overrides,
  } as Consignacion;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

async function pintarFormulario(consignaciones: Consignacion[]) {
  await act(async () => {
    root.render(
      React.createElement(MantenimientoForm, {
        consignaciones,
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
  });
}

/** El input del buscador: el único `type="text"` con placeholder de búsqueda. */
function buscador(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    'input[placeholder="inmobiliaria.mantenimiento.searchProperty"]',
  );
  if (!input) throw new Error('no se encontró el buscador de inmuebles');
  return input;
}

/** ¿Está pintada la lista? Se busca la fila del inmueble, no el contenedor. */
function listaAbierta(): boolean {
  return [...container.querySelectorAll('button')].some((b) =>
    b.textContent?.includes('Apto 402 — Laureles'),
  );
}

/** Un clic de verdad: `mousedown` (el que escucha el cierre) y después `click`. */
function clic(destino: EventTarget) {
  destino.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  destino.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('MantenimientoForm — el buscador de inmuebles', () => {
  it('🔴 dos clics seguidos en el input dejan la lista ABIERTA', async () => {
    await pintarFormulario([consignacion()]);

    await act(async () => {
      buscador().focus();
    });
    expect(listaAbierta()).toBe(true);

    // El segundo y el tercer clic son los que antes cerraban la lista.
    await act(async () => {
      clic(buscador());
    });
    expect(listaAbierta()).toBe(true);

    await act(async () => {
      clic(buscador());
    });
    expect(listaAbierta()).toBe(true);

    // Y se puede seguir escribiendo: el filtro responde con la lista abierta.
    await act(async () => {
      const input = buscador();
      input.value = 'Laureles';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(listaAbierta()).toBe(true);
  });

  it('🔴 no monta ningún manto de pantalla completa sobre el buscador', async () => {
    await pintarFormulario([consignacion()]);

    await act(async () => {
      buscador().focus();
    });
    expect(listaAbierta()).toBe(true);

    const mantos = [...container.querySelectorAll('div')].filter((d) => {
      const clases = d.className;
      return typeof clases === 'string' && clases.includes('fixed') && clases.includes('inset-0');
    });
    expect(mantos).toHaveLength(0);
  });

  it('el clic FUERA del buscador sí cierra la lista', async () => {
    await pintarFormulario([consignacion()]);

    await act(async () => {
      buscador().focus();
    });
    expect(listaAbierta()).toBe(true);

    await act(async () => {
      clic(document.body);
    });
    expect(listaAbierta()).toBe(false);
  });
});
