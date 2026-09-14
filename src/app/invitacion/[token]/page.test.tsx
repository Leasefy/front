/**
 * /invitacion/[token] — la página pública de la invitación.
 *
 * A1: con el servidor caído la página decía «Invitación no encontrada» y
 *     mandaba a pedir otra. Ahora dice que no se pudo validar y deja
 *     reintentar; «no encontrada» queda sólo para el 404.
 * A5: rechazar se tragaba el fallo y navegaba a `/` igual: la persona creía
 *     haber rechazado una invitación que seguía viva. Ahora lo dice y se queda.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  useInvitation: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
  toastError: vi.fn(),
  auth: {
    user: { firstName: 'Ana', name: 'Ana Ruiz' } as unknown,
    isLoading: false,
    needsOnboarding: false,
  },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok-1' }),
  useRouter: () => ({ push: h.push, replace: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => h.auth }));
vi.mock('@/lib/hooks/useInvitation', () => ({ useInvitation: h.useInvitation }));
vi.mock('@/components/ui/toast', () => ({ toast: { error: h.toastError, success: vi.fn() } }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...real, apiClient: { ...real.apiClient, post: h.post } };
});

import { ApiError } from '@/lib/api/client';
import InvitacionPage from './page';

const INVITACION = {
  agencyName: 'Portofino',
  agencyCity: 'Medellín',
  role: 'AGENTE',
  invitedEmail: 'ana@portofino.co',
  expiresAt: '2026-10-01T00:00:00.000Z',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  for (const fn of [h.useInvitation, h.post, h.push, h.toastError]) fn.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function conEstado(extra: Record<string, unknown>) {
  h.useInvitation.mockReturnValue({
    invitation: null,
    status: 'loading',
    error: null,
    reintentar: vi.fn(),
    ...extra,
  });
}

async function montar() {
  await act(async () => {
    root.render(<InvitacionPage />);
  });
}

async function clic(el: Element | null | undefined) {
  if (!el) throw new Error('no hay elemento para el clic');
  await act(async () => {
    (el as HTMLElement).click();
  });
}

const botonConTexto = (texto: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(texto));

describe('Invitación — A1: un fallo del servidor no es «no encontrada»', () => {
  it('🔴 con el servidor caído dice que no se pudo validar y deja reintentar', async () => {
    const reintentar = vi.fn();
    conEstado({ status: 'error', error: new ApiError(500, 'Internal server error'), reintentar });
    await montar();

    expect(container.textContent).not.toContain('Invitación no encontrada');
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull();

    await clic(container.querySelector('[data-testid="reintentar"]'));
    expect(reintentar).toHaveBeenCalled();
  });

  it('un 404 sí dice «Invitación no encontrada»', async () => {
    conEstado({ status: 'invalid' });
    await montar();
    expect(container.textContent).toContain('Invitación no encontrada');
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull();
  });
});

describe('Invitación — A5: rechazar', () => {
  it('🔴 si falla, lo dice con el motivo y NO se va al inicio', async () => {
    conEstado({ status: 'valid', invitation: INVITACION });
    h.post.mockRejectedValue(new ApiError(500, 'No pudimos registrar el rechazo'));
    await montar();

    await clic(botonConTexto('Rechazar invitación'));

    expect(h.post).toHaveBeenCalledWith('/inmobiliaria/agency/invitations/tok-1/decline');
    expect(h.toastError).toHaveBeenCalledWith('No se pudo rechazar la invitación', {
      description: 'No pudimos registrar el rechazo',
    });
    expect(h.push).not.toHaveBeenCalled();
    expect(botonConTexto('Rechazar invitación')?.disabled).toBe(false);
  });

  it('si sale, se va al inicio', async () => {
    conEstado({ status: 'valid', invitation: INVITACION });
    h.post.mockResolvedValue(undefined);
    await montar();

    await clic(botonConTexto('Rechazar invitación'));

    expect(h.push).toHaveBeenCalledWith('/');
    expect(h.toastError).not.toHaveBeenCalled();
  });
});
