/**
 * @vitest-environment happy-dom
 *
 * Candidatos del propietario independiente (glow up, 21-10-2026): lo pendiente
 * primero y una sola cosa a la vez mientras carga o falla. Antes, cargando, se
 * veían la ruedita y la tabla vacía diciendo que no había candidatos.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hook = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock('@/lib/hooks/useLandlord', () => ({
  useCandidates: () => hook.valor,
  useCandidate: () => ({ candidate: null, isLoading: false, error: null }),
  useCandidateDecision: () => ({ decide: vi.fn() }),
  mensajeDelFalloAlDecidir: () => 'No se pudo',
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...p }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', p, children),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import es from '@/lib/i18n/locales/es.json';
import CandidatosPage from './page';

const T = es.landlord.candidates;

const candidato = (id: string, nombre: string, status: string) => ({
  id,
  fullName: nombre,
  photo: null,
  age: 30,
  occupation: 'Ingeniera',
  riskLevel: 'A',
  numericScore: 90,
  appliedAt: '2026-10-20T10:00:00Z',
  propertyId: 'p1',
  propertyTitle: 'Apartamento en Laureles',
  status,
});

const base = {
  candidates: [] as unknown[],
  stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
  isLoading: false,
  error: null as string | null,
  refetch: vi.fn(),
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const pintar = (valor: Partial<typeof base>) => {
  hook.valor = { ...base, ...valor };
  act(() => root.render(<CandidatosPage />));
};

describe('Candidatos del propietario', () => {
  it('cargando: sólo el esqueleto, sin la tabla diciendo que no hay nadie', () => {
    pintar({ isLoading: true });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(container.textContent).not.toContain(T.emptyDefaultMessage);
    expect(container.textContent).not.toContain(T.emptyTitle);
  });

  it('si falla: el cartel del fallo con su reintento, sin la tabla vacía', () => {
    const refetch = vi.fn();
    pintar({ error: 'No pudimos cargar tus candidatos.', refetch });
    expect(container.textContent).not.toContain(T.emptyDefaultMessage);
    expect(container.textContent).not.toContain(T.emptyTitle);
    const reintentar = [...container.querySelectorAll('button')].find((b) => /intent/i.test(b.textContent ?? ''));
    act(() => reintentar?.click());
    expect(refetch).toHaveBeenCalled();
  });

  it('con nuevos por revisar, entra en «Nuevos»: el aprobado no aparece hasta elegir otro estado', () => {
    pintar({
      candidates: [candidato('1', 'Ana Nueva', 'pending'), candidato('2', 'Beto Aprobado', 'approved')],
      stats: { total: 2, pending: 1, approved: 1, rejected: 0 },
    });
    expect(container.textContent).toContain('Ana Nueva');
    expect(container.textContent).not.toContain('Beto Aprobado');
    expect(container.querySelector('[data-testid="cifras-de-los-candidatos"]')?.textContent).toContain(T.toReview);
  });

  it('sin nuevos, entra en «Todos»', () => {
    pintar({
      candidates: [candidato('2', 'Beto Aprobado', 'approved')],
      stats: { total: 1, pending: 0, approved: 1, rejected: 0 },
    });
    expect(container.textContent).toContain('Beto Aprobado');
  });
});
