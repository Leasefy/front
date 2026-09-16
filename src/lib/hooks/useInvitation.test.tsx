/**
 * useInvitation — la invitación pública por token.
 *
 * A1: un 500 o la red caída terminaban en «Invitación no encontrada», sin
 *     reintentar. Ahora sólo el 404 es `invalid`; lo demás es `error`.
 * A2: el hook armaba la URL a mano con fallback a localhost; ahora pregunta
 *     por `apiClient`, como aceptar y rechazar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...real, apiClient: { ...real.apiClient, get: getMock } };
});

import { ApiError } from '@/lib/api/client';
import { useInvitation, estadoPorFallo, type UseInvitationResult } from './useInvitation';

const INVITACION = {
  agencyName: 'Portofino',
  role: 'AGENTE',
  invitedEmail: 'ana@portofino.co',
  expiresAt: '2026-10-01T00:00:00.000Z',
};

let container: HTMLDivElement;
let root: Root;
let ultimo: UseInvitationResult;

function Sonda({ token }: { token: string }) {
  ultimo = useInvitation(token);
  return null;
}

beforeEach(() => {
  getMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function montar(token = 'tok-1') {
  await act(async () => {
    root.render(<Sonda token={token} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useInvitation', () => {
  it('🔴 A2 · pregunta por apiClient, sin armar la URL del back a mano', async () => {
    getMock.mockResolvedValue(INVITACION);
    await montar('tok-1');
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/agency/invitations/tok-1');
  });

  it('una invitación que existe queda válida, con sus datos', async () => {
    getMock.mockResolvedValue(INVITACION);
    await montar();
    expect(ultimo.status).toBe('valid');
    expect(ultimo.invitation).toEqual(INVITACION);
  });

  it('un 404 sí es «no encontrada»', async () => {
    getMock.mockRejectedValue(new ApiError(404, 'Invitation token not found or already used'));
    await montar();
    expect(ultimo.status).toBe('invalid');
  });

  it('un 400 del back es la invitación vencida', async () => {
    getMock.mockRejectedValue(new ApiError(400, 'Invitation token has expired'));
    await montar();
    expect(ultimo.status).toBe('expired');
  });

  it('🔴 A1 · un 500 NO es «no encontrada»: es error, y reintentar vuelve a preguntar', async () => {
    const fallo = new ApiError(500, 'Internal server error');
    getMock.mockRejectedValueOnce(fallo).mockResolvedValueOnce(INVITACION);
    await montar();
    expect(ultimo.status).toBe('error');
    expect(ultimo.error).toBe(fallo);

    await act(async () => {
      ultimo.reintentar();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(ultimo.status).toBe('valid');
    expect(ultimo.invitation).toEqual(INVITACION);
  });

  it('🔴 A1 · la red caída también es error, no «no encontrada»', async () => {
    getMock.mockRejectedValue(new ApiError(0, 'No pudimos conectarnos al servidor.'));
    await montar();
    expect(ultimo.status).toBe('error');
  });

  it('sin token es inválida y ni pregunta', async () => {
    await montar('');
    expect(ultimo.status).toBe('invalid');
    expect(getMock).not.toHaveBeenCalled();
  });
});

describe('estadoPorFallo', () => {
  it.each([
    [new ApiError(404, 'x'), 'invalid'],
    [new ApiError(400, 'x'), 'expired'],
    [new ApiError(410, 'x'), 'expired'],
    [new ApiError(500, 'x'), 'error'],
    [new ApiError(429, 'x'), 'error'],
    [new ApiError(0, 'x'), 'error'],
    [new TypeError('Failed to fetch'), 'error'],
  ])('%s → %s', (fallo, estado) => {
    expect(estadoPorFallo(fallo)).toBe(estado);
  });
});
