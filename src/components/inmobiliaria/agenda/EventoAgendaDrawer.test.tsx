/**
 * El cajón de un evento de la agenda: qué muestra y qué pasa al accionar.
 *
 * Lo que se fija acá es que cancelar y rechazar **no disparen solas**: piden el
 * motivo, y ese motivo es el que viaja. Antes el controller de la agencia
 * rellenaba con «Gestionada por la inmobiliaria», así que en la base todas las
 * cancelaciones decían lo mismo.
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cancelarCita = vi.fn().mockResolvedValue(undefined);
const rechazarCita = vi.fn().mockResolvedValue(undefined);
const aceptarCita = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: {
    cancelarCita: (...a: unknown[]) => cancelarCita(...a),
    rechazarCita: (...a: unknown[]) => rechazarCita(...a),
    aceptarCita: (...a: unknown[]) => aceptarCita(...a),
    actualizarTarea: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (clave: string) => clave,
    formatDate: () => '10 de septiembre de 2026',
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children as React.ReactNode),
}));

// Los primitivos de Radix viven en un portal; acá interesa el contenido.
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetContent: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetHeader: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetTitle: ({ children }: { children?: React.ReactNode }) => React.createElement('h2', null, children),
  SheetDescription: ({ children }: { children?: React.ReactNode }) => React.createElement('p', null, children),
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
    open ? React.createElement('div', null, children as React.ReactNode) : null,
  AlertDialogContent: ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('div', rest, children as React.ReactNode),
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => React.createElement('h3', null, children),
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => React.createElement('p', null, children),
  AlertDialogAction: ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('button', rest, children as React.ReactNode),
  AlertDialogCancel: ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('button', rest, children as React.ReactNode),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => React.createElement('textarea', props),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, hideArrow: _h, ...rest }: Record<string, unknown> & { children?: React.ReactNode; hideArrow?: boolean }) =>
    React.createElement('button', rest, children as React.ReactNode),
}));

vi.mock('@phosphor-icons/react', () => ({
  ArrowSquareOut: () => null,
  Envelope: () => null,
  Phone: () => null,
  VideoCamera: () => null,
  MapPin: () => null,
}));

import { EventoAgendaDrawer } from './EventoAgendaDrawer';
import type { EventoAgenda } from '@/lib/api/agenda.types';

function visita(extra: Partial<EventoAgenda> = {}): EventoAgenda {
  return {
    id: 'visit-abc',
    tipo: 'visita',
    origen: 'usuario',
    estado: 'pendiente',
    estadoRaw: 'ACCEPTED',
    titulo: 'Visita a Casa Campestre',
    descripcion: '10:00–10:31',
    fecha: '2026-09-10T10:00:00.000Z',
    hora: '10:00',
    vinculoTipo: 'propiedad',
    vinculoId: 'prop-1',
    vinculoLabel: 'Casa Campestre',
    responsableNombre: 'Horacio',
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;
const onAccionVisita = vi.fn(async (_id: string, accion: () => Promise<void>) => {
  await accion();
});

beforeEach(() => {
  cancelarCita.mockClear();
  rechazarCita.mockClear();
  aceptarCita.mockClear();
  onAccionVisita.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(evento: EventoAgenda | null) {
  act(() => {
    root.render(
      <EventoAgendaDrawer
        evento={evento}
        onOpenChange={vi.fn()}
        onCambio={vi.fn()}
        onAccionVisita={onAccionVisita}
      />,
    );
  });
}

function clic(sel: string) {
  const el = container.querySelector<HTMLButtonElement>(sel);
  expect(el, `no encontré ${sel}`).toBeTruthy();
  act(() => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function escribir(texto: string) {
  const ta = container.querySelector<HTMLTextAreaElement>('[data-testid="motivo-texto"]');
  expect(ta).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )!.set!;
  act(() => {
    setter.call(ta!, texto);
    ta!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('<EventoAgendaDrawer> — acciones de una visita', () => {
  it('🔴 cancelar NO dispara sola: primero pide el motivo', () => {
    pintar(visita());

    clic('[data-testid="cita-cancelar"]');

    expect(cancelarCita).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="motivo-dialog"]')).toBeTruthy();
  });

  it('con el motivo corto el botón queda apagado y dice cuánto falta', () => {
    pintar(visita());
    clic('[data-testid="cita-cancelar"]');
    escribir('corto');

    const confirmar = container.querySelector<HTMLButtonElement>('[data-testid="motivo-confirmar"]');
    expect(confirmar!.disabled).toBe(true);
    expect(container.textContent).toContain('caracteres más');
  });

  it('el motivo que se escribe es el que viaja', () => {
    pintar(visita());
    clic('[data-testid="cita-cancelar"]');
    escribir('El propietario pidió reprogramar');
    clic('[data-testid="motivo-confirmar"]');

    expect(cancelarCita).toHaveBeenCalledWith('abc', 'El propietario pidió reprogramar');
  });

  it('rechazar una visita pendiente usa su propio endpoint, con motivo', () => {
    pintar(visita({ estadoRaw: 'PENDING' }));
    clic('[data-testid="cita-rechazar"]');
    escribir('No hay nadie para abrir el inmueble');
    clic('[data-testid="motivo-confirmar"]');

    expect(rechazarCita).toHaveBeenCalledWith('abc', 'No hay nadie para abrir el inmueble');
    expect(cancelarCita).not.toHaveBeenCalled();
  });

  it('confirmar no pide motivo: aceptar no le rompe el plan a nadie', () => {
    pintar(visita({ estadoRaw: 'PENDING' }));

    clic('[data-testid="cita-confirmar"]');

    expect(aceptarCita).toHaveBeenCalledWith('abc');
    expect(container.querySelector('[data-testid="motivo-dialog"]')).toBeNull();
  });
});

describe('<EventoAgendaDrawer> — qué muestra', () => {
  it('en una visita el nombre va rotulado como quien visita, no como responsable', () => {
    pintar(visita());

    expect(container.textContent).toContain('Quién visita');
    expect(container.textContent).toContain('Horacio');
  });

  it('dice la modalidad, que es lo primero que hay que saber para atenderla', () => {
    pintar(visita({ modalidad: 'VIRTUAL' }));
    expect(container.textContent).toContain('Virtual');

    pintar(visita({ modalidad: 'IN_PERSON' }));
    expect(container.textContent).toContain('Presencial');
  });

  it('el contacto es accionable, no texto muerto', () => {
    pintar(visita({ contactoTelefono: '3209120778', contactoEmail: 'ana@test.co' }));

    expect(container.querySelector('a[href="tel:3209120778"]')).toBeTruthy();
    expect(container.querySelector('a[href="mailto:ana@test.co"]')).toBeTruthy();
  });

  it('sin contacto no pinta la fila vacía', () => {
    pintar(visita());
    expect(container.textContent).not.toContain('Contacto');
  });

  it('una tarea conserva el rótulo de responsable', () => {
    pintar(
      visita({
        id: 'tarea-1',
        tipo: 'tarea',
        estadoRaw: 'PENDIENTE',
        titulo: 'Llamar al propietario',
      }),
    );

    expect(container.textContent).toContain('inmobiliaria.agenda.colResponsable');
    expect(container.textContent).not.toContain('Quién visita');
  });
});
