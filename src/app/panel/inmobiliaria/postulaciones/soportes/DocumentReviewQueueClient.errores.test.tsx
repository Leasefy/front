/**
 * 02-10-2026 · Revisar un soporte cuando el back dice que no. Antes el toast
 * pintaba `err.message` crudo («Internal server error», «Failed to fetch»).
 *
 *   · lo que el back dice del motivo del rechazo va debajo del campo del cajón;
 *   · un 5xx dice que es nuestro, con la referencia;
 *   · sin respuesta, la conexión.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  toastError: vi.fn(),
  revisar: vi.fn(),
  vista: { props: null as null | Record<string, unknown> },
  cajon: { props: null as null | Record<string, unknown> },
}));

vi.mock('@/components/ui/toast', () => ({ toast: { error: h.toastError, success: vi.fn() } }));
vi.mock('@/lib/auth/useAgencyAccess', () => ({ useAgencyAccess: () => ({ isManager: true }) }));
vi.mock('@/lib/api/document-review.service', () => ({
  documentReviewApi: {
    getReviewQueue: () => Promise.resolve({ counts: { total: 0, pending: 0, inReview: 0, approved: 0, rejected: 0 }, items: [] }),
    reviewDocument: h.revisar,
  },
}));
vi.mock('./DocumentReviewQueueView', () => ({
  DocumentReviewQueueView: (props: Record<string, unknown>) => {
    h.vista.props = props;
    return null;
  },
}));
vi.mock('./RejectReasonDrawer', () => ({
  RejectReasonDrawer: (props: Record<string, unknown>) => {
    h.cajon.props = props;
    return null;
  },
}));

import { DocumentReviewQueueClient } from './DocumentReviewQueueClient';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.toastError.mockReset();
  h.revisar.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function montar() {
  await act(async () => {
    root.render(<DocumentReviewQueueClient />);
  });
}

async function aprobarCon(error: unknown): Promise<string> {
  h.revisar.mockRejectedValue(error);
  await montar();
  await act(async () => {
    (h.vista.props!.onApprove as (a: string, d: string) => void)('app-1', 'doc-1');
  });
  expect(h.toastError).toHaveBeenCalledTimes(1);
  return String(h.toastError.mock.calls[0][0]);
}

describe('Soportes — cuando el back dice que no', () => {
  it('🔴 un 5xx dice que es nuestro, con la referencia, sin el texto crudo', async () => {
    const texto = await aprobarCon(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Internal server error',
        referencia: '0f1e2d3c',
      }),
    );
    expect(texto).toContain('de nuestro lado');
    expect(texto).toContain('0f1e2d3c');
    expect(texto).not.toContain('Internal server error');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });

  it('🔴 sin respuesta (status 0), la conexión', async () => {
    const texto = await aprobarCon(new ApiError(0, 'Failed to fetch'));
    expect(texto.toLowerCase()).toContain('conexión');
  });

  it('🔴 lo que el back dice del motivo del rechazo va al campo del cajón, no a un toast', async () => {
    const frase = 'Se requiere un motivo para rechazar el documento.';
    h.revisar.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'rejectionReason', regla: 'requerido', mensaje: frase }],
      }),
    );
    await montar();
    await act(async () => {
      (h.vista.props!.onReject as (i: unknown, d: unknown) => void)(
        { applicationId: 'app-1' },
        { id: 'doc-1', originalName: 'cedula.pdf' },
      );
    });
    await act(async () => {
      await (h.cajon.props!.onConfirm as (m: string) => Promise<void>)(' ');
    });
    expect(h.cajon.props!.error).toBe(frase);
    expect(h.cajon.props!.open).toBe(true);
    expect(h.toastError).not.toHaveBeenCalled();
  });
});
