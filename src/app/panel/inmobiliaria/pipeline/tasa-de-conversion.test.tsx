/**
 * La tasa de conversión del tablero, con el pipeline recién abierto.
 *
 * El bug: sin un solo caso cerrado ni perdido el KPI decía «0%», que se lee
 * como «perdiste todo». No se perdió nada: todavía no terminó ningún caso.
 * Igual que Conciliación, sin denominador va una raya.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';

const { datos } = vi.hoisted(() => ({
  datos: { items: [] as PipelineItem[] },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePipelineItems: () => ({ pipelineItems: datos.items, isLoading: false, refetch: vi.fn() }),
  useAgentes: () => ({ agentes: [] }),
  useConsignaciones: () => ({ consignaciones: [] }),
  pipelineApi: { moveStage: vi.fn(async () => undefined) },
}));
// El tablero pinta una columna por etapa con drag&drop; acá sólo interesa la
// franja de KPIs de arriba.
vi.mock('@/components/inmobiliaria', () => ({
  PipelineBoard: () => null,
  PipelineFilters: () => null,
  PipelineDetail: () => null,
}));

import PipelinePage from './page';

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

let root: Root | null = null;

async function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<PipelinePage />);
  });
}

/** El KPI de conversión: la tarjeta cuyo rótulo es «Tasa de conversión». */
function kpiDeConversion(): string {
  const tarjetas = Array.from(document.querySelectorAll<HTMLElement>('div'));
  const rotulo = tarjetas.find((el) => el.textContent?.trim() === 'Tasa de conversión');
  if (!rotulo?.parentElement) throw new Error('No se pintó el KPI «Tasa de conversión»');
  // La tarjeta es rótulo + valor; el valor es el hermano siguiente.
  return rotulo.nextElementSibling?.textContent?.trim() ?? '';
}

beforeEach(() => {
  datos.items = [];
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('Pipeline — tasa de conversión', () => {
  it('sin un solo caso resuelto pinta una raya, NUNCA «0%»', async () => {
    // Un tablero recién abierto: leads en curso, ninguno cerrado ni perdido.
    datos.items = [lead('1', 'lead'), lead('2', 'visit_scheduled')];
    await montar();
    expect(kpiDeConversion()).toBe('—');
  });

  it('con el tablero completamente vacío también pinta la raya', async () => {
    datos.items = [];
    await montar();
    expect(kpiDeConversion()).toBe('—');
  });

  it('un CERO MEDIDO sigue siendo 0%: dos perdidos y ningún cierre es un hecho', async () => {
    datos.items = [lead('1', 'lost'), lead('2', 'lost')];
    await montar();
    expect(kpiDeConversion()).toBe('0%');
  });

  it('con casos resueltos mide de verdad', async () => {
    datos.items = [lead('1', 'completed'), lead('2', 'completed'), lead('3', 'lost')];
    await montar();
    expect(kpiDeConversion()).toBe('67%');
  });
});
