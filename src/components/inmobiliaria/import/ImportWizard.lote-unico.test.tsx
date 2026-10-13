/**
 * ImportWizard — T-0152: una sola carga abierta por archivo, y el asistente
 * se pone donde el SERVIDOR dice que va.
 *
 * Antes el asistente siempre arrancaba en el paso 1 y la persona tenía que
 * tocar «Retomar» en la tarjeta de «carga a medias»; el enlace de la
 * notificación (`?lote=X`) tampoco abría esa carga. Resultado: lo que ya había
 * terminado parecía empezar de nuevo.
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

const { api } = vi.hoisted(() => ({
  api: { lotesAbiertos: vi.fn(), estadoDeLote: vi.fn() },
}));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmuebles-importacion.service')>(
    '@/lib/api/inmuebles-importacion.service',
  );
  return { ...actual, inmueblesImportacionApi: api };
});
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, asegurarSesionVigente: async () => {} };
});

// El último paso muestra a qué carga quedó atado el asistente.
vi.mock('./steps/StepConfirmImport', () => ({
  StepConfirmImport: ({ state }: { state: { loteRetomado: string | null } }) => (
    <div data-testid="paso-final" data-lote={state.loteRetomado ?? ''} />
  ),
}));
vi.mock('./steps/StepChooseMethod', () => ({ StepChooseMethod: () => <div data-testid="paso-inicial" /> }));
vi.mock('./steps/StepUploadFile', () => ({ StepUploadFile: () => <div data-testid="paso-inicial" /> }));
vi.mock('./steps/StepColumnMapping', () => ({ StepColumnMapping: () => <div data-testid="paso-inicial" /> }));
vi.mock('./steps/StepSoftwareMigration', () => ({ StepSoftwareMigration: () => <div data-testid="paso-inicial" /> }));
vi.mock('./steps/StepPortalImport', () => ({ StepPortalImport: () => <div data-testid="paso-inicial" /> }));
vi.mock('./steps/StepPasteLinks', () => ({ StepPasteLinks: () => <div data-testid="paso-inicial" /> }));

import { ImportWizard } from './ImportWizard';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

function lote(over: Partial<EstadoDeLoteInmuebles> = {}): EstadoDeLoteInmuebles {
  return {
    lote: 'lote-A', estado: 'LISTO', total: 10, procesadas: 10, pendientes: 2, listos: 8,
    activados: 0, descartados: 0, jobId: null, error: null,
    creadoEn: '2026-10-09T15:00:00.000Z', fase: 'LISTA', listas: 8, fallidas: 0, creacion: null,
    ...over,
  };
}

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportWizard onOcupado={vi.fn()} />);
  });
  await act(async () => {});
  await act(async () => {});
}

const q = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`);

beforeEach(() => {
  api.lotesAbiertos.mockReset().mockResolvedValue([]);
  api.estadoDeLote.mockReset();
  window.history.pushState({}, '', '/panel/inmobiliaria/inmuebles/importar');
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

describe('<ImportWizard> — T-0152: se pone donde va la carga', () => {
  it('sin cargas abiertas arranca en el paso 1, como siempre', async () => {
    await pintar();
    expect(q('paso-inicial')).toBeTruthy();
    expect(q('paso-final')).toBeNull();
  });

  it('con una carga abierta al montar, va derecho al último paso atado a ella — sin «Retomar»', async () => {
    api.lotesAbiertos.mockResolvedValue([lote({ lote: 'lote-A' })]);
    await pintar();
    expect(q('paso-final')?.dataset.lote).toBe('lote-A');
    expect(q('paso-inicial')).toBeNull();
  });

  it('con varias abiertas toma la más reciente', async () => {
    api.lotesAbiertos.mockResolvedValue([
      lote({ lote: 'vieja', creadoEn: '2026-10-08T10:00:00.000Z' }),
      lote({ lote: 'nueva', creadoEn: '2026-10-09T10:00:00.000Z' }),
    ]);
    await pintar();
    expect(q('paso-final')?.dataset.lote).toBe('nueva');
  });

  it('una carga TERMINADA no se re-abre sola: el trabajo que acabó no se vuelve a mostrar', async () => {
    api.lotesAbiertos.mockResolvedValue([lote({ lote: 'lote-T', fase: 'TERMINADA' })]);
    await pintar();
    expect(q('paso-final')).toBeNull();
    expect(q('paso-inicial')).toBeTruthy();
  });

  it('?lote=X abre ESA carga, aunque haya otra más reciente', async () => {
    window.history.pushState({}, '', '/panel/inmobiliaria/inmuebles/importar?lote=lote-X');
    api.lotesAbiertos.mockResolvedValue([lote({ lote: 'otra' })]);
    api.estadoDeLote.mockResolvedValue(lote({ lote: 'lote-X', fase: 'TERMINADA' }));
    await pintar();
    expect(api.estadoDeLote).toHaveBeenCalledWith('lote-X');
    expect(q('paso-final')?.dataset.lote).toBe('lote-X');
  });

  it('?lote=X que ya no existe cae a la carga abierta más reciente', async () => {
    window.history.pushState({}, '', '/panel/inmobiliaria/inmuebles/importar?lote=fantasma');
    api.lotesAbiertos.mockResolvedValue([lote({ lote: 'lote-A' })]);
    api.estadoDeLote.mockRejectedValue(new Error('404'));
    await pintar();
    expect(q('paso-final')?.dataset.lote).toBe('lote-A');
  });
});
