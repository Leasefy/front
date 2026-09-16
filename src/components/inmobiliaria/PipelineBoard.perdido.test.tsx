/**
 * Arrastrar en el tablero: «Perdido» pide motivo, y lo terminado no se mueve.
 *
 * P4: el cajón exigía el motivo para marcar perdido, pero soltar la tarjeta en
 * la columna «Perdido» se lo saltaba.
 * P5: el back ahora rechaza mover Cerrado/Perdido (409 LEAD_TERMINADO); el
 * tablero no debe ofrecer arrastrarlos.
 * Permisos: sin `pipeline:edit` las tarjetas se abren pero no se arrastran.
 *
 * dnd-kit no arrastra en happy-dom: se captura el `onDragEnd` del DndContext y
 * se llama con el evento que produciría soltar la tarjeta.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as React from 'react';

type Soltar = (e: { active: { id: string }; over: { id: string } | null }) => Promise<void> | void;

const { dnd, toastInfo, toastSuccess } = vi.hoisted(() => ({
  dnd: {
    onDragEnd: undefined as Soltar | undefined,
    bloqueadas: new Map<string, boolean>(),
  },
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: { children?: React.ReactNode; onDragEnd: Soltar }) => {
    dnd.onDragEnd = onDragEnd;
    return <>{children}</>;
  },
  DragOverlay: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  closestCorners: () => null,
  useSensor: () => null,
  useSensors: () => [],
  PointerSensor: function PointerSensor() {},
  KeyboardSensor: function KeyboardSensor() {},
  useDraggable: ({ id, disabled }: { id: string; disabled?: boolean }) => {
    dnd.bloqueadas.set(id, Boolean(disabled));
    return { attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null, isDragging: false };
  },
  useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: () => {}, start: () => {}, lenis: null }),
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: toastSuccess, info: toastInfo, error: vi.fn() },
}));
vi.mock('@/components/ui/alert-dialog', () => {
  const Pasa = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    AlertDialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    AlertDialogContent: ({ children, ...rest }: React.ComponentProps<'div'>) => <div {...rest}>{children}</div>,
    AlertDialogHeader: Pasa,
    AlertDialogFooter: Pasa,
    AlertDialogTitle: Pasa,
    AlertDialogDescription: Pasa,
    AlertDialogAction: (props: React.ComponentProps<'button'>) => <button {...props} />,
    AlertDialogCancel: (props: React.ComponentProps<'button'>) => <button {...props} />,
  };
});

import { PipelineBoard } from './PipelineBoard';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function lead(id: string, stage: PipelineStage): PipelineItem {
  return {
    id,
    consignacionId: 'c-1',
    propertyId: 'p-1',
    candidateId: `cand-${id}`,
    agenteId: 'a-1',
    propertyTitle: 'Apto 402',
    propertyAddress: 'Calle 1 #2-3',
    monthlyRent: 2_500_000,
    candidateName: `Candidato ${id}`,
    candidateEmail: `${id}@ejemplo.co`,
    candidatePhone: '3000000000',
    stage,
    enteredStageAt: '2026-09-01T10:00:00.000Z',
    daysInStage: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };
}

const ITEMS = [lead('abierto', 'evaluation'), lead('cerrado', 'completed')];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  dnd.onDragEnd = undefined;
  dnd.bloqueadas.clear();
  toastInfo.mockReset();
  toastSuccess.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function montar(onStageChange: (id: string, etapa: PipelineStage, motivo?: string) => Promise<void>, puedeMover = true) {
  act(() => {
    root.render(
      <PipelineBoard items={ITEMS} onItemClick={() => {}} onStageChange={onStageChange} puedeMover={puedeMover} />,
    );
  });
}

async function soltar(id: string, en: string) {
  await act(async () => {
    await dnd.onDragEnd!({ active: { id }, over: { id: en } });
  });
}

async function escribirMotivo(texto: string) {
  const area = container.querySelector('[data-testid="motivo-texto"]') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(area, texto);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const dialogo = () => container.querySelector('[data-testid="motivo-dialog"]');

describe('PipelineBoard — soltar en «Perdido» (P4)', () => {
  it('no mueve nada: abre el diálogo del motivo', async () => {
    const onStageChange = vi.fn(() => Promise.resolve());
    montar(onStageChange);

    await soltar('abierto', 'lost');

    expect(onStageChange).not.toHaveBeenCalled();
    expect(dialogo()).not.toBeNull();
  });

  it('con el motivo escrito lo manda al back, avisa y cierra', async () => {
    const onStageChange = vi.fn(() => Promise.resolve());
    montar(onStageChange);

    await soltar('abierto', 'lost');
    await escribirMotivo('Se fue con otra inmobiliaria por el canon');
    await act(async () => {
      (container.querySelector('[data-testid="motivo-confirmar"]') as HTMLButtonElement).click();
    });

    expect(onStageChange).toHaveBeenCalledWith('abierto', 'lost', 'Se fue con otra inmobiliaria por el canon');
    expect(toastInfo).toHaveBeenCalled();
    expect(dialogo()).toBeNull();
  });

  it('si el back dice que no, no canta «perdido» y el diálogo sigue abierto', async () => {
    const onStageChange = vi.fn(() => Promise.reject(new Error('409')));
    montar(onStageChange);

    await soltar('abierto', 'lost');
    await escribirMotivo('Se fue con otra inmobiliaria por el canon');
    await act(async () => {
      (container.querySelector('[data-testid="motivo-confirmar"]') as HTMLButtonElement).click();
    });

    expect(toastInfo).not.toHaveBeenCalled();
    expect(dialogo()).not.toBeNull();
  });

  it('soltar en otra etapa abierta sigue moviendo directo, sin diálogo', async () => {
    const onStageChange = vi.fn(() => Promise.resolve());
    montar(onStageChange);

    await soltar('abierto', 'application');

    expect(onStageChange).toHaveBeenCalledWith('abierto', 'application');
    expect(dialogo()).toBeNull();
  });
});

describe('PipelineBoard — lo terminado no se arrastra (P5)', () => {
  it('la tarjeta cerrada nace bloqueada y dice por qué; la abierta no', () => {
    montar(vi.fn(() => Promise.resolve()));

    expect(dnd.bloqueadas.get('cerrado')).toBe(true);
    expect(dnd.bloqueadas.get('abierto')).toBe(false);
    const bloqueada = container.querySelector('[data-arrastrable="no"]');
    expect(bloqueada?.getAttribute('title')).toContain('ya terminó');
  });

  it('aunque llegue un arrastre (teclado), un lead cerrado no se manda al back', async () => {
    const onStageChange = vi.fn(() => Promise.resolve());
    montar(onStageChange);

    await soltar('cerrado', 'lead');

    expect(onStageChange).not.toHaveBeenCalled();
    expect(dialogo()).toBeNull();
  });
});

describe('PipelineBoard — sin permiso para mover', () => {
  it('ninguna tarjeta se arrastra y soltar no hace nada', async () => {
    const onStageChange = vi.fn(() => Promise.resolve());
    montar(onStageChange, false);

    expect(dnd.bloqueadas.get('abierto')).toBe(true);
    await soltar('abierto', 'application');
    await soltar('abierto', 'lost');

    expect(onStageChange).not.toHaveBeenCalled();
    expect(dialogo()).toBeNull();
  });
});
