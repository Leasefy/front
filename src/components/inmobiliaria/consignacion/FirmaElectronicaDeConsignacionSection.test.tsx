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
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/components/ui/toast', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

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
  toastError.mockReset();
  toastSuccess.mockReset();
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

/**
 * Sistema de errores, tanda 2 (02-10-2026): iniciar la firma electrónica.
 * El PDF equivocado era un toast que se iba; ahora es el error del campo del
 * PDF. Un 400 en `mensaje` va debajo del mensaje; lo demás, al toast con la
 * regla de oro.
 */
describe('<FirmaElectronicaDeConsignacionSection> — los errores al iniciar', () => {
  function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
    return new ApiError(status, cuerpo.message as string | string[], cuerpo.code as string, cuerpo);
  }

  async function elegir(archivo: File) {
    const input = container.querySelector<HTMLInputElement>('[data-testid="iniciar-firma-electronica-input"]')!;
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async function iniciarFirma() {
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="iniciar-firma-electronica-boton"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
  }

  const PDF = () => new File(['%PDF'], 'mandato.pdf', { type: 'application/pdf' });

  it('🔴 un archivo que no es PDF es el error del campo del PDF, no un toast', async () => {
    obtener.mockResolvedValueOnce({ proceso: null });
    await montar();
    await elegir(new File(['x'], 'foto.png', { type: 'image/png' }));

    expect(container.querySelector('#firma-electronica-pdf-error')?.textContent).toBe(
      'El documento debe ser un PDF de hasta 10 MB.',
    );
    const boton = container.querySelector('[data-testid="elegir-pdf"]')!;
    expect(boton.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(boton);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('🔴 un 400 en `mensaje` va debajo del mensaje, sin toast', async () => {
    obtener.mockResolvedValueOnce({ proceso: null });
    iniciar.mockRejectedValueOnce(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: ['El mensaje puede tener hasta 500 caracteres.'],
        campos: [{ campo: 'mensaje', regla: 'longitud_maxima', mensaje: 'El mensaje puede tener hasta 500 caracteres.' }],
      }),
    );
    await montar();
    await elegir(PDF());
    await iniciarFirma();

    expect(container.querySelector('#firma-electronica-mensaje-error')?.textContent).toBe(
      'El mensaje puede tener hasta 500 caracteres.',
    );
    expect(document.activeElement).toBe(container.querySelector('[data-testid="firma-electronica-mensaje"]'));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('un 5xx dice «de nuestro lado» con la referencia; sin respuesta, la conexión', async () => {
    obtener.mockResolvedValueOnce({ proceso: null });
    iniciar.mockRejectedValueOnce(
      errorDelBack(500, { code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'dd00ee11' }),
    );
    await montar();
    await elegir(PDF());
    await iniciarFirma();
    const primera = toastError.mock.calls[0][1] as { description: string };
    expect(primera.description).toMatch(/de nuestro lado/);
    expect(primera.description).toContain('dd00ee11');

    iniciar.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await iniciarFirma();
    expect((toastError.mock.calls[1][1] as { description: string }).description).toMatch(/conexión/);
  });
});
