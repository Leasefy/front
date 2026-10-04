/**
 * Retención — sin datos inventados (QA 04-10, IA-C-01 e IA-C-02).
 *
 * Antes las cuatro pantallas caían a `mock-retencion.ts` (propietarios,
 * puntajes y pesos escritos a mano) cuando el micro respondía 404 «Retención no
 * está habilitada», con un aviso que nombraba archivos del código y rutas. Y el
 * título decía «Retención · Laura» (Laura es la voz de cobranza).
 *
 * Ahora, apagada: «Retención no está activada todavía para tu inmobiliaria»,
 * qué haría y a quién pedirla; sin cifras, sin rutas, sin nombres de archivo.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { dashboardMock } = vi.hoisted(() => ({ dashboardMock: vi.fn() }));

vi.mock('@/lib/hooks/retencion/use-retencion', () => ({
  useRetencionDashboard: dashboardMock,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

import RetencionDashboardPage from './page';

void React;

const DATA = {
  cards: [{ key: 'propietarios_riesgo', label: 'Propietarios en riesgo', value: '3' }],
  urgent: [
    {
      caseId: 'owner:o1',
      ownerName: 'Propietaria real del lab',
      score: 84,
      rootCauseLabel: 'Pago retrasado',
      nextActionLabel: 'Llamada prioritaria',
      expectedCommissionLoss: 980000,
    },
  ],
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  dashboardMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(estado: Record<string, unknown>) {
  dashboardMock.mockReturnValue({ data: null, isLoading: false, error: null, apagado: false, refetch: vi.fn(), ...estado });
  act(() => root.render(<RetencionDashboardPage />));
}

describe('Retención — tablero', () => {
  it('🔴 apagada: lo dice, dice qué haría y a quién pedirla, sin cifras ni texto técnico', () => {
    render({ apagado: true });
    const apagada = container.querySelector('[data-testid="retencion-apagada"]');
    expect(apagada).not.toBeNull();
    const texto = container.textContent ?? '';
    expect(texto).toContain('Retención no está activada todavía para tu inmobiliaria');
    expect(texto).toContain('contacto de Leasefy');
    expect(texto).toContain('riesgo de salir del portafolio');
    // Nada técnico ni inventado.
    expect(texto).not.toMatch(/mock|src\/|\/api\/|retencion\/\*|\.ts\b|microservicio/i);
    expect(texto).not.toMatch(/\$\s?\d/);
    expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).toBeNull();
  });

  it('IA-C-02: el agente no se llama «Laura»', () => {
    render({ apagado: true });
    expect(container.querySelector('h1')?.textContent).toBe('Retención');
    expect(container.textContent).not.toContain('Laura');
  });

  it('con datos reales los pinta, sin cartel de «apagada»', () => {
    render({ data: DATA });
    expect(container.querySelector('[data-testid="retencion-apagada"]')).toBeNull();
    expect(container.textContent).toContain('Propietaria real del lab');
    expect(container.textContent).toContain('$980.000');
  });
});
