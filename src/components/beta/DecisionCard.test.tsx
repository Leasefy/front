/**
 * La tarjeta de decisión del chat (02-10-2026): si la aprobación no quedó
 * registrada, AVISA con el motivo que le devuelve `selectDecisionOption` (ya
 * dicho por el traductor). Antes el fallo se tragaba (`console.warn`) y la
 * tarjeta decía «Decidido» aunque el micro no lo hubiera guardado.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/components/ui', () => ({ toast: toastMock }));

import { DecisionCard } from './DecisionCard';
import type { PendingDecision } from '@/lib/types/beta-chat';

void React;

const DECISION: PendingDecision = {
  id: 'ap-1',
  approvalId: 'ap-1',
  title: 'Acuerdo de pago',
  description: '3 cuotas de $1.200.000',
  category: 'cobranza',
  options: [
    { id: 'si', label: 'Aprobar', description: 'Se registra la decisión', recommendation: 'recommended' },
    { id: 'cancel', label: 'No', description: 'No se aprueba', recommendation: 'neutral' },
  ],
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function elegir(onSelect: (id: string) => unknown) {
  act(() => {
    root.render(<DecisionCard decision={DECISION} onSelect={onSelect as (id: string) => Promise<string | null>} />);
  });
  const aprobar = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Aprobar'))!;
  await act(async () => {
    aprobar.click();
    await Promise.resolve();
  });
}

describe('DecisionCard', () => {
  it('si la elección no quedó, avisa con el motivo del traductor', async () => {
    const motivo = 'No pudimos registrar tu decisión: algo falló de nuestro lado. Si sigue pasando, escríbenos con la referencia ab12cd34.';
    const onSelect = vi.fn(async () => motivo);
    await elegir(onSelect);
    expect(onSelect).toHaveBeenCalledWith('si');
    expect(toastMock.error).toHaveBeenCalledWith(motivo);
  });

  it('si quedó (o no es una aprobación), no dice nada', async () => {
    await elegir(vi.fn(async () => null));
    await elegir(vi.fn(() => undefined));
    expect(toastMock.error).not.toHaveBeenCalled();
  });
});
