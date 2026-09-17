import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const inventarioParaFirmar = vi.fn();
const firmarInventario = vi.fn();
vi.mock('@/lib/api/inventario-del-inmueble.service', () => ({
  inventarioDelInmuebleApi: {
    inventarioParaFirmar: (id: string) => inventarioParaFirmar(id),
    firmarInventario: (id: string, dto: unknown) => firmarInventario(id, dto),
  },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/inmobiliaria/ActaEntregaView', () => ({
  ActaEntregaView: (p: { inventoryItems: unknown[] }) => <div data-testid="acta" data-items={p.inventoryItems.length} />,
}));
// El MISMO formulario de la firma del contrato: el doble dispara la firma con
// el trazo y el token que devolvería el OTP, y muestra los textos que recibe.
vi.mock('@/components/contract/SignatureForm', () => ({
  SignatureForm: (p: {
    contractId: string;
    requireOTP?: boolean;
    textos?: { boton?: string };
    onSign: (x: { otpVerified: boolean; signatureData: string; otpVerificationToken?: string }) => void;
  }) => (
    <button
      data-testid="firmar"
      data-otp={String(p.requireOTP)}
      data-contrato={p.contractId}
      onClick={() => p.onSign({ otpVerified: true, signatureData: 'data:image/png;base64,AAA', otpVerificationToken: 'tok' })}
    >
      {p.textos?.boton}
    </button>
  ),
}));

import { FirmaDelInventarioDelInquilino } from './FirmaDelInventarioDelInquilino';

let host: HTMLDivElement;
let root: Root;
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`);

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<FirmaDelInventarioDelInquilino contractId="c1" />);
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

const copia = { version: 2, items: [{ id: 'a' }], completadoEn: '2026-09-01T15:00:00Z' };

describe('FirmaDelInventarioDelInquilino', () => {
  it('firma con el formulario del contrato (con OTP) y el texto del inventario', async () => {
    inventarioParaFirmar.mockResolvedValue({ disponible: true, copia, firma: { estado: 'PENDIENTE', firmadoPor: null, correo: null, firmadoEn: null, integra: null } });
    firmarInventario.mockResolvedValue({
      disponible: true, copia,
      firma: { estado: 'FIRMADO', firmadoPor: 'Ana Ríos', correo: 'ana@x.co', firmadoEn: '2026-09-05T15:00:00Z', integra: true },
    });
    await montar();
    const boton = q('firmar') as HTMLButtonElement;
    expect(boton.textContent).toBe('Firmar inventario');
    expect(boton.getAttribute('data-otp')).toBe('true');
    expect(boton.getAttribute('data-contrato')).toBe('c1');
    await act(async () => {
      boton.click();
    });
    expect(firmarInventario).toHaveBeenCalledWith('c1', {
      acceptedTerms: true,
      consentText: 'Recibo el inmueble con este inventario y confirmo que describe su estado y lo que contiene.',
      signatureData: 'data:image/png;base64,AAA',
      otpVerificationToken: 'tok',
    });
    expect(q('inventario-firmado')?.textContent).toBe('Firmado por Ana Ríos el 5 de septiembre de 2026.');
    expect(q('firmar')).toBeNull();
  });

  it('no pinta nada si no hay copia o si el back no tiene la migración', async () => {
    inventarioParaFirmar.mockResolvedValue({ disponible: true, copia: null, firma: null });
    await montar();
    expect(q('firma-del-inventario-del-inquilino')).toBeNull();
    act(() => root.unmount());
    host.remove();
    inventarioParaFirmar.mockResolvedValue({ disponible: false, copia: null, firma: null });
    await montar();
    expect(q('firma-del-inventario-del-inquilino')).toBeNull();
  });
});
