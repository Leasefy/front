/**
 * @vitest-environment happy-dom
 *
 * Dos cosas del panorama de cartera, las dos vistas en pantalla y no deducidas:
 *
 * CB1 (13-09): con el panorama caído, la pantalla pintaba la cartera entera en
 * 0 y un banner al final, sin reintento.
 *
 * «Cómo funciona» (21-09): contenido de aprendizaje que estaba clavado en mitad
 * del tablero. Vive acá porque las dos preguntas son sobre ESTA pantalla y el
 * andamio de mocks es el mismo.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const estado = vi.hoisted(() => ({
  valor: {
    data: null as unknown,
    isLoading: false,
    error: null as string | null,
    refetch: (() => Promise.resolve()) as () => Promise<void>,
  },
}));

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
    asChild ? React.createElement('span', props, children) : React.createElement('button', props, children),
}));
vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement('button', props, children),
}));
vi.mock('@/lib/cartera', () => ({ CARTERA_STAGES: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX'] }));
vi.mock('@/lib/hooks/cobranza/use-cartera-overview', () => ({ useCarteraOverview: () => estado.valor }));
vi.mock('@/lib/hooks/cobranza/use-stage-transitions-realtime', () => ({
  useStageTransitionsRealtime: () => undefined,
}));

const { nada } = vi.hoisted(() => ({ nada: () => null }));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaResultadosKpis', () => ({ CobranzaResultadosKpis: nada }));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaAnaliticaResumen', () => ({ CobranzaAnaliticaResumen: nada }));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaTeTocaATi', () => ({
  CobranzaTeTocaATi: ({ enMora }: { enMora: unknown }) =>
    React.createElement('p', { 'data-testid': 'te-toca' }, `en mora: ${String(enMora)}`),
}));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaDeudoresQuePesan', () => ({ CobranzaDeudoresQuePesan: nada }));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaStageCard', () => ({ CobranzaStageCard: nada }));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaFunnelChart', () => ({ CobranzaFunnelChart: nada }));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaTransitionsFeed', () => ({ CobranzaTransitionsFeed: nada }));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaNextActionsPanel', () => ({ CobranzaNextActionsPanel: nada }));
vi.mock('@/components/skeleton/panel/CobranzaOverviewSkeleton', () => ({
  CobranzaOverviewSkeleton: () => React.createElement('div', { 'data-testid': 'esqueleto' }),
}));
vi.mock('@/components/inmobiliaria/cobranza/CobranzaImportCard', () => ({ CobranzaImportCard: nada }));
vi.mock('@/components/data-display/EmptyState', () => ({ EmptyState: nada }));

import CobranzaOverviewPage from './page';

const DATOS = {
  kpis: { deudoresActivos: 3, pagadoHoyCop: 0, llamadasHoy: 0, escalacionesPendientes: 0 },
  stages: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX'].map((stage, i) => ({
    stage,
    stageDisplayName: stage,
    ordinal: i,
    count: 1,
    avgDaysInStage: 0,
    weeklyDelta: 0,
  })),
  lastTransitions: [],
  nextActions: [],
  generatedAt: '2026-09-13T00:00:00.000Z',
};

describe('/cobros/cobranza con el panorama caído (CB1)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('🔴 sin datos y con fallo: el fallo va arriba con reintento y no hay ningún número en cero', async () => {
    const refetch = vi.fn(() => Promise.resolve());
    estado.valor = { data: null, isLoading: false, error: '500', refetch };

    await act(async () => root.render(<CobranzaOverviewPage />));

    expect(container.querySelector('[data-testid="te-toca"]')).toBeNull();
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeTruthy();
    const reintentar = container.querySelector<HTMLButtonElement>('[data-testid="reintentar"]');
    expect(reintentar).toBeTruthy();

    await act(async () => reintentar!.click());
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('con datos y un refresco fallido: conserva lo cargado y avisa ARRIBA, con reintento', async () => {
    const refetch = vi.fn(() => Promise.resolve());
    estado.valor = { data: DATOS, isLoading: false, error: '500', refetch };

    await act(async () => root.render(<CobranzaOverviewPage />));

    const aviso = container.querySelector('[data-testid="cartera-desactualizada"]');
    const contenido = container.querySelector('[data-testid="te-toca"]');
    expect(aviso).toBeTruthy();
    expect(contenido).toBeTruthy();
    // El aviso está ANTES que el contenido, no al final de la página.
    expect(aviso!.compareDocumentPosition(contenido!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await act(async () => aviso!.querySelector('button')!.click());
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

/**
 * 🔴 «Cómo funciona» tiene dos modos a propósito, y es una decisión de
 * producto que alguien podría "simplificar" sin darse cuenta de lo que pierde:
 *
 *   · con cartera en mora hay trabajo en la pantalla, así que la explicación se
 *     pide (un modal, que devuelve el tablero intacto al cerrarse);
 *   · sin cartera todavía no hay nada que empujar y los cuatro pasos son lo
 *     único que la pantalla ofrece: ahí quedan puestos, sin pedir un clic.
 */
describe('«Cómo funciona» de la cobranza', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const sinMora = {
    ...DATOS,
    // S0 es «al día»: queda fuera de la mora. Con todo en S0, enMora = 0.
    stages: DATOS.stages.map((s) => ({ ...s, count: s.stage === 'S0' ? 4 : 0 })),
  };

  it('con cartera en mora, los cuatro pasos NO están puestos sobre el tablero', async () => {
    estado.valor = { data: DATOS, isLoading: false, error: null, refetch: () => Promise.resolve() };
    await act(async () => root.render(<CobranzaOverviewPage />));

    // El contenido del modal no se monta hasta que se abre.
    expect(container.querySelector('[data-testid="cobranza-como-funciona"]')).toBeNull();
    // Pero hay por dónde pedirlo.
    expect(container.querySelector('[data-testid="para-entender-mas"]')).toBeTruthy();
  });

  it('sin cartera todavía, los cuatro pasos están puestos: es lo único que la pantalla ofrece', async () => {
    estado.valor = { data: sinMora, isLoading: false, error: null, refetch: () => Promise.resolve() };
    await act(async () => root.render(<CobranzaOverviewPage />));

    expect(container.querySelector('[data-testid="cobranza-como-funciona"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="para-entender-mas"]')).toBeNull();
  });
});
