import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { PipelineItem } from '@/lib/types/inmobiliaria';

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

import { BarraDelEmbudo } from './BarraDelEmbudo';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const item = (id: string, stage: PipelineItem['stage']) => ({ id, stage }) as PipelineItem;

function montar(props: Partial<React.ComponentProps<typeof BarraDelEmbudo>> = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const onEtapa = vi.fn();
  act(() =>
    root.render(
      <BarraDelEmbudo
        items={[item('1', 'lead'), item('2', 'lead'), item('3', 'evaluation')]}
        cifras={{ inProcess: 3, completedThisMonth: 0, conversionRate: null }}
        cargando={false}
        etapa={null}
        onEtapa={onEtapa}
        {...props}
      />,
    ),
  );
  return onEtapa;
}

describe('Prospección — la barra del embudo (Nico, 22-10)', () => {
  it('una etapa por cada una con gente, con su número; las vacías se cuentan aparte', () => {
    montar();
    expect(host.querySelector('[data-testid="etapa-del-embudo-lead"]')?.textContent).toContain('2');
    expect(host.querySelector('[data-testid="etapa-del-embudo-evaluation"]')?.textContent).toContain('1');
    expect(host.querySelector('[data-testid="etapa-del-embudo-contract"]')).toBeNull();
    expect(host.textContent).toContain('etapas sin interesados');
  });

  it('tocar una etapa la elige; tocarla otra vez la suelta', () => {
    const onEtapa = montar();
    act(() => (host.querySelector('[data-testid="etapa-del-embudo-lead"]') as HTMLButtonElement).click());
    expect(onEtapa).toHaveBeenCalledWith('lead');
    act(() => root.unmount());
    host.remove();
    const otra = montar({ etapa: 'lead' });
    const boton = host.querySelector('[data-testid="etapa-del-embudo-lead"]') as HTMLButtonElement;
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    act(() => boton.click());
    expect(otra).toHaveBeenCalledWith(null);
  });

  it('la conversión sólo con casos resueltos', () => {
    montar();
    expect(host.querySelector('[data-testid="conversion-del-embudo"]')).toBeNull();
    act(() => root.unmount());
    host.remove();
    montar({ cifras: { inProcess: 3, completedThisMonth: 1, conversionRate: 0.5 } });
    expect(host.querySelector('[data-testid="conversion-del-embudo"]')).not.toBeNull();
  });

  it('mientras carga no hay barra ni un 0 inventado', () => {
    montar({ cargando: true });
    expect(host.querySelector('[data-testid^="etapa-del-embudo-"]')).toBeNull();
    expect(Array.from(host.querySelectorAll('[data-testid="kpi-valor"]')).every((el) => el.getAttribute('data-estado') === 'cargando')).toBe(true);
  });
});
