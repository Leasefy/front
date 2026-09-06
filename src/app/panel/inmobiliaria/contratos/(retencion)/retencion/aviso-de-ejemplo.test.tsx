/**
 * Retención — nada de plata inventada sin cartel.
 *
 * Las cuatro pantallas de Retención (`/contratos/retencion`, `/riesgo`,
 * `/riesgo/[caseId]`, `/aprobar`) caen SIEMPRE al mock: el microservicio no
 * publica `/api/agency/:id/retencion/*` —sólo el webhook de WhatsApp— y
 * `src/lib/api/retencion.ts` atrapa cualquier fallo y devuelve
 * `mock-retencion.ts`, que trae nombres de personas («Ana María Restrepo»),
 * ciudades y comisiones en pesos escritas a mano.
 *
 * Lo que había para avisarlo era una pastillita amber que decía «Datos de
 * demostración» al lado del título: se lee como una etiqueta de sección, no
 * como una advertencia, y quedaba ARRIBA a la izquierda mientras los números
 * inventados ocupaban la pantalla entera.
 *
 * La prueba muerde las dos mitades: que con mock salga `AvisoDatosDeEjemplo`,
 * y que con datos reales NO salga (un cartel que aparece siempre deja de
 * significar algo).
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

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
      caseId: 'owner:ana-restrepo',
      ownerName: 'Ana María Restrepo',
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

function render(usingMock: boolean) {
  dashboardMock.mockReturnValue({ data: DATA, isLoading: false, error: null, usingMock });
  act(() => root.render(<RetencionDashboardPage />));
}

describe('Retención — tablero', () => {
  it('con datos inventados lo dice a lo ancho, nombrando qué es falso', () => {
    render(true);
    const aviso = container.querySelector('[data-testid="aviso-datos-de-ejemplo"]');
    expect(aviso).not.toBeNull();
    // No alcanza con «demo»: tiene que nombrar de qué número desconfiar.
    expect(aviso!.textContent).toContain('comisión');
    // Y decir qué falta para que sea real.
    expect(aviso!.textContent).toContain('retencion');
  });

  it('con datos reales no hay cartel', () => {
    render(false);
    expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).toBeNull();
    // La pantalla sigue pintando lo suyo.
    expect(container.textContent).toContain('Ana María Restrepo');
  });
});
