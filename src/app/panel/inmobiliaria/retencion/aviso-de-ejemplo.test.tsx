/**
 * Retención — sin datos inventados (QA 04-10, IA-C-01 e IA-C-02), con Vinci.
 *
 * Antes las cuatro pantallas caían a `mock-retencion.ts` (propietarios,
 * puntajes y pesos escritos a mano) cuando el micro respondía 404 «Retención no
 * está habilitada», con un aviso que nombraba archivos del código y rutas. Y el
 * título decía «Retención · Laura» (Laura es la voz de cobranza).
 *
 * Con Vinci (26-09, traído el 08-10) el 404 del micro nombra su variable
 * (`RETENCION_ENABLED`): el cliente lo vuelve `RetencionApagadaError` y cada
 * pantalla dice «Retención no está activada todavía para tu inmobiliaria», qué
 * haría y a quién pedirla; sin cifras, sin rutas, sin nombres de archivo.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { riesgo, metricas, umbral, decisiones, ofertas, plan } = vi.hoisted(() => ({
  riesgo: vi.fn(),
  metricas: vi.fn(),
  umbral: vi.fn(),
  decisiones: vi.fn(),
  ofertas: vi.fn(),
  plan: vi.fn(),
}));
vi.mock('@/lib/hooks/retencion/use-vinci', () => ({
  useRiesgoDeVinci: riesgo,
  useMetricasDeVinci: metricas,
  useUmbralDeVinci: umbral,
  useDecisionesDeVinci: decisiones,
  useOfertasDelCaso: ofertas,
  usePlanDelCaso: plan,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/panel/inmobiliaria/retencion' }));
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContext: () => ({ isAdmin: true }) }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'a1' } }) }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

import RetencionDashboardPage from './page';
import BandejaClient from './riesgo/BandejaClient';
import CasoDetailClient from './riesgo/[caseId]/CasoDetailClient';
import RevisionesClient from './aprobar/RevisionesClient';
import { RetencionApagadaError } from '@/lib/api/retencion';

void React;

let container: HTMLDivElement;
let root: Root;

const vacio = { data: null, isLoading: false, error: null, refetch: vi.fn() };

function apagadaEnTodo() {
  const err = new RetencionApagadaError();
  for (const h of [riesgo, metricas, umbral, decisiones, ofertas, plan]) h.mockReturnValue({ ...vacio, error: err });
}

beforeEach(() => {
  for (const h of [riesgo, metricas, umbral, decisiones, ofertas, plan]) h.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(el: React.ReactElement) {
  act(() => root.render(el));
  return container.textContent ?? '';
}

describe('Retención apagada — las cuatro pantallas lo dicen', () => {
  for (const [nombre, el] of [
    ['el tablero', <RetencionDashboardPage key="t" />],
    ['los casos', <BandejaClient key="b" />],
    ['el caso', <CasoDetailClient key="c" caseId="inquilino:c1" />],
    ['por aprobar', <RevisionesClient key="r" />],
  ] as const) {
    it(`🔴 ${nombre}: lo dice, dice qué haría y a quién pedirla, sin cifras ni texto técnico`, () => {
      apagadaEnTodo();
      const texto = pintar(el);
      expect(container.querySelector('[data-testid="retencion-apagada"]')).not.toBeNull();
      expect(texto).toContain('Retención no está activada todavía para tu inmobiliaria');
      expect(texto).toContain('contacto de Leasefy');
      // Nada técnico ni inventado: ni la variable del micro, ni rutas, ni plata.
      expect(texto).not.toMatch(/RETENCION_ENABLED|mock|src\/|\/api\/|\.ts\b|microservicio/i);
      expect(texto).not.toMatch(/\$\s?\d/);
      expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull();
    });
  }

  it('IA-C-02: el agente no se llama «Laura»', () => {
    apagadaEnTodo();
    const texto = pintar(<RetencionDashboardPage />);
    expect(container.querySelector('h1')?.textContent).toBe('Retención');
    expect(texto).not.toContain('Laura');
  });
});
