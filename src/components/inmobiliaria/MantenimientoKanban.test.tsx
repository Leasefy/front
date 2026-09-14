/**
 * El tablero de mantenimientos, ahora arrastrable.
 *
 * 🔴 EL DEFECTO QUE CIERRA (Nico, 2026-09-12): «Hay un bug en el pipeline de
 * mantenimientos que no deja arrastrar un mantenimiento creado de un estado a
 * otro. No tiene la posibilidad de arrastrarlos.»
 *
 * La causa era literal: la tarjeta era un `<motion.button>` con un `onClick` y
 * nada más — sin `useDraggable`, sin `useDroppable`, sin `DndContext`. Por eso
 * la prueba central de acá NO es «arrastrar funciona» (eso lo prueba el
 * navegador, y quedó verificado en vivo), sino que la tarjeta **declara** los
 * atributos de arrastre de dnd-kit: son los que desaparecen si alguien vuelve a
 * dejar la tarjeta como un botón suelto, y su ausencia es exactamente lo que
 * Nico veía.
 *
 * `alSoltar` se prueba llamando al `onDragEnd` que el tablero le pasó al
 * `DndContext`: es la función real del componente, con su `over`/`active`, sin
 * simular píxeles.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

/**
 * `DndContext` se reemplaza por un pasamanos que GUARDA los handlers. El
 * arrastre real necesita un motor de punteros que happy-dom no tiene; lo que
 * importa probar acá es la decisión que toma `onDragEnd`, no el gesto.
 */
let manejadores: Record<string, ((e: unknown) => unknown) | undefined> = {};
let deteccionUsada: unknown = null;

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    DndContext: ({
      children,
      onDragStart,
      onDragOver,
      onDragEnd,
      collisionDetection,
    }: {
      children: React.ReactNode;
      onDragStart?: (e: unknown) => unknown;
      onDragOver?: (e: unknown) => unknown;
      onDragEnd?: (e: unknown) => unknown;
      collisionDetection?: unknown;
    }) => {
      manejadores = { onDragStart, onDragOver, onDragEnd };
      deteccionUsada = collisionDetection;
      return <div data-testid="dnd-context">{children}</div>;
    },
  };
});

import { MantenimientoKanban } from './MantenimientoKanban';
import { detectarColumnaDelPuntero } from './mantenimiento-kanban-colisiones';

function hacerSolicitud(
  overrides: Partial<SolicitudMantenimiento> = {},
): SolicitudMantenimiento {
  return {
    id: 'sol-1',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'own-1',
    tenantId: 'ten-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    tenantName: 'Camila Restrepo',
    propietarioName: 'Ana Dueña',
    type: 'plumbing',
    priority: 'medium',
    status: 'reported',
    title: 'Gotera en el baño',
    description: 'El sifón del lavamanos gotea',
    photoUrls: [],
    quotes: [],
    paidBy: 'owner',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  } as SolicitudMantenimiento;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  manejadores = {};
  deteccionUsada = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

const tarjeta = (id = 'sol-1') =>
  container.querySelector<HTMLElement>(`[data-testid="mantenimiento-tarjeta-${id}"]`)!;

function montar(props: Partial<React.ComponentProps<typeof MantenimientoKanban>> = {}) {
  const onStatusChange =
    'onStatusChange' in props
      ? props.onStatusChange
      : vi.fn().mockResolvedValue(undefined);
  const onViewDetails = props.onViewDetails ?? vi.fn();
  act(() => {
    root.render(
      <MantenimientoKanban
        data={props.data ?? [hacerSolicitud()]}
        onViewDetails={onViewDetails}
        onStatusChange={onStatusChange}
      />,
    );
  });
  return { onStatusChange: onStatusChange as ReturnType<typeof vi.fn>, onViewDetails };
}

describe('<MantenimientoKanban> — las tarjetas se pueden arrastrar', () => {
  it('la tarjeta declara los atributos de arrastre de dnd-kit (antes era un botón suelto)', () => {
    montar();
    const envoltura = tarjeta().parentElement!;
    // `useDraggable` pone estos dos; sin ellos la tarjeta no se levanta.
    expect(envoltura.getAttribute('role')).toBe('button');
    expect(envoltura.hasAttribute('aria-roledescription')).toBe(true);
    expect(envoltura.hasAttribute('aria-disabled')).toBe(true);
  });

  it('las cinco columnas del circuito son zonas donde soltar', () => {
    montar();
    for (const estado of ['reported', 'quoted', 'approved', 'in_progress', 'completed']) {
      expect(container.querySelector(`[data-testid="columna-${estado}"]`)).not.toBeNull();
    }
  });

  it('sin `onStatusChange` el tablero es de sólo lectura: ni siquiera monta el contexto de arrastre', () => {
    montar({ onStatusChange: undefined });
    expect(container.querySelector('[data-testid="dnd-context"]')).toBeNull();
    expect(tarjeta().parentElement!.hasAttribute('aria-roledescription')).toBe(false);
  });

  it('la tarjeta sigue abriendo el detalle al hacer clic', () => {
    const { onViewDetails } = montar();
    act(() => tarjeta().click());
    expect(onViewDetails).toHaveBeenCalledWith(expect.objectContaining({ id: 'sol-1' }));
  });

  it('cada solicitud cae en la columna de su estado', () => {
    montar({
      data: [
        hacerSolicitud({ id: 'a', status: 'reported' }),
        hacerSolicitud({ id: 'b', status: 'in_progress' }),
      ],
    });
    const reportadas = container.querySelector('[data-testid="columna-reported"]')!;
    const enProgreso = container.querySelector('[data-testid="columna-in_progress"]')!;
    expect(reportadas.querySelector('[data-testid="mantenimiento-tarjeta-a"]')).not.toBeNull();
    expect(enProgreso.querySelector('[data-testid="mantenimiento-tarjeta-b"]')).not.toBeNull();
    expect(reportadas.querySelector('[data-testid="mantenimiento-tarjeta-b"]')).toBeNull();
  });
});

describe('soltar la tarjeta en otra columna', () => {
  const soltar = async (solicitudId: string, columna: string | null) => {
    await act(async () => {
      await manejadores.onDragEnd?.({
        active: { id: solicitudId },
        over: columna ? { id: columna } : null,
      });
    });
  };

  it('pide el cambio de estado con la columna donde se soltó', async () => {
    const { onStatusChange } = montar();
    await soltar('sol-1', 'quoted');
    expect(onStatusChange).toHaveBeenCalledWith('sol-1', 'quoted');
  });

  /**
   * 🔴 El tablero NO filtra destinos. Nico pidió «poder arrastrar un
   * mantenimiento creado de un estado a otro» y el back ya deja ir a cualquiera
   * de las cinco columnas: si acá se colara una tabla de saltos permitidos,
   * volvería el mismo defecto por el otro lado.
   */
  it.each([
    ['quoted', 'el paso de al lado'],
    ['approved', 'saltándose una columna (lo que Nico intentó)'],
    ['in_progress', 'saltándose dos'],
    ['completed', 'hasta la última'],
  ])('deja soltar en %s — %s', async (destino) => {
    const { onStatusChange } = montar();
    await soltar('sol-1', destino);
    expect(onStatusChange).toHaveBeenCalledWith('sol-1', destino);
  });

  it('también hacia ATRÁS: de «Aprobadas» a «Reportadas»', async () => {
    const { onStatusChange } = montar({
      data: [hacerSolicitud({ status: 'approved' })],
    });
    await soltar('sol-1', 'reported');
    expect(onStatusChange).toHaveBeenCalledWith('sol-1', 'reported');
  });

  it('el destino lo decide el PUNTERO, no el rectángulo corrido de la tarjeta', () => {
    montar();
    // `closestCorners` elegía la columna de al lado cuando la tarjeta se
    // agarraba cerca de su borde izquierdo: ver
    // `mantenimiento-kanban-colisiones.test.ts`.
    expect(deteccionUsada).toBe(detectarColumnaDelPuntero);
  });

  it('soltarla fuera de toda columna no pide nada', async () => {
    const { onStatusChange } = montar();
    await soltar('sol-1', null);
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('soltarla en su PROPIA columna no pide nada (no es un cambio)', async () => {
    const { onStatusChange } = montar();
    await soltar('sol-1', 'reported');
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('un rechazo del back no revienta el tablero: el aviso lo da quien guardó', async () => {
    const onStatusChange = vi
      .fn()
      .mockRejectedValue(new Error('Desde Reportada sólo puede pasar a Cotizada o Cancelada.'));
    montar({ onStatusChange });

    await expect(soltar('sol-1', 'completed')).resolves.toBeUndefined();
    expect(onStatusChange).toHaveBeenCalledWith('sol-1', 'completed');
  });

  it('una tarjeta que ya no está en la lista no dispara nada', async () => {
    const { onStatusChange } = montar();
    await soltar('sol-fantasma', 'quoted');
    expect(onStatusChange).not.toHaveBeenCalled();
  });
});
