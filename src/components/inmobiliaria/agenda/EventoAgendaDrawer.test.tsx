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
import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cancelarCita = vi.fn().mockResolvedValue(undefined);
const rechazarCita = vi.fn().mockResolvedValue(undefined);
const aceptarCita = vi.fn().mockResolvedValue(undefined);
const actualizarTarea = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: {
    cancelarCita: (...a: unknown[]) => cancelarCita(...a),
    rechazarCita: (...a: unknown[]) => rechazarCita(...a),
    aceptarCita: (...a: unknown[]) => aceptarCita(...a),
    actualizarTarea: (...a: unknown[]) => actualizarTarea(...a),
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
vi.mock('@/components/ui/sheet', async () => ({
  // Las piezas del cajón (cabecera con título y acciones, cuerpo, pie) como DOM plano.
  ...(await import('@/components/ui/sheet-test-stub')),
  Sheet: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetContent: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
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
  // El medallón de `MotivoDialog` (cancelar o rechazar es destructivo).
  XCircle: () => null,
}));

import { EventoAgendaDrawer } from './EventoAgendaDrawer';
import type { EventoAgenda } from '@/lib/api/agenda.types';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';

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
const onAccionVisita = vi.fn(
  async (_id: string, accion: () => Promise<void>, _opciones?: { avisar?: boolean }): Promise<boolean | void> => {
    await accion();
  },
);

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

function pintar(evento: EventoAgenda | null, puedeEditar?: boolean) {
  act(() => {
    root.render(
      <EventoAgendaDrawer
        evento={evento}
        onOpenChange={vi.fn()}
        onCambio={vi.fn()}
        onAccionVisita={onAccionVisita}
        puedeEditar={puedeEditar}
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

  it('en un vencimiento el nombre es el del INQUILINO, no un responsable de la agencia', () => {
    // QA 2026-09-14: «Vence el contrato · Apartamento en El Golf» con
    // «Responsable: Lina María» — Lina es la inquilina, no quien lo atiende.
    pintar(
      visita({
        id: 'expire-1',
        tipo: 'vencimiento_contrato',
        origen: 'sistema',
        estadoRaw: undefined,
        titulo: 'Vence el contrato · Apartamento en El Golf',
        vinculoTipo: 'contrato',
        responsableNombre: 'Lina María Agudelo Torres',
      }),
    );

    expect(container.textContent).toContain('Inquilino');
    expect(container.textContent).toContain('Lina María Agudelo Torres');
    expect(container.textContent).not.toContain('inmobiliaria.agenda.colResponsable');
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

describe('<EventoAgendaDrawer> — sin operaciones:edit (A3)', () => {
  it('una visita pendiente no ofrece confirmar ni rechazar, y dice por qué', () => {
    pintar(visita({ estadoRaw: 'PENDING' }), false);

    expect(container.querySelector('[data-testid="cita-confirmar"]')).toBeNull();
    expect(container.querySelector('[data-testid="cita-rechazar"]')).toBeNull();
    expect(container.querySelector('[data-testid="evento-acciones"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="evento-sin-permiso"]')?.textContent,
    ).toContain('esta visita');
  });

  it('una tarea pendiente no ofrece marcarla ni cancelarla', () => {
    pintar(
      visita({ id: 'tarea-1', tipo: 'tarea', estadoRaw: 'PENDIENTE', titulo: 'Llamar al propietario' }),
      false,
    );

    expect(container.querySelector('[data-testid="tarea-completar"]')).toBeNull();
    expect(container.textContent).not.toContain('Cancelar tarea');
    expect(
      container.querySelector('[data-testid="evento-sin-permiso"]')?.textContent,
    ).toContain('esta tarea');
  });

  it('con permiso las acciones siguen ahí', () => {
    pintar(visita({ estadoRaw: 'PENDING' }), true);

    expect(container.querySelector('[data-testid="cita-confirmar"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="evento-sin-permiso"]')).toBeNull();
  });
});

/**
 * 02-10-2026 · Completar una tarea que el back rechaza: antes decía siempre
 * «No se pudo actualizar la tarea», sin el porqué. Ahora el porqué va por el
 * traductor: un 5xx «de nuestro lado» con su referencia, la conexión SÓLO sin
 * respuesta.
 */
describe('<EventoAgendaDrawer> — el error de una tarea, por el traductor', () => {
  const tarea = () =>
    visita({ id: 'tarea-t1', tipo: 'tarea', estado: 'pendiente', estadoRaw: 'PENDIENTE', vinculoTipo: undefined, vinculoId: undefined });

  async function completarCon(fallo: unknown) {
    vi.mocked(toast.error).mockClear();
    actualizarTarea.mockRejectedValueOnce(fallo);
    pintar(tarea());
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="tarea-completar"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    return vi.mocked(toast.error).mock.calls[0]?.[1]?.description as string;
  }

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    const d = await completarCon(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    );
    expect(d).toContain('de nuestro lado');
    expect(d).toContain('ab12cd34');
  });

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    expect(await completarCon(new ApiError(0, 'Failed to fetch'))).toMatch(/conexi[oó]n/i);
  });

  it('un 409 que explica se dice tal cual', async () => {
    expect(await completarCon(new ApiError(409, 'Esa tarea ya estaba cancelada.'))).toBe(
      'Esa tarea ya estaba cancelada.',
    );
  });
});

/**
 * 02-10-2026 · Cancelar o rechazar con motivo que el back rechaza: el porqué
 * va BAJO el campo del motivo (Nico: «no en un toast»), el diálogo sigue
 * abierto con lo escrito, y la página no repite el aviso (`avisar: false`).
 */
describe('<EventoAgendaDrawer> — el rechazo del motivo, bajo el campo', () => {
  /** Como la página: atrapa, y con `avisar: false` no hace toast. */
  function comoLaPagina() {
    onAccionVisita.mockImplementationOnce(async (_id, accion, opciones) => {
      try {
        await accion();
        return true;
      } catch {
        if (opciones?.avisar !== false) toast.error('No se pudo actualizar la cita');
        return false;
      }
    });
  }

  it('🔴 un 409 que explica sale bajo el campo, sin toast, y el diálogo sigue abierto', async () => {
    vi.mocked(toast.error).mockClear();
    cancelarCita.mockRejectedValueOnce(new ApiError(409, 'Esta visita ya estaba cancelada.'));
    comoLaPagina();
    pintar(visita());
    clic('[data-testid="cita-cancelar"]');
    escribir('El propietario pidió reprogramar');
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="motivo-confirmar"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onAccionVisita.mock.calls.at(-1)?.[2]).toEqual({ avisar: false });
    expect(document.getElementById('motivo-de-la-agenda-error')?.textContent).toBe(
      'Esta visita ya estaba cancelada.',
    );
    expect(container.querySelector('[data-testid="motivo-dialog"]')).toBeTruthy();
    expect(container.querySelector<HTMLTextAreaElement>('[data-testid="motivo-texto"]')!.value).toBe(
      'El propietario pidió reprogramar',
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('🔴 un 400 con `campos` del motivo (`reason`) pinta SU frase', async () => {
    const frase = 'El motivo puede tener hasta 500 caracteres.';
    rechazarCita.mockRejectedValueOnce(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'reason', regla: 'longitud_maxima', mensaje: frase }],
      }),
    );
    comoLaPagina();
    pintar(visita({ estadoRaw: 'PENDING' }));
    clic('[data-testid="cita-rechazar"]');
    escribir('No hay nadie para abrir el inmueble');
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="motivo-confirmar"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(document.getElementById('motivo-de-la-agenda-error')?.textContent).toBe(frase);
  });

  it('🔴 un 5xx dice de nuestro lado con la referencia, bajo el campo', async () => {
    cancelarCita.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'cd34ef56',
      }),
    );
    comoLaPagina();
    pintar(visita());
    clic('[data-testid="cita-cancelar"]');
    escribir('El propietario pidió reprogramar');
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="motivo-confirmar"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const texto = document.getElementById('motivo-de-la-agenda-error')?.textContent ?? '';
    expect(texto).toContain('de nuestro lado');
    expect(texto).toContain('cd34ef56');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });
});
