/**
 * PipelineDetail — el historial de etapas no puede inventar días.
 *
 * Lo que había: `generateMockTimeline()` pintaba TODAS las etapas hasta la
 * actual y a cada una le ponía `Math.floor(Math.random() * 5) + 1` días. Sólo
 * el último tramo salía de `item.daysInStage`. Los inventados y el real se
 * dibujaban igual —mismo punto, misma tipografía, misma fecha—, así que quien
 * decide a quién apurar mirando «7 días en Visita agendada» no tenía forma de
 * saber que ese 7 lo tiró un dado.
 *
 * El back no guarda el historial: `enteredStageAt` y `daysInStage` se pisan en
 * cada movimiento y no hay tabla de eventos del pipeline. Así que la prueba
 * más dura es la de determinismo: con datos idénticos, dos renders tienen que
 * decir exactamente lo mismo. Con el código viejo no lo decían.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: () => {}, start: () => {} }),
}));

vi.mock('sonner', () => ({ toast: { success: () => {}, error: () => {} } }));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// El Sheet de Radix monta en un portal y se apoya en APIs que happy-dom no
// tiene completas; acá sólo interesa el cuerpo del panel.
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

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
  // La etapa actual es la sexta de diez: con el código viejo esto pintaba
  // seis renglones, cinco de ellos con días al azar.
  stage: 'approved',
  enteredStageAt: '2026-08-20T10:00:00.000Z',
  daysInStage: 4,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

function pintar(item: PipelineItem) {
  act(() => {
    root.render(
      <PipelineDetail isOpen item={item} onClose={() => {}} />,
    );
  });
}

const historial = () => container.querySelector('[data-testid="pipeline-historial"]');
const hitos = () =>
  Array.from(container.querySelectorAll('[data-testid="pipeline-historial"] [data-hito]'));

describe('<PipelineDetail> — historial de etapas', () => {
  it('sólo muestra los dos momentos que el back registra, no las diez etapas', () => {
    pintar(ITEM);

    const claves = hitos().map((n) => n.getAttribute('data-hito'));
    expect(claves).toEqual(['etapa-actual', 'ingreso']);
  });

  it('cuenta días SÓLO en la etapa actual, y con el número real', () => {
    pintar(ITEM);

    const etapaActual = container.querySelector('[data-hito="etapa-actual"]');
    const ingreso = container.querySelector('[data-hito="ingreso"]');

    expect(etapaActual?.textContent).toContain('4 días en esta etapa');
    // El ingreso al pipeline no tiene duración medida: no se inventa ninguna.
    expect(ingreso?.textContent ?? '').not.toContain('en esta etapa');
  });

  it('dice de frente que del recorrido anterior no hay registro', () => {
    pintar(ITEM);

    const nota = container.querySelector('[data-testid="pipeline-historial-sin-registro"]');
    expect(nota?.textContent ?? '').toContain('no hay registro');
  });

  it('con los mismos datos, dos renders dicen exactamente lo mismo', () => {
    // ⛔ Esta es la que muerde: `Math.random()` hacía que el mismo ítem
    // mostrara duraciones distintas en cada apertura del panel.
    pintar(ITEM);
    const primero = historial()?.textContent;

    act(() => root.unmount());
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    pintar(ITEM);
    const segundo = historial()?.textContent;

    expect(primero).toBeTruthy();
    expect(segundo).toBe(primero);
  });

  it('nunca afirma una etapa por la que el ítem no pasó', () => {
    pintar(ITEM);

    const texto = historial()?.textContent ?? '';
    // `approved` es la sexta etapa; las cinco anteriores ya no se afirman.
    // Las etiquetas son las de PIPELINE_STAGES, no invenciones del test.
    expect(texto).toContain('Aprobado');
    for (const anterior of ['Interesado', 'Visita prog.', 'Visita hecha', 'Aplicación', 'Evaluación']) {
      expect(texto).not.toContain(anterior);
    }
  });
});
