/**
 * GLOW UP (21-10-2026, QA en el laboratorio): con el asistente caído (503 de
 * `cartera/payment-plans/mine`), «Mis casos» decía «Error al cargar tus casos»
 * y escondía los pagos y las solicitudes que sí llegaron. Ahora muestra lo que
 * llegó y dice qué faltó; el error de pantalla completa queda para cuando no
 * llegó nada.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { datos } = vi.hoisted(() => ({
  datos: { fuentes: [] as string[], todas: false, error: null as string | null },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({ isComplete: true, isLoading: false }),
}));
vi.mock('@/lib/hooks/useNotifications', () => ({ useTenantNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('@/lib/hooks/use-tenant-cases', () => ({
  useTenantCases: () => ({
    cases: [],
    openCasesCount: 0,
    primaryLease: null,
    isLoading: false,
    error: datos.error,
    fuentesQueFallaron: datos.fuentes,
    todasFallaron: datos.todas,
    refetch: vi.fn(),
  }),
}));

import CasosPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<CasosPage />);
  });
}

beforeEach(() => {
  datos.fuentes = [];
  datos.todas = false;
  datos.error = null;
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('Mis casos con una fuente caída', () => {
  it('si falló una fuente, la pantalla sigue y dice qué faltó', async () => {
    datos.error = 'El asistente de Leasefy no está disponible';
    datos.fuentes = ['acuerdos'];
    await montar();
    expect(document.querySelector('header h1')?.textContent).toBe('Solicitudes');
    expect(document.querySelector('[data-testid="fuentes-caidas"]')?.textContent).toContain('tus acuerdos de pago');
    expect(document.body.textContent).not.toContain('Error al cargar tus casos');
  });

  it('si no llegó nada, sí es el error de pantalla completa', async () => {
    datos.error = 'El asistente de Leasefy no está disponible';
    datos.fuentes = ['pagos', 'arriendo', 'postulaciones', 'solicitudes', 'acuerdos'];
    datos.todas = true;
    await montar();
    expect(document.body.textContent).toContain('Error al cargar tus casos');
  });

  it('sin fallos no hay aviso', async () => {
    await montar();
    expect(document.querySelector('[data-testid="fuentes-caidas"]')).toBeNull();
  });
});
