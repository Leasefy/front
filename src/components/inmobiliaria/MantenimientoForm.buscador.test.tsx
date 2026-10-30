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

/** Los contratos del buscador (Portofino 29-10): sin red en la prueba. */
const contratos = vi.hoisted(() => ({ lista: [] as unknown[] }));
vi.mock('@/lib/mantenimiento/buscar-el-inmueble', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, contratosParaBuscar: vi.fn(async () => contratos.lista) };
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
  contratos.lista = [];
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

/** El input del buscador del inmueble. */
function buscador(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('[data-testid="mantenimiento-buscar-inmueble"]');
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

/** Escribe en el buscador como lo haría la persona. */
async function escribir(texto: string) {
  await act(async () => {
    buscador().focus();
  });
  await act(async () => {
    const input = buscador();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function filas(): string[] {
  return [...container.querySelectorAll('button')]
    .map((b) => b.textContent ?? '')
    .filter((t) => t.includes('Apto') || t.includes('Casa'));
}

const DOS = () => [
  consignacion({
    id: 'cons-1',
    propertyId: 'prop-1',
    propertyCode: 24,
    copropietarios: [
      { propietarioId: 'p1', participacionBps: 10000, propietario: { id: 'p1', name: 'Ana Gómez', documentNumber: '43123456' } },
    ],
  }),
  consignacion({
    id: 'cons-2',
    propertyId: 'prop-2',
    propertyTitle: 'Casa 12 — Envigado',
    propertyAddress: 'Cl 40 Sur #25-10',
    propertyZone: 'Envigado',
    propertyCode: 31,
    copropietarios: [
      { propietarioId: 'p2', participacionBps: 10000, propietario: { id: 'p2', name: 'Jorge Peña', documentNumber: '70111222' } },
    ],
  }),
];

describe('MantenimientoForm — buscar el inmueble de varias formas (Portofino 29-10)', () => {
  it('por el código del inmueble («#31»)', async () => {
    await pintarFormulario(DOS());
    await escribir('#31');
    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Casa 12 — Envigado');
  });

  it('por el nombre del propietario, sin tildes («jorge pena»)', async () => {
    await pintarFormulario(DOS());
    await escribir('jorge pena');
    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Propietario: Jorge Peña');
  });

  it('por el número del contrato del sistema de la inmobiliaria, y lo dice en la fila', async () => {
    contratos.lista = [{ id: 'k-9', propertyId: 'prop-1', code: 1839, externalId: '1686' }];
    await pintarFormulario(DOS());
    await escribir('1686');
    // Los contratos se leen al abrir el buscador.
    await act(async () => {
      await Promise.resolve();
    });
    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Apto 402 — Laureles');
    expect(container.querySelector('[data-testid="mantenimiento-inmueble-contrato"]')?.textContent).toBe('Contrato 1686');
  });

  it('🔴 sin coincidencias lo dice y ofrece crear el inmueble: nunca toma lo escrito como inmueble', async () => {
    await pintarFormulario(DOS());
    await escribir('Calle que no existe 99');
    expect(filas()).toHaveLength(0);
    const vacio = container.querySelector('[data-testid="mantenimiento-inmueble-no-encontrado"]');
    expect(vacio?.textContent).toContain('No encontramos ese inmueble.');
    const crear = container.querySelector<HTMLAnchorElement>('[data-testid="mantenimiento-crear-inmueble"]');
    expect(crear?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/inmuebles/nuevo?volver=%2Fpanel%2Finmobiliaria%2Fmantenimientos',
    );
    // El botón de crear la solicitud sigue esperando un inmueble elegido.
    const enviar = container.querySelector<HTMLButtonElement>('[data-testid="mantenimiento-crear"]');
    expect(enviar?.disabled).toBe(true);
  });
});
