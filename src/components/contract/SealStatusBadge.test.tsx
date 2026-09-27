/**
 * T-0109 contract.md §3.1.B / §3.2 — badge de sello + botón de reintentar (B3).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

const { reintentarSelloMock } = vi.hoisted(() => ({ reintentarSelloMock: vi.fn() }));

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { reintentarSello: reintentarSelloMock },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { SealStatusBadge } from './SealStatusBadge';
import { toast } from '@/components/ui/toast';

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
  vi.restoreAllMocks();
});

function render(props: Partial<React.ComponentProps<typeof SealStatusBadge>> = {}) {
  act(() => {
    root.render(
      <SealStatusBadge
        contractId="c-1"
        documentoFirmado={{
          version: 1,
          kind: 'CONTRACT_FINAL',
          sealStatus: 'FAILED',
          sealedAt: null,
          createdAt: '2026-09-27T00:00:00.000Z',
        }}
        canEdit
        {...props}
      />
    );
  });
}

describe('<SealStatusBadge>', () => {
  it('documentoFirmado ausente → no renderiza nada', () => {
    render({ documentoFirmado: undefined });
    expect(container.querySelector('[data-testid="seal-status-badge"]')).toBeNull();
  });

  it('documentoFirmado null (contrato legacy) → no renderiza nada', () => {
    render({ documentoFirmado: null });
    expect(container.querySelector('[data-testid="seal-status-badge"]')).toBeNull();
  });

  it('SEALED → muestra el badge, sin botón de reintentar', () => {
    render({ documentoFirmado: { version: 1, kind: 'CONTRACT_FINAL', sealStatus: 'SEALED', sealedAt: 'x', createdAt: 'x' } });
    expect(container.querySelector('[data-testid="seal-status-badge"]')?.textContent).toBe('Sellado');
    expect(container.querySelector('[data-testid="seal-retry-button"]')).toBeNull();
  });

  it('FAILED + canEdit=true → muestra el botón de reintentar', () => {
    render();
    expect(container.querySelector('[data-testid="seal-retry-button"]')).not.toBeNull();
  });

  it('FAILED + canEdit=false → oculta el botón de reintentar (contratos:edit)', () => {
    render({ canEdit: false });
    expect(container.querySelector('[data-testid="seal-retry-button"]')).toBeNull();
  });

  it('reintentar llama a contractsApi.reintentarSello y avisa onReintentado', async () => {
    reintentarSelloMock.mockResolvedValueOnce({ sealStatus: 'PENDING' });
    const onReintentado = vi.fn();
    render({ onReintentado });

    await act(async () => {
      (container.querySelector('[data-testid="seal-retry-button"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(reintentarSelloMock).toHaveBeenCalledWith('c-1');
    expect(onReintentado).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
  });

  it('un 409 SELLO_NO_REINTENTABLE muestra el motivo del back, sin reventar', async () => {
    reintentarSelloMock.mockRejectedValueOnce(new Error('El sello ya no está en FAILED.'));
    render();

    await act(async () => {
      (container.querySelector('[data-testid="seal-retry-button"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toast.error).toHaveBeenCalled();
  });
});
