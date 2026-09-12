/**
 * ImportWizard.descartar.test.tsx — descartar una carga sin tener que entrar.
 *
 * 🔴 Una carga abandonada frena el paso entero del muro de migración: basta
 * UNA fila LISTO, en cualquier lote de la agencia, para que «Propiedades» se
 * quede en «pendiente» y el pie del muro no ofrezca «Seguir con Contratos».
 *
 * Hasta el 2026-09-11 la única forma de sacar una de esas cargas del medio
 * era retomarla, esperar a que cargara la revisión y buscar «Descartar lote
 * completo» adentro. Nico llegó a tener CUATRO encima —re-subidas del mismo
 * archivo— y se quedó sin salida en el paso 3.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('framer-motion', () => ({
  motion: { div: (p: Record<string, unknown>) => <div>{p.children as React.ReactNode}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

const { apiMock } = vi.hoisted(() => ({
  apiMock: { lotesAbiertos: vi.fn(), descartarLote: vi.fn() },
}));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/inmuebles-importacion.service')
  >('@/lib/api/inmuebles-importacion.service');
  return { ...actual, inmueblesImportacionApi: apiMock };
});

/* Los pasos, inertes: el asistente tiene que quedarse en el 1 sin método ni
   filas, que es la única condición en la que la tarjeta se dibuja. */
vi.mock('./steps/StepChooseMethod', () => ({ StepChooseMethod: () => <div data-testid="paso-1" /> }));
vi.mock('./steps/StepUploadFile', () => ({ StepUploadFile: () => <div /> }));
vi.mock('./steps/StepColumnMapping', () => ({ StepColumnMapping: () => <div /> }));
vi.mock('./steps/StepAIReview', () => ({ StepAIReview: () => <div /> }));
vi.mock('./steps/StepConfirmImport', () => ({ StepConfirmImport: () => <div /> }));
vi.mock('./steps/StepSoftwareMigration', () => ({ StepSoftwareMigration: () => <div /> }));
vi.mock('./steps/StepPortalImport', () => ({ StepPortalImport: () => <div /> }));
vi.mock('./steps/StepPasteLinks', () => ({ StepPasteLinks: () => <div /> }));

import { ImportWizard } from './ImportWizard';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

function lote(over: Partial<EstadoDeLoteInmuebles>): EstadoDeLoteInmuebles {
  return {
    lote: 'lote-x',
    estado: 'LISTO',
    total: 2_864,
    procesadas: 2_864,
    pendientes: 0,
    listos: 1_381,
    activados: 0,
    descartados: 0,
    jobId: null,
    error: null,
    creadoEn: '2026-09-10T12:00:00.000Z',
    ...over,
  };
}

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  Object.values(toastMock).forEach((f) => f.mockClear());
  apiMock.lotesAbiertos.mockReset();
  apiMock.descartarLote.mockReset();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportWizard congelado={false} onOcupado={vi.fn()} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<ImportWizard> — las cargas sin terminar se pueden descartar desde la tarjeta', () => {
  it('descarta sin entrar, lo saca de la lista y dice cuántas filas quedaron fuera', async () => {
    apiMock.lotesAbiertos.mockResolvedValue([
      lote({ lote: 'vieja-a', creadoEn: '2026-09-10T12:00:00.000Z' }),
      lote({ lote: 'vieja-b', listos: 1_210, creadoEn: '2026-09-11T04:00:00.000Z' }),
    ]);
    apiMock.descartarLote.mockResolvedValue({ lote: 'vieja-a', descartadas: 2_864, activadas: 0, yaDescartadas: 0 });

    await pintar();
    expect(q('lotes-inmuebles-abiertos')!.textContent).toContain('2 importaciones sin terminar');

    await act(async () => {
      q('descartar-vieja-a')!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMock.descartarLote).toHaveBeenCalledWith('vieja-a');
    expect(q('descartar-vieja-a')).toBeNull();
    // La otra sigue: descartar una no toca a las demás.
    expect(q('descartar-vieja-b')).not.toBeNull();
    expect(toastMock.success).toHaveBeenCalledWith(
      'Carga descartada',
      expect.objectContaining({ description: expect.stringContaining('2864') }),
    );
  });

  it('un 409 «todavía se está procesando» se dice tal cual y la carga NO se saca de la lista', async () => {
    apiMock.lotesAbiertos.mockResolvedValue([lote({ lote: 'vieja-a' })]);
    apiMock.descartarLote.mockRejectedValue(
      new Error('Ese lote todavía se está preparando. Esperá a que termine para activarlo.'),
    );

    await pintar();
    await act(async () => {
      q('descartar-vieja-a')!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(q('descartar-vieja-a')).not.toBeNull();
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringContaining('todavía se está preparando'),
    );
  });

  it('una carga que el worker todavía está procesando no se puede descartar', async () => {
    apiMock.lotesAbiertos.mockResolvedValue([lote({ lote: 'en-vuelo', estado: 'PROCESANDO' })]);

    await pintar();

    expect((q('descartar-en-vuelo') as HTMLButtonElement).disabled).toBe(true);
  });
});
