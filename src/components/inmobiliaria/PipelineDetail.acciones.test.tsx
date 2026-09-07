/**
 * PipelineDetail — los dos botones del pie no pueden mentir.
 *
 * Lo que había:
 *
 *   await new Promise((resolve) => setTimeout(resolve, 800));
 *   if (onStageChange) onStageChange(item.id, nextStage);
 *   toast.success('Etapa actualizada');
 *
 * Tres defectos en cuatro líneas: la espera era FINGIDA (800 ms de spinner que
 * no esperaban a nadie), el éxito se cantaba pasara lo que pasara con el back,
 * y «marcar como perdido» no pedía motivo — aunque `moveStage` lo acepta desde
 * siempre y el propio cajón lo pinta cuando viene.
 *
 * Las tres pruebas de acá muerden esas tres cosas: que se espere de verdad,
 * que un rechazo NO produzca cartel verde, y que el motivo llegue hasta
 * `onStageChange`.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: () => {}, start: () => {} }),
}));

const { toastSuccess, toastInfo, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, info: toastInfo, error: toastError },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// Radix monta en portales y se apoya en APIs que happy-dom no tiene completas.
// Se reemplaza SÓLO la carcasa: la lógica de MotivoDialog (el mínimo de
// caracteres, el `preventDefault`, el reset del texto) es la real.
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    AlertDialog: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    AlertDialogContent: ({ children, ...rest }: React.ComponentProps<'div'>) => (
      <div {...rest}>{children}</div>
    ),
    AlertDialogHeader: Passthrough,
    AlertDialogFooter: Passthrough,
    AlertDialogTitle: Passthrough,
    AlertDialogDescription: Passthrough,
    AlertDialogAction: (props: React.ComponentProps<'button'>) => <button {...props} />,
    AlertDialogCancel: (props: React.ComponentProps<'button'>) => <button {...props} />,
  };
});

import { PipelineDetail } from './PipelineDetail';
import type { PipelineItem } from '@/lib/types/inmobiliaria';

void React;

const ITEM: PipelineItem = {
  id: 'pi-1',
  consignacionId: 'cons-1',
  propertyId: 'prop-1',
  candidateId: 'cand-1',
  agenteId: 'ag-1',
  propertyTitle: 'Apartamento 402',
  propertyAddress: 'Calle 100 #15-20',
  monthlyRent: 2_500_000,
  candidateName: 'Ana Restrepo',
  candidateEmail: 'ana@example.com',
  candidatePhone: '3001234567',
  stage: 'visit_scheduled',
  enteredStageAt: '2026-08-20T10:00:00.000Z',
  daysInStage: 4,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  toastSuccess.mockReset();
  toastInfo.mockReset();
  toastError.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function montar(onStageChange: (id: string, etapa: string, motivo?: string) => Promise<void>) {
  act(() => {
    root.render(
      <PipelineDetail
        isOpen
        onClose={() => {}}
        item={ITEM}
        onStageChange={onStageChange as never}
      />,
    );
  });
}

function botonPorTexto(texto: string): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll('button')).find((x) =>
    (x.textContent ?? '').includes(texto),
  );
  if (!b) throw new Error(`No hay botón con «${texto}»`);
  return b as HTMLButtonElement;
}

describe('PipelineDetail — mover de etapa', () => {
  it('espera a que el back confirme antes de cantar «Etapa actualizada»', async () => {
    let resolver: (() => void) | undefined;
    const onStageChange = vi.fn(
      () => new Promise<void>((r) => { resolver = r; }),
    );
    montar(onStageChange as never);

    await act(async () => {
      botonPorTexto('Mover a').click();
    });

    // Mientras la promesa está pendiente NO puede haber cartel de éxito.
    expect(onStageChange).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();

    await act(async () => {
      resolver?.();
    });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('si el back rechaza, no dice que se movió', async () => {
    const onStageChange = vi.fn(() => Promise.reject(new Error('500')));
    montar(onStageChange as never);

    await act(async () => {
      botonPorTexto('Mover a').click();
    });

    expect(onStageChange).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe('PipelineDetail — marcar como perdido', () => {
  it('no marca nada hasta que se escribe un motivo, y lo manda al back', async () => {
    const onStageChange = vi.fn(() => Promise.resolve());
    montar(onStageChange as never);

    await act(async () => {
      (container.querySelector('[data-testid="pipeline-marcar-perdido"]') as HTMLButtonElement).click();
    });

    // El clic abre el diálogo; todavía no movió nada.
    expect(onStageChange).not.toHaveBeenCalled();
    const confirmar = container.querySelector(
      '[data-testid="motivo-confirmar"]',
    ) as HTMLButtonElement;
    expect(confirmar).not.toBeNull();
    // Sin motivo suficiente el botón está apagado.
    expect(confirmar.disabled).toBe(true);

    const texto = container.querySelector('[data-testid="motivo-texto"]') as HTMLTextAreaElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setter.call(texto, 'Se fue con otra inmobiliaria por el canon');
      texto.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      (container.querySelector('[data-testid="motivo-confirmar"]') as HTMLButtonElement).click();
    });

    expect(onStageChange).toHaveBeenCalledWith(
      'pi-1',
      'lost',
      'Se fue con otra inmobiliaria por el canon',
    );
  });
});
