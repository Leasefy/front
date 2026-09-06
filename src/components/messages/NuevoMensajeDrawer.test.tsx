/**
 * El cajón de «Nuevo mensaje»: a quién puedo escribirle y qué pasa al elegir.
 *
 * Lo que importa acá es que la lista salga del back (no de una heurística del
 * front) y que un «no tenés relación» se cuente como lo que es —una regla— y no
 * como un error genérico.
 *
 * Y desde las pestañas (Nico, 2026-09-04): que separar inquilinos de
 * propietarios no ESCONDA a nadie —un `AGENT` no tiene pestaña propia y sigue
 * estando en «Todos»— y que «hay gente pero ninguna acá» no se confunda con
 * «no hay a quién escribirle», que son dos vacíos con salidas distintas.
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const getDestinatarios = vi.fn();
const abrirHiloDirecto = vi.fn();
const toastError = vi.fn();

vi.mock('@/lib/api/messages.service', () => ({
  messagesApi: {
    getDestinatariosDirectos: (q?: string) => getDestinatarios(q),
    abrirHiloDirecto: (d: unknown) => abrirHiloDirecto(d),
  },
}));

vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m) } }));

// El Sheet real arrastra los primitivos de diálogo del design system; acá sólo
// interesa el contenido.
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetContent: ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': rest['data-testid'] }, children as React.ReactNode),
  SheetTitle: ({ children }: { children?: React.ReactNode }) => React.createElement('h2', null, children),
}));

vi.mock('@phosphor-icons/react', () => ({
  Buildings: () => null,
  MagnifyingGlass: () => null,
  PaperPlaneTilt: () => null,
  User: () => null,
  House: () => null,
  IdentificationBadge: () => null,
  // El vacío de «hay gente, pero ninguna en esta pestaña».
  Users: () => null,
}));

vi.mock('@/components/ui/spinner', () => ({ Spinner: () => React.createElement('div', null, 'cargando') }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: () => React.createElement('div', { 'data-testid': 'fallo' }),
}));
vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...props, ref }),
  ),
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, hideArrow: _h, ...rest }: Record<string, unknown> & { children?: React.ReactNode; hideArrow?: boolean }) =>
    React.createElement('button', rest, children as React.ReactNode),
}));

import { NuevoMensajeDrawer } from './NuevoMensajeDrawer';
import { ApiError } from '@/lib/api/client';

const PERSONA = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Ruiz',
  role: 'LANDLORD',
  email: 'ana@test.co',
  avatarUrl: null,
};

const INQUILINA = {
  id: 'user-2',
  firstName: 'Beatriz',
  lastName: 'Cano',
  role: 'TENANT',
  email: 'bea@test.co',
  avatarUrl: null,
};

// Un agente de otra inmobiliaria: ni inquilino ni propietario. No tiene
// pestaña propia y por eso mismo el test vigila que siga estando en «Todos».
const AGENTE = {
  id: 'user-3',
  firstName: 'Carlos',
  lastName: 'Díaz',
  role: 'AGENT',
  email: 'carlos@test.co',
  avatarUrl: null,
};

const AGENCIA = { id: 'ag-1', name: 'Inmobiliaria Prueba', logoUrl: null };

let container: HTMLDivElement;
let root: Root;
const onHiloAbierto = vi.fn();
const onCerrar = vi.fn();

beforeEach(() => {
  getDestinatarios.mockReset().mockResolvedValue({ tipo: 'PERSONAS', personas: [], agencias: [] });
  abrirHiloDirecto.mockReset().mockResolvedValue({ conversationId: 'conv-nueva' });
  toastError.mockReset();
  onHiloAbierto.mockReset();
  onCerrar.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => {
    root.render(
      React.createElement(NuevoMensajeDrawer, {
        abierto: true,
        onCerrar,
        onHiloAbierto,
      }),
    );
  });
  // La consulta va detrás de un `setTimeout` (el rebote del buscador), así que
  // no alcanza con vaciar la cola de microtareas.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

/** Las tres pestañas del lado de la inmobiliaria, en orden. */
function pestanas(): HTMLElement[] {
  return Array.from(container.querySelectorAll('[role="radio"]'));
}

function pestana(nombre: string): HTMLElement {
  const encontrada = pestanas().find((b) => (b.textContent ?? '').startsWith(nombre));
  expect(encontrada, `no está la pestaña ${nombre}`).toBeTruthy();
  return encontrada!;
}

function clic(el: Element | null) {
  expect(el).toBeTruthy();
  act(() => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('<NuevoMensajeDrawer>', () => {
  it('cerrado no pide nada', async () => {
    await act(async () => {
      root.render(
        React.createElement(NuevoMensajeDrawer, { abierto: false, onCerrar, onHiloAbierto }),
      );
    });
    expect(getDestinatarios).not.toHaveBeenCalled();
  });

  it('del lado de la inmobiliaria lista personas con su insignia', async () => {
    getDestinatarios.mockResolvedValue({ tipo: 'PERSONAS', personas: [PERSONA], agencias: [] });
    await render();

    expect(container.textContent).toContain('Ana Ruiz');
    expect(container.querySelector('[data-testid="insignia-landlord"]')).toBeTruthy();
  });

  it('del lado de la persona lista sus inmobiliarias y no muestra el buscador', async () => {
    getDestinatarios.mockResolvedValue({ tipo: 'AGENCIAS', personas: [], agencias: [AGENCIA] });
    await render();

    expect(container.textContent).toContain('Inmobiliaria Prueba');
    expect(container.querySelector('[data-testid="insignia-agency"]')).toBeTruthy();
    // Una persona tiene una o dos inmobiliarias: no hay nada que filtrar ni
    // que separar en pestañas.
    expect(container.querySelector('[data-testid="nuevo-mensaje-buscar"]')).toBeNull();
    expect(container.querySelector('[data-testid="pestanas-destinatarios"]')).toBeNull();
  });

  it('elegir a una persona manda counterpartId y devuelve el hilo', async () => {
    getDestinatarios.mockResolvedValue({ tipo: 'PERSONAS', personas: [PERSONA], agencias: [] });
    await render();

    await act(async () => {
      container.querySelector('[data-testid="destinatario-user-1"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(abrirHiloDirecto).toHaveBeenCalledWith({ counterpartId: 'user-1' });
    expect(onHiloAbierto).toHaveBeenCalledWith('conv-nueva');
    expect(onCerrar).toHaveBeenCalled();
  });

  it('elegir una inmobiliaria manda agencyId', async () => {
    getDestinatarios.mockResolvedValue({ tipo: 'AGENCIAS', personas: [], agencias: [AGENCIA] });
    await render();

    await act(async () => {
      container.querySelector('[data-testid="destinatario-ag-1"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(abrirHiloDirecto).toHaveBeenCalledWith({ agencyId: 'ag-1' });
  });

  it('un 403 se cuenta como regla, no como error genérico', async () => {
    getDestinatarios.mockResolvedValue({ tipo: 'PERSONAS', personas: [PERSONA], agencias: [] });
    abrirHiloDirecto.mockRejectedValue(new ApiError(403, 'SIN_RELACION'));
    await render();

    await act(async () => {
      container.querySelector('[data-testid="destinatario-user-1"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('inmueble o un contrato en común'),
    );
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('sin destinatarios lo dice, y no como si fuera un fallo', async () => {
    await render();

    expect(container.textContent).toContain('Todavía no hay a quién escribirle');
    expect(container.querySelector('[data-testid="fallo"]')).toBeNull();
  });

  it('una consulta caída no se lee como «no hay nadie»', async () => {
    getDestinatarios.mockRejectedValue(new ApiError(500, 'boom'));
    await render();

    expect(container.querySelector('[data-testid="fallo"]')).toBeTruthy();
    // Sin lista no hay conteo que sea cierto: tampoco se pintan las pestañas.
    expect(container.querySelector('[data-testid="pestanas-destinatarios"]')).toBeNull();
  });

  it('las tres pestañas traen el conteo de su grupo', async () => {
    getDestinatarios.mockResolvedValue({
      tipo: 'PERSONAS',
      personas: [PERSONA, INQUILINA, AGENTE],
      agencias: [],
    });
    await render();

    expect(pestanas().map((b) => b.textContent)).toEqual([
      'Todos · 3',
      'Inquilinos · 1',
      'Propietarios · 1',
    ]);
  });

  it('«Inquilinos» deja sólo a los TENANT, y «Propietarios» sólo a los LANDLORD', async () => {
    getDestinatarios.mockResolvedValue({
      tipo: 'PERSONAS',
      personas: [PERSONA, INQUILINA, AGENTE],
      agencias: [],
    });
    await render();

    clic(pestana('Inquilinos'));
    expect(container.querySelector('[data-testid="destinatario-user-2"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="destinatario-user-1"]')).toBeNull();
    expect(container.querySelector('[data-testid="destinatario-user-3"]')).toBeNull();

    clic(pestana('Propietarios'));
    expect(container.querySelector('[data-testid="destinatario-user-1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="destinatario-user-2"]')).toBeNull();
  });

  it('🔴 un AGENT no tiene pestaña, pero tampoco desaparece: se ve en «Todos»', async () => {
    getDestinatarios.mockResolvedValue({
      tipo: 'PERSONAS',
      personas: [PERSONA, INQUILINA, AGENTE],
      agencias: [],
    });
    await render();

    // «Todos» abre por defecto, así que a quien no encaja en ninguna de las
    // otras dos se lo ve apenas se abre el cajón.
    expect(container.querySelector('[data-testid="destinatario-user-3"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="insignia-agent"]')).toBeTruthy();

    clic(pestana('Inquilinos'));
    expect(container.querySelector('[data-testid="destinatario-user-3"]')).toBeNull();
    clic(pestana('Todos'));
    expect(container.querySelector('[data-testid="destinatario-user-3"]')).toBeTruthy();
  });

  it('🔴 «hay gente pero ninguna acá» NO es «no hay a quién escribirle», y ofrece volver', async () => {
    getDestinatarios.mockResolvedValue({ tipo: 'PERSONAS', personas: [PERSONA], agencias: [] });
    await render();

    clic(pestana('Inquilinos'));

    const vacio = container.querySelector('[data-testid="pestana-vacia"]');
    expect(vacio).toBeTruthy();
    // El otro vacío —el de verdad— no se pinta: sí hay a quién escribirle.
    expect(container.textContent).not.toContain('Todavía no hay a quién escribirle');
    expect(container.textContent).toContain('1 persona');
    expect(container.querySelector('[data-testid="fallo"]')).toBeNull();

    // Y la salida está puesta: volver a «Todos» devuelve la lista.
    clic(container.querySelector('[data-testid="ver-todos-los-destinatarios"]'));
    expect(container.querySelector('[data-testid="destinatario-user-1"]')).toBeTruthy();
  });

  it('con búsqueda puesta, el vacío de la pestaña habla de la búsqueda', async () => {
    getDestinatarios.mockResolvedValue({ tipo: 'PERSONAS', personas: [PERSONA], agencias: [] });
    await render();

    const input = container.querySelector('[data-testid="nuevo-mensaje-buscar"]') as HTMLInputElement;
    // Un `input.value = …` no lo ve un input controlado por React: hay que
    // pasar por el setter nativo para que el evento traiga el valor nuevo.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(input, 'ana');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    clic(pestana('Inquilinos'));
    expect(container.textContent).toContain('Tu búsqueda trajo 1 persona');
  });

  it('sin nadie en absoluto no hay pestañas: el vacío es el otro', async () => {
    await render();

    expect(container.querySelector('[data-testid="pestanas-destinatarios"]')).toBeNull();
    expect(container.querySelector('[data-testid="pestana-vacia"]')).toBeNull();
    expect(container.textContent).toContain('Todavía no hay a quién escribirle');
  });
});
