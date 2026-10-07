/**
 * QA-INQ-95 ronda 2 (decisión de Nico, 04-10): la saliente de un cambio de
 * inquilino pide en su portal el «Certificado de que no debe nada por el
 * tiempo en que fue inquilino» (no el paz y salvo del contrato).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { disponibles: vi.fn(), emitir: vi.fn(), pdf: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/lease-documents.service', () => ({ leaseDocumentsApi: api }));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));

import { MisCertificados } from './MisCertificados';

const SU_TIEMPO = {
  contractId: 'c-59',
  numero: 'QI-01',
  inmueble: 'Calle 96 # 95-01 Apto 101',
  agencia: { id: 'ag', nombre: 'Inmobiliaria Laboratorio S.A.S.' },
  tipo: 'CERTIFICADO_DE_SU_TIEMPO' as const,
  puedeEmitirse: true,
  impedimentos: [],
};

let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<MisCertificados />);
  });
  await esperar();
  await esperar();
}

const texto = () => document.body.textContent ?? '';
const botones = () =>
  [...document.querySelectorAll('button')].map((b) => b.textContent ?? '');

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  api.disponibles.mockResolvedValue([SU_TIEMPO]);
  api.emitir.mockResolvedValue({ documentoId: 'doc-1', tipo: 'CERTIFICADO_DE_SU_TIEMPO' });
  api.pdf.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = '';
});

describe('el certificado del tiempo en que fue inquilino', () => {
  it('se llama por su nombre, dice que no es el paz y salvo del contrato y se puede pedir', async () => {
    await montar();
    expect(texto()).toContain('Certificado de que no debe nada por el tiempo en que fue inquilino');
    expect(texto()).toContain('No es el paz y salvo del contrato');
    const emitir = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('Emitir'));
    expect(emitir).toBeTruthy();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
    globalThis.URL.revokeObjectURL = vi.fn();
    await act(async () => {
      emitir!.click();
    });
    await esperar();
    expect(api.emitir).toHaveBeenCalledWith('c-59');
    expect(toastMock.success).toHaveBeenCalledWith('Certificado de que no debe nada por el tiempo en que fue inquilino emitido');
  });

  it('con algo de su tiempo sin pagar, dice cuánto falta y no ofrece el botón', async () => {
    api.disponibles.mockResolvedValue([
      { ...SU_TIEMPO, puedeEmitirse: false, impedimentos: [{ code: 'QUEDA_SALDO_DE_SU_TIEMPO', mensaje: 'Del tiempo en que fuiste inquilino de este contrato quedan $1.520.000 sin pagar.' }] },
    ]);
    await montar();
    expect(texto()).toContain('quedan $1.520.000 sin pagar');
    expect(botones().some((b) => b.includes('Emitir'))).toBe(false);
  });
});
