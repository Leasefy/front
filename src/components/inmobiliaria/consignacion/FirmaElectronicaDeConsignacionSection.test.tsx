/**
 * T-0109 contract.md §3.1.C — panel de agencia de la firma electrónica de la
 * consignación. Coverage:
 *   (1) hides the whole section on a 404 from C2 (back sin WU-3, §3.2)
 *   (2) shows the "start" form when there is no process
 *   (3) shows signers + progress when PENDIENTE
 *   (4) hides the resend/cancel actions without `puedeEditar`
 *   (5) shows the representative's SignatureForm when `puedeFirmarElUsuarioActual`
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { ProcesoDeFirmaResponse } from '@/lib/api/consignacion-firma.types';

void React;

const obtener = vi.fn();
const iniciar = vi.fn();
const cancelar = vi.fn();
const reenviar = vi.fn();
const documento = vi.fn();

vi.mock('@/lib/api/consignacion-firma.service', () => ({
  firmaDeConsignacionApi: {
    obtener: (...args: unknown[]) => obtener(...args),
    iniciar: (...args: unknown[]) => iniciar(...args),
    cancelar: (...args: unknown[]) => cancelar(...args),
    reenviar: (...args: unknown[]) => reenviar(...args),
    documento: (...args: unknown[]) => documento(...args),
    otpSend: vi.fn(),
    otpVerify: vi.fn(),
    firmar: vi.fn(),
  },
}));

// SignatureForm trae Dialog/Radix/canvas — no vale la pena montarlo entero acá.
vi.mock('@/components/contract/SignatureForm', () => ({
  SignatureForm: ({ rolLabel }: { rolLabel?: string }) => (
    <div data-testid="signature-form">{rolLabel}</div>
  ),
}));

import { FirmaElectronicaDeConsignacionSection } from './FirmaElectronicaDeConsignacionSection';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  obtener.mockReset();
  iniciar.mockReset();
  cancelar.mockReset();
  reenviar.mockReset();
  documento.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function montar(consignacionId = 'con-1', puedeEditar = true) {
  await act(async () => {
    root.render(<FirmaElectronicaDeConsignacionSection consignacionId={consignacionId} puedeEditar={puedeEditar} />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function procesoPendiente(overrides: Partial<ProcesoDeFirmaResponse> = {}): ProcesoDeFirmaResponse {
  return {
    id: 'p-1',
    consignacionId: 'con-1',
    estado: 'PENDIENTE',
    documentoSha256: 'abc123',
    createdAt: '2026-01-01T00:00:00Z',
    firmadoAt: null,
    canceladoAt: null,
    motivoDeCancelacion: null,
    iniciadoPor: { id: 'u-1', nombre: 'Ana' },
    firmantes: [
      { id: 'f-1', tipo: 'PROPIETARIO', propietarioId: 'prop-1', userId: null, nombre: 'Beto', email: 'b@x.com', telefono: null, firmado: false, firmadoAt: null, codigoVerificado: null, otpChannels: null, invitacion: 'ENVIADA', enlaceVenceEn: '2026-02-01T00:00:00Z' },
      { id: 'f-2', tipo: 'REPRESENTANTE_DE_LA_AGENCIA', propietarioId: null, userId: 'u-2', nombre: 'Carla', email: null, telefono: null, firmado: false, firmadoAt: null, codigoVerificado: null, otpChannels: null, invitacion: null, enlaceVenceEn: null },
    ],
    documentoFirmado: null,
    puedeFirmarElUsuarioActual: false,
    ...overrides,
  };
}

describe('<FirmaElectronicaDeConsignacionSection>', () => {
  it('renders nothing on a 404 (back sin WU-3)', async () => {
    obtener.mockRejectedValueOnce(new ApiError(404, 'not found'));
    await montar();
    expect(container.querySelector('[data-testid="firma-electronica-consignacion"]')).toBeNull();
  });

  it('shows the "start" form when there is no process yet', async () => {
    obtener.mockResolvedValueOnce({ proceso: null });
    await montar();
    expect(container.querySelector('[data-testid="iniciar-firma-electronica"]')).not.toBeNull();
  });

  it('shows signers and progress when PENDIENTE', async () => {
    obtener.mockResolvedValueOnce({ proceso: procesoPendiente() });
    await montar();
    expect(container.querySelector('[data-testid="progreso-propietarios"]')?.textContent).toContain('0 de 1');
    const filas = container.querySelectorAll('[data-testid="firmante-item"]');
    expect(filas.length).toBe(2);
  });

  it('hides resend/cancel actions without puedeEditar', async () => {
    obtener.mockResolvedValueOnce({ proceso: procesoPendiente() });
    await montar('con-1', false);
    expect(container.querySelector('[data-testid="cancelar-firma-electronica"]')).toBeNull();
    expect(container.querySelector('[data-testid="reenviar-invitacion"]')).toBeNull();
  });

  it('shows the resend action for an unsigned propietario when puedeEditar', async () => {
    obtener.mockResolvedValueOnce({ proceso: procesoPendiente() });
    await montar('con-1', true);
    expect(container.querySelector('[data-testid="reenviar-invitacion"]')).not.toBeNull();
  });

  it('shows the representative SignatureForm when puedeFirmarElUsuarioActual', async () => {
    obtener.mockResolvedValueOnce({ proceso: procesoPendiente({ puedeFirmarElUsuarioActual: true }) });
    await montar();
    const form = container.querySelector('[data-testid="signature-form"]');
    expect(form).not.toBeNull();
    expect(form?.textContent).toBe('Representante de la agencia');
  });

  it('does not show the SignatureForm when the current user cannot sign', async () => {
    obtener.mockResolvedValueOnce({ proceso: procesoPendiente({ puedeFirmarElUsuarioActual: false }) });
    await montar();
    expect(container.querySelector('[data-testid="signature-form"]')).toBeNull();
  });

  it('a non-404 failure shows FalloDeCarga, not a silent hide', async () => {
    obtener.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await montar();
    expect(container.querySelector('[data-testid="firma-electronica-consignacion"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull();
  });
});
