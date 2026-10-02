/**
 * 02-10-2026 · Mover un lead que el back rechaza: el toast pasa por el
 * traductor. Antes pintaba `error.message` crudo («Internal server error»,
 * «Failed to fetch»).
 *
 *   · un 400 con `campos` dice la frase del back (el motivo demasiado largo);
 *   · un 5xx dice «de nuestro lado» con la referencia, sin culpar a la red;
 *   · sin respuesta (status 0), la conexión;
 *   · y en los tres la tarjeta vuelve a su etapa (la promesa se rechaza).
 *
 * «Perdido» con motivo es la excepción (Nico, 02-10-2026): quien llama es
 * `MotivoDialog`, abierto con lo escrito, y el porqué va bajo SU campo. La
 * página no repite el aviso en un toast; sólo rechaza la promesa con el error.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { ApiError } from '@/lib/api/client';

const { mover, toastError, resultado, datos } = vi.hoisted(() => ({
  mover: vi.fn(),
  toastError: vi.fn(),
  resultado: { rechazo: null as unknown },
  // Una sola referencia: un arreglo nuevo en cada render re-dispara el efecto
  // que copia los leads al estado de la página, sin fin.
  datos: { items: [] as PipelineItem[] },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: toastError, info: vi.fn() },
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ isLoading: false, canAccess: () => true }),
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePipelineItems: () => ({
    pipelineItems: datos.items,
    isLoading: false,
    errorCrudo: null,
    refetch: () => Promise.resolve(null),
  }),
  useAgentes: () => ({ agentes: [] }),
  useConsignaciones: () => ({ consignaciones: [] }),
  pipelineApi: { moveStage: mover },
}));
vi.mock('@/components/inmobiliaria/NuevoLeadDialog', () => ({
  NuevoLeadDialog: () => null,
}));
vi.mock('@/components/inmobiliaria', () => ({
  PipelineBoard: ({
    onStageChange,
  }: {
    onStageChange: (id: string, stage: PipelineStage, motivo?: string) => Promise<void>;
  }) => (
    <>
      <button
        type="button"
        data-testid="perder"
        onClick={() => {
          onStageChange('l-1', 'lost', 'm'.repeat(501)).catch((e) => {
            resultado.rechazo = e;
          });
        }}
      />
      <button
        type="button"
        data-testid="mover"
        onClick={() => {
          onStageChange('l-1', 'application').catch((e) => {
            resultado.rechazo = e;
          });
        }}
      />
    </>
  ),
  PipelineFilters: () => null,
  PipelineDetail: () => null,
}));

import PipelinePage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function lead(id: string): PipelineItem {
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
    stage: 'lead',
    enteredStageAt: '2026-09-01T10:00:00.000Z',
    daysInStage: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };
}

let root: Root;
let contenedor: HTMLDivElement;

beforeEach(() => {
  mover.mockReset();
  toastError.mockReset();
  resultado.rechazo = null;
  datos.items = [lead('l-1')];
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(async () => {
  await act(async () => root.unmount());
  contenedor.remove();
});

async function moverConError(error: unknown): Promise<string> {
  mover.mockRejectedValue(error);
  await act(async () => {
    root.render(<PipelinePage />);
  });
  await act(async () => {
    contenedor.querySelector<HTMLButtonElement>('[data-testid="mover"]')!.click();
  });
  expect(toastError).toHaveBeenCalledTimes(1);
  // Quien arrastró no festeja: la promesa se rechaza.
  expect(resultado.rechazo).toBe(error);
  const [titulo, opciones] = toastError.mock.calls[0] as [string, { description: string }];
  expect(titulo).toBe('No se pudo mover el lead');
  return opciones.description;
}

describe('Pipeline — mover un lead que el back rechaza', () => {
  it('🔴 un 400 con campos dice la frase del back', async () => {
    const frase = 'La etapa no es válida.';
    const texto = await moverConError(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'stage', regla: 'opcion', mensaje: frase }],
      }),
    );
    expect(texto).toBe(frase);
  });

  it('🔴 un 5xx dice que es nuestro, con la referencia, y no culpa a la conexión', async () => {
    const texto = await moverConError(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Internal server error',
        referencia: '9f8e7d6c',
      }),
    );
    expect(texto).toContain('de nuestro lado');
    expect(texto).toContain('9f8e7d6c');
    expect(texto).not.toContain('Internal server error');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    const texto = await moverConError(new ApiError(0, 'Failed to fetch'));
    expect(texto.toLowerCase()).toContain('conexión');
    expect(texto).not.toContain('Failed to fetch');
  });
});

describe('Pipeline — «Perdido» con motivo que el back rechaza', () => {
  it('🔴 no sale toast: el porqué lo dice el diálogo bajo el campo; la promesa se rechaza con el error', async () => {
    const frase = 'El motivo puede tener hasta 500 caracteres.';
    const error = new ApiError(400, [frase], 'DATOS_INVALIDOS', {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: [frase],
      campos: [{ campo: 'lostReason', regla: 'longitud_maxima', mensaje: frase }],
    });
    mover.mockRejectedValue(error);
    await act(async () => {
      root.render(<PipelinePage />);
    });
    await act(async () => {
      contenedor.querySelector<HTMLButtonElement>('[data-testid="perder"]')!.click();
    });

    expect(toastError).not.toHaveBeenCalled();
    // Quien llamó recibe el error entero (con sus `campos`) para pintarlo.
    expect(resultado.rechazo).toBe(error);
  });
});
