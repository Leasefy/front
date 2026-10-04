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
vi.mock('@/components/ui/sheet', async () => ({
  // Las piezas del cajón (cabecera con título y acciones, cuerpo, pie) como DOM plano.
  ...(await import('@/components/ui/sheet-test-stub')),
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
import { ApiError } from '@/lib/api/client';
import type { PipelineItem } from '@/lib/types/inmobiliaria';
import { AYUDA_DEL_MOTIVO_DE_PERDIDA } from '@/lib/pipeline/limites-del-pipeline';

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

async function abrirPerdido() {
  await act(async () => {
    (container.querySelector('[data-testid="pipeline-marcar-perdido"]') as HTMLButtonElement).click();
  });
}
async function escoger(motivo: string) {
  const b = Array.from(document.querySelectorAll('[data-testid="motivo-de-perdida-opcion"]')).find(
    (x) => x.textContent === motivo,
  ) as HTMLButtonElement;
  await act(async () => b.click());
}
async function detalle(texto: string) {
  const area = document.querySelector('#motivo-detalle') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(area, texto);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const confirmarPerdido = () => document.querySelector('[data-testid="motivo-de-perdida-confirmar"]') as HTMLButtonElement;

describe('PipelineDetail — marcar como perdido (PL-17: motivos fijos)', () => {
  it('no marca nada hasta escoger el motivo, y manda «motivo: detalle»', async () => {
    const onStageChange = vi.fn(() => Promise.resolve());
    montar(onStageChange as never);
    await abrirPerdido();
    expect(onStageChange).not.toHaveBeenCalled();
    expect(confirmarPerdido().disabled).toBe(true);
    await escoger('Arrendó en otro lado');
    await detalle('con otra inmobiliaria por el canon');
    await act(async () => confirmarPerdido().click());
    expect(onStageChange).toHaveBeenCalledWith('pi-1', 'lost', 'Arrendó en otro lado: con otra inmobiliaria por el canon');
  });

  it('lo que dice la ayuda es cierto: un lead perdido muestra su motivo en «Razón de pérdida»', () => {
    act(() => {
      root.render(
        <PipelineDetail
          isOpen
          onClose={() => {}}
          item={{ ...ITEM, stage: 'lost', lostReason: 'Tomó otro apartamento' }}
          onStageChange={vi.fn() as never}
        />,
      );
    });
    expect(AYUDA_DEL_MOTIVO_DE_PERDIDA).toContain('«Razón de pérdida»');
    expect(container.textContent).toContain('Razón de pérdida');
    expect(container.textContent).toContain('Tomó otro apartamento');
  });

  it('🔴 si el back rechaza el motivo, su frase va bajo el campo y el diálogo sigue abierto', async () => {
    const frase = 'El motivo no puede ser sólo espacios.';
    const onStageChange = vi.fn(() =>
      Promise.reject(
        new ApiError(400, [frase], 'DATOS_INVALIDOS', {
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: [frase],
          campos: [{ campo: 'lostReason', regla: 'otro', mensaje: frase }],
        }),
      ),
    );
    montar(onStageChange as never);
    toastError.mockReset();
    await abrirPerdido();
    await escoger('Dejó de responder');
    await act(async () => confirmarPerdido().click());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.getElementById('motivo-de-perdida-error')?.textContent).toBe(frase);
    expect(document.querySelector('[data-testid="motivo-de-perdida"]')).not.toBeNull();
    expect(toastError).not.toHaveBeenCalled();
    expect(toastInfo).not.toHaveBeenCalled();
  });
});

describe('PipelineDetail — sin permiso para mover', () => {
  it('sin `pipeline:edit` no ofrece «Marcar perdido» ni «Mover a…»: el back respondería 403', () => {
    act(() => {
      root.render(
        <PipelineDetail
          isOpen
          onClose={() => {}}
          item={ITEM}
          onStageChange={vi.fn() as never}
          puedeEditar={false}
        />,
      );
    });

    expect(container.querySelector('[data-testid="pipeline-marcar-perdido"]')).toBeNull();
    const botones = Array.from(container.querySelectorAll('button')).map(
      (b) => b.textContent ?? '',
    );
    expect(botones.some((texto) => texto.includes('Visita realizada'))).toBe(false);
    // El detalle se sigue leyendo: lo que se esconde es sólo lo que escribe.
    expect(container.textContent).toContain('Ana Restrepo');
  });
});
