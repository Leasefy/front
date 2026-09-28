/**
 * T-0109 contract.md §3.1.D — página pública del copropietario, sin sesión.
 * Coverage:
 *   (1) 404 → "Enlace no válido" (ENLACE_DE_FIRMA_INVALIDO)
 *   (2) 410 → "Este enlace venció" (ENLACE_DE_FIRMA_VENCIDO)
 *   (3) loaded + PENDIENTE + unsigned → shows the SignatureForm
 *   (4) already signed (firmante.firmado) → shows the signed state, no form
 *   (5) a real failure (500) shows FalloDeCarga, not the "enlace" copy
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { FirmaPublicaResponse } from '@/lib/api/consignacion-firma.types';

void React;

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok-abc' }),
}));

const obtener = vi.fn();
vi.mock('@/lib/api/consignacion-firma.service', () => ({
  firmaPublicaDeConsignacionApi: {
    obtener: (...args: unknown[]) => obtener(...args),
    otpSend: vi.fn(),
    otpVerify: vi.fn(),
    firmar: vi.fn(),
  },
}));

vi.mock('@/components/contract/SignatureForm', () => ({
  SignatureForm: () => <div data-testid="signature-form" />,
}));

import FirmarConsignacionPublicoPage from './page';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  obtener.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function montar() {
  await act(async () => {
    root.render(<FirmarConsignacionPublicoPage />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function respuesta(overrides: Partial<FirmaPublicaResponse> = {}): FirmaPublicaResponse {
  return {
    firmante: { nombre: 'Ana', firmado: false, firmadoAt: null },
    proceso: { estado: 'PENDIENTE', createdAt: '2026-01-01T00:00:00Z' },
    consignacion: { propertyTitle: 'Apto Chapinero', propertyAddress: 'Calle 53', propertyCity: 'Bogotá' },
    agencia: { nombre: 'Leasefy' },
    documento: { url: 'https://files.test/doc.pdf', expiresAt: '2026-01-01T01:00:00Z' },
    canales: { correo: 'a***@x.com', whatsapp: null },
    ...overrides,
  };
}

describe('<FirmarConsignacionPublicoPage>', () => {
  it('shows "Enlace no válido" on a 404', async () => {
    obtener.mockRejectedValueOnce(new ApiError(404, 'Enlace no válido', 'ENLACE_DE_FIRMA_INVALIDO'));
    await montar();
    expect(container.querySelector('[data-testid="enlace-invalido"]')).not.toBeNull();
  });

  it('shows "Este enlace venció" on a 410', async () => {
    obtener.mockRejectedValueOnce(new ApiError(410, 'Enlace vencido', 'ENLACE_DE_FIRMA_VENCIDO'));
    await montar();
    expect(container.querySelector('[data-testid="enlace-vencido"]')).not.toBeNull();
  });

  it('shows the SignatureForm when PENDIENTE and unsigned', async () => {
    obtener.mockResolvedValueOnce(respuesta());
    await montar();
    expect(container.querySelector('[data-testid="signature-form"]')).not.toBeNull();
    expect(container.textContent).toContain('Apto Chapinero');
  });

  it('shows the signed state instead of the form once firmante.firmado', async () => {
    obtener.mockResolvedValueOnce(respuesta({ firmante: { nombre: 'Ana', firmado: true, firmadoAt: '2026-01-02T00:00:00Z' } }));
    await montar();
    expect(container.querySelector('[data-testid="ya-firmaste"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="signature-form"]')).toBeNull();
  });

  it('shows the cancelled state for a CANCELADO process', async () => {
    obtener.mockResolvedValueOnce(respuesta({ proceso: { estado: 'CANCELADO', createdAt: '2026-01-01T00:00:00Z' } }));
    await montar();
    expect(container.querySelector('[data-testid="proceso-cancelado"]')).not.toBeNull();
  });

  it('a 500 shows FalloDeCarga, not the "enlace" copy', async () => {
    obtener.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await montar();
    expect(container.querySelector('[data-testid="enlace-invalido"]')).toBeNull();
    expect(container.querySelector('[data-testid="enlace-vencido"]')).toBeNull();
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull();
  });
});
