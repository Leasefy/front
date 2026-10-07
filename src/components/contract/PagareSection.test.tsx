/**
 * T-0109 contract.md §3.1.E5–E8 — PagareSection. Coverage:
 *   (1) hides on a 404 (back sin WU-4)
 *   (2) shows the read-only "no disponible" message when disponible:false
 *   (3) shows the "emitir" button when there is no live pagaré
 *   (4) shows firmantes + the sandbox banner when esSandbox
 *   (5) cancel is only offered while PENDIENTE_DE_FIRMA and puedeEditar
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { PagareResponse } from '@/lib/api/pagare.types';

void React;

const obtener = vi.fn();
const emitir = vi.fn();
const cancelar = vi.fn();
const documento = vi.fn();
const simular = vi.fn();

vi.mock('@/lib/api/pagare.service', () => ({
  pagareApi: {
    obtener: (...a: unknown[]) => obtener(...a),
    emitir: (...a: unknown[]) => emitir(...a),
    cancelar: (...a: unknown[]) => cancelar(...a),
    documento: (...a: unknown[]) => documento(...a),
    simular: (...a: unknown[]) => simular(...a),
  },
}));

import { PagareSection } from './PagareSection';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  [obtener, emitir, cancelar, documento, simular].forEach((m) => m.mockReset());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function montar(puedeEditar = true) {
  await act(async () => {
    root.render(<PagareSection contractId="c-1" puedeEditar={puedeEditar} />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function pagare(overrides: Partial<PagareResponse> = {}): PagareResponse {
  return {
    id: 'p-1',
    contractId: 'c-1',
    estado: 'PENDIENTE_DE_FIRMA',
    proveedor: 'sandbox',
    esSandbox: true,
    emitidoAt: '2026-01-01T00:00:00Z',
    emitidoPor: { id: 'u-1', nombre: 'Ana' },
    firmadoAt: null,
    canceladoAt: null,
    motivoDeCancelacion: null,
    ultimoError: null,
    beneficiarios: [{ nombre: 'Propietario X', tipoDeDocumento: 'CC', documento: '999' }],
    firmantes: [
      { id: 'f-1', tipo: 'INQUILINO', codeudorId: null, nombre: 'Inquilino Uno', tipoDeDocumento: 'CC', documento: '111', email: 'i@x.com', estado: 'PENDIENTE', firmadoAt: null },
      { id: 'f-2', tipo: 'CODEUDOR', codeudorId: 'k-1', nombre: 'Codeudor Uno', tipoDeDocumento: 'CC', documento: '222', email: 'k@x.com', estado: 'FIRMADO', firmadoAt: '2026-01-02T00:00:00Z' },
    ],
    documentos: { pagare: { firmado: false }, cartaDeInstrucciones: { firmado: false } },
    ...overrides,
  };
}

describe('<PagareSection>', () => {
  it('renders nothing on a 404', async () => {
    obtener.mockRejectedValueOnce(new ApiError(404, 'not found'));
    await montar();
    expect(container.querySelector('[data-testid="pagare-section"]')).toBeNull();
  });

  it('shows the read-only message when disponible:false', async () => {
    obtener.mockResolvedValueOnce({ pagare: null, disponible: false });
    await montar();
    expect(container.querySelector('[data-testid="pagare-no-disponible"]')).not.toBeNull();
  });

  it('shows the "emitir" button when there is no pagaré yet', async () => {
    obtener.mockResolvedValueOnce({ pagare: null, disponible: true });
    await montar();
    expect(container.querySelector('[data-testid="emitir-pagare"]')).not.toBeNull();
  });

  it('shows firmantes and the sandbox banner for a live pagaré', async () => {
    obtener.mockResolvedValueOnce({ pagare: pagare(), disponible: true });
    await montar();
    expect(container.querySelector('[data-testid="pagare-sandbox-banner"]')?.textContent).toContain('Sandbox');
    const filas = container.querySelectorAll('[data-testid="firmantes-del-pagare"] li');
    expect(filas.length).toBe(2);
  });

  it('offers cancel only while PENDIENTE_DE_FIRMA and puedeEditar', async () => {
    obtener.mockResolvedValueOnce({ pagare: pagare({ estado: 'PENDIENTE_DE_FIRMA' }), disponible: true });
    await montar(true);
    expect(container.querySelector('[data-testid="cancelar-pagare"]')).not.toBeNull();
  });

  it('does not offer cancel once FIRMADO', async () => {
    obtener.mockResolvedValueOnce({
      pagare: pagare({ estado: 'FIRMADO', firmadoAt: '2026-01-03T00:00:00Z', documentos: { pagare: { firmado: true }, cartaDeInstrucciones: { firmado: true } } }),
      disponible: true,
    });
    await montar(true);
    expect(container.querySelector('[data-testid="cancelar-pagare"]')).toBeNull();
  });

  it('does not offer cancel without puedeEditar even while PENDIENTE_DE_FIRMA', async () => {
    obtener.mockResolvedValueOnce({ pagare: pagare({ estado: 'PENDIENTE_DE_FIRMA' }), disponible: true });
    await montar(false);
    expect(container.querySelector('[data-testid="cancelar-pagare"]')).toBeNull();
  });

  it('offers "Simular firma" (E11) only for a PENDIENTE signer in sandbox with puedeEditar', async () => {
    obtener.mockResolvedValueOnce({ pagare: pagare({ esSandbox: true }), disponible: true });
    await montar(true);
    // f-1 (INQUILINO) is PENDIENTE → simulate offered; f-2 (CODEUDOR) is FIRMADO → not offered.
    expect(container.querySelectorAll('[data-testid="simular-firma-pagare"]').length).toBe(1);
  });

  it('never offers "Simular firma" outside sandbox', async () => {
    obtener.mockResolvedValueOnce({ pagare: pagare({ esSandbox: false }), disponible: true });
    await montar(true);
    expect(container.querySelector('[data-testid="simular-firma-pagare"]')).toBeNull();
  });

  it('calls pagareApi.simular(pagareId, firmanteId, "FIRMAR") on click', async () => {
    obtener.mockResolvedValueOnce({ pagare: pagare({ esSandbox: true }), disponible: true });
    simular.mockResolvedValueOnce(pagare({ esSandbox: true }));
    obtener.mockResolvedValueOnce({ pagare: pagare({ esSandbox: true }), disponible: true });
    await montar(true);

    await act(async () => {
      (container.querySelector('[data-testid="simular-firma-pagare"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(simular).toHaveBeenCalledWith('p-1', 'f-1', 'FIRMAR');
  });
});

/**
 * 🔴 02-10-2026 · Emitir el pagaré: el motivo con la regla de oro. Antes la
 * descripción era `mensajeDelFallo(err, '')`: un 5xx salía sin decir de quién
 * era ni con qué referencia escribir.
 */
describe('<PagareSection> — el fallo al emitir', () => {
  async function emitirConError(error: unknown) {
    const { toast } = await import('sonner');
    vi.spyOn(toast, 'error');
    obtener.mockResolvedValueOnce({ disponible: true, pagare: null });
    emitir.mockRejectedValueOnce(error);
    await montar(true);
    const boton = [...container.querySelectorAll('button')].find((b) => /emitir/i.test(b.textContent ?? ''));
    if (!boton) throw new Error('No está el botón de emitir');
    await act(async () => {
      boton.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    return vi.mocked(toast.error).mock.calls[0] as [string, { description: string }];
  }

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    const [titulo, opciones] = await emitirConError(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: '3a4b5c6d' }),
    );
    expect(titulo).toBe('No se pudo emitir el pagaré.');
    expect(opciones.description).toContain('No pudimos emitir el pagaré: algo falló de nuestro lado.');
    expect(opciones.description).toContain('3a4b5c6d');
  });

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    const [, opciones] = await emitirConError(new ApiError(0, 'Failed to fetch'));
    expect(opciones.description).toContain('conexión');
  });
});
